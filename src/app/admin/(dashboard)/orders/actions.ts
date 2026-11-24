"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { billFromOrders } from "@/lib/billing";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { rebalanceBill } from "@/lib/data/customer-balance";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { type CustomLinesSchema, customRows, type OrderItemRow, orderRows } from "@/lib/custom-lines";
import { customerTotals, type EditedLine, type KeptLine, lineKey, priceEditedLines } from "@/lib/order-edit";
import { readParts, recoverMeals } from "@/lib/meal-pass";
import { PAY_CHOICES, type PayChoice, PAYMENT_SHORT } from "@/lib/payments";
import { billTotals } from "@/lib/pricing";
import { publish } from "@/lib/realtime";
import {
  DeleteOrderSchema,
  type EditOrderInput,
  EditOrderSchema,
  type PastOrderInput,
  PastOrderSchema,
} from "@/lib/validators/order-edit";

type Fail = { ok: false; error: string; problems?: string[] };

/** Owner only, and only while Settings → Editing → "Add and edit orders" is on. */
async function editor(): Promise<CurrentUser | Fail> {
  let me: CurrentUser;
  try {
    me = await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
  if (!(await getEditSwitches()).orders)
    return { ok: false, error: "Order editing is off. Turn it on in Settings → Editing." };
  return me;
}

/** Dishes priced as the owner typed (or kept/menu prices), then the other items. */
async function priceItems(
  items: EditedLine[],
  others: z.output<typeof CustomLinesSchema>,
  kept?: Map<string, KeptLine>,
): Promise<{ ok: true; rows: OrderItemRow[]; subtotalPaise: number } | Fail> {
  const priced = items.length
    ? priceEditedLines(
        items,
        await loadMenuPrices(
          items.map((i) => i.itemId),
          { offers: false },
        ),
        kept,
      )
    : { ok: true as const, lines: [], subtotalPaise: 0 };
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  return orderRows(priced.lines, customRows(others));
}

/**
 * The meal pass lines of an order being edited, worked out again from its new dish prices: each
 * pass meal covers the dish's new price up to its meal type's limit.
 */
async function passRows(
  orderId: string,
  lines: { itemName: string; mealPassUseId: string | null }[],
  dishes: OrderItemRow[],
): Promise<
  | {
      ok: true;
      rows: (OrderItemRow & { mealPassUseId: string })[];
      covers: { id: string; coverPaise: number }[];
    }
  | Fail
> {
  if (lines.length === 0) return { ok: true, rows: [], covers: [] };
  const uses = await db.mealPassUse.findMany({
    where: { orderId },
    select: { id: true, menuItemId: true, part: true, coveredPaise: true, pass: { select: { parts: true } } },
  });
  const res = recoverMeals(
    uses.map((u) => ({
      id: u.id,
      menuItemId: u.menuItemId,
      coveredPaise: u.coveredPaise,
      capPaise: readParts(u.pass.parts)[u.part]?.capPaise ?? u.coveredPaise,
    })),
    dishes.flatMap((d) =>
      d.custom || !d.menuItemId
        ? []
        : [
            {
              menuItemId: d.menuItemId,
              quantity: d.quantity,
              dishPaise: d.unitPricePaise - d.addOns.reduce((s, a) => s + a.pricePaise, 0),
            },
          ],
    ),
  );
  if (!res.ok) {
    const dish = lines.find(
      (l) => l.mealPassUseId && uses.find((u) => u.id === l.mealPassUseId)?.menuItemId === res.menuItemId,
    );
    const name = dish?.itemName.split(": ").slice(1).join(": ") || "a dish";
    return {
      ok: false,
      error: `${res.meals} × ${name} ${res.meals === 1 ? "was" : "were"} paid by a meal pass – keep at least ${res.meals} on the order.`,
    };
  }
  const cover = new Map(res.covers.map((c) => [c.id, c.coverPaise]));
  return {
    ok: true,
    covers: res.covers,
    rows: lines.flatMap((l) => {
      const paise = l.mealPassUseId ? cover.get(l.mealPassUseId) : undefined;
      // a pass meal that now covers nothing (a ₹0 dish) keeps its line at ₹0
      return paise === undefined
        ? []
        : [
            {
              menuItemId: null,
              itemName: l.itemName,
              addOns: [],
              unitPricePaise: -paise,
              quantity: 1,
              lineTotalPaise: -paise,
              custom: true,
              mealPassUseId: l.mealPassUseId!,
            },
          ];
    }),
  };
}

/** The guest's record by phone (made if new), or none without a phone. */
async function customerFor(tx: Prisma.TransactionClient, name: string, phone: string, at: Date) {
  if (!phone) return null;
  const found = await tx.customer.findUnique({ where: { phone }, select: { id: true } });
  if (found) return found.id;
  const made = await tx.customer.create({
    data: { name, phone, firstVisitAt: at, lastVisitAt: at },
    select: { id: true },
  });
  return made.id;
}

/** Visits, spend and first/last visit worked out again from paid bills, after an order moved or changed. */
async function refreshCustomers(tx: Prisma.TransactionClient, ids: (string | null | undefined)[]) {
  for (const id of new Set(ids.filter((i): i is string => !!i))) {
    const customer = await tx.customer.findUnique({ where: { id }, select: { firstVisitAt: true } });
    if (!customer) continue;
    const [bills, firstOrder] = await Promise.all([
      tx.bill.findMany({
        where: {
          paidAt: { not: null },
          voidedAt: null,
          orders: { some: { customerId: id, deletedAt: null } },
        },
        select: {
          totalPaise: true,
          paidAt: true,
          customerPhone: true,
          orders: { where: { deletedAt: null }, select: { customerId: true, customerPhone: true } },
        },
      }),
      tx.order.findFirst({
        where: { customerId: id },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);
    const t = customerTotals(
      id,
      bills.map((b) => ({ ...b, paidAt: b.paidAt! })),
    );
    await tx.customer.update({
      where: { id },
      data: {
        orderCount: t.orderCount,
        totalSpendPaise: t.totalSpendPaise,
        ...(t.lastVisitAt && { lastVisitAt: t.lastVisitAt }),
        ...(firstOrder &&
          firstOrder.createdAt < customer.firstVisitAt && { firstVisitAt: firstOrder.createdAt }),
      },
    });
  }
}

function refresh() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/money");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers", "layout");
}

/* ------------------------------- add order ------------------------------- */

/**
 * An order that already happened – say the guest paid and nobody put it in. It goes in as served
 * and paid on the date and time given, with its bill, so the money book and reports count it.
 */
export async function addPastOrder(input: PastOrderInput): Promise<{ ok: true; number: number } | Fail> {
  const me = await editor();
  if ("ok" in me) return me;
  const parsed = PastOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { when, takeaway, name, phone, note, items, others, method } = parsed.data;

  const priced = await priceItems(items, others);
  if (!priced.ok) return priced;
  const totals = billTotals(priced.subtotalPaise, (await getCafeDetails()).taxBasisPoints);
  const type = takeaway ? "PARCEL" : "DINE_IN";

  const order = await db.$transaction(async (tx) => {
    const customerId = await customerFor(tx, name, phone, when);
    const bill = await tx.bill.create({
      data: {
        type,
        customerName: name,
        customerPhone: phone || null,
        subtotalPaise: totals.subtotalPaise,
        taxBasisPoints: totals.taxBasisPoints,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        paymentMethod: method,
        paidAt: when,
        createdAt: when,
        createdById: me.id,
      },
      select: { id: true, number: true },
    });
    const created = await tx.order.create({
      data: {
        type,
        status: "PAID",
        customerId,
        customerName: name,
        customerPhone: phone || null,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        billId: bill.id,
        createdById: me.id,
        createdAt: when,
        items: { create: priced.rows },
        statusLogs: {
          create: {
            toStatus: "PAID",
            changedById: me.id,
            note: `Added in Order history by ${me.name} · bill #${bill.number} paid by ${PAYMENT_SHORT[method]}`,
          },
        },
      },
      select: { id: true, number: true },
    });
    await refreshCustomers(tx, [customerId]);
    return created;
  });

  await publish({ type: "order", orderId: order.id, number: order.number, status: "PAID" });
  refresh();
  return { ok: true, number: order.number };
}

/* ------------------------------- edit order ------------------------------- */

/**
 * Fix an order: items, date and time, dine-in or takeaway, guest, note, and how its bill was paid.
 * Lines already on the order keep the price the guest paid; new ones take today's menu price.
 * The bill's totals and the guests' visit and spend figures follow.
 */
export async function editOrder(input: EditOrderInput): Promise<{ ok: true } | Fail> {
  const me = await editor();
  if ("ok" in me) return me;
  const parsed = EditOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { orderId, when, takeaway, name, phone, note, items, others, method } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      bill: {
        include: {
          // deleted orders stay linked to their bill but no longer count on it
          orders: {
            where: { deletedAt: null },
            select: { id: true, subtotalPaise: true, customerPhone: true, customerId: true },
          },
        },
      },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.deletedAt)
    return { ok: false, error: `Order #${order.number} was deleted and can't be changed.` };
  const passLines = order.items.filter((i) => i.mealPassUseId);
  // the pass belongs to this guest; moving the order to someone else would move their meals too
  if (passLines.length > 0 && (phone || null) !== order.customerPhone)
    return {
      ok: false,
      error: `A meal pass is used on order #${order.number}, so the guest's phone can't change.`,
    };
  if (order.items.some((i) => i.balanceEntryId))
    return {
      ok: false,
      error: `A customer balance is settled on order #${order.number}, so it can't be edited here.`,
    };
  const bill = order.bill;
  const type = takeaway ? "PARCEL" : "DINE_IN";
  const shared = !!bill && bill.orders.length > 1;
  if (shared && type !== order.type)
    return {
      ok: false,
      error: `Bill #${bill.number} has ${bill.orders.length} orders on it, so this one can't switch between dine-in and takeaway.`,
    };

  const kept = new Map<string, KeptLine>();
  for (const i of order.items) {
    if (!i.menuItemId) continue;
    const addOns = (i.addOns ?? []) as KeptLine["addOns"];
    kept.set(
      lineKey(
        i.menuItemId,
        addOns.map((a) => a.id),
      ),
      { itemName: i.itemName, unitPricePaise: i.unitPricePaise, addOns },
    );
  }
  const dishesPriced = await priceItems(items, others, kept);
  if (!dishesPriced.ok) return dishesPriced;
  const withPass = await passRows(order.id, passLines, dishesPriced.rows);
  if (!withPass.ok) return withPass;
  const priced = {
    rows: [...dishesPriced.rows, ...withPass.rows],
    subtotalPaise: dishesPriced.subtotalPaise + withPass.rows.reduce((s, r) => s + r.lineTotalPaise, 0),
  };
  if (priced.subtotalPaise < 0)
    return { ok: false, error: "The discount is bigger than the order – the total can't go below ₹0." };
  const taxBps = bill ? bill.taxBasisPoints : (await getCafeDetails()).taxBasisPoints;
  const totals = billTotals(priced.subtotalPaise, taxBps);

  // a short note of what changed, for the order's history
  const changes: string[] = [];
  if (totals.totalPaise !== order.totalPaise)
    changes.push(
      `total ${formatINR(toRupees(order.totalPaise))} → ${formatINR(toRupees(totals.totalPaise))}`,
    );
  else if (
    JSON.stringify(priced.rows.map((l) => [l.menuItemId, l.itemName, l.unitPricePaise, l.quantity])) !==
    JSON.stringify(order.items.map((l) => [l.menuItemId, l.itemName, l.unitPricePaise, l.quantity]))
  )
    changes.push("items");
  if (when.getTime() !== order.createdAt.getTime()) changes.push("date/time");
  if (type !== order.type) changes.push(takeaway ? "now takeaway" : "now dine-in");
  if (name !== order.customerName || (phone || null) !== order.customerPhone) changes.push("guest");
  if ((note || null) !== order.note) changes.push("note");
  const paid = !!bill?.paidAt && !bill.voidedAt;
  if (paid && method && method !== bill.paymentMethod) changes.push(`paid by ${PAYMENT_SHORT[method]}`);
  if (changes.length === 0) return { ok: true };

  await db.$transaction(async (tx) => {
    const customerId = await customerFor(tx, name, phone, when);
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    for (const c of withPass.covers)
      await tx.mealPassUse.update({ where: { id: c.id }, data: { coveredPaise: c.coverPaise } });
    await tx.order.update({
      where: { id: order.id },
      data: {
        type,
        createdAt: when,
        customerId,
        customerName: name,
        customerPhone: phone || null,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        items: { create: priced.rows },
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: order.status,
            changedById: me.id,
            note: `Edited by ${me.name}: ${changes.join(", ")}`,
          },
        },
      },
    });

    if (bill) {
      const subtotals = bill.orders.map((o) =>
        o.id === order.id ? { subtotalPaise: totals.subtotalPaise } : o,
      );
      const billSums = billFromOrders(subtotals, bill.taxBasisPoints);
      await rebalanceBill(tx, bill, billSums.totalPaise);
      // the bill is made out to this order's guest if it's the only order, or the guest it was for
      const isBillGuest = !shared || order.customerPhone === bill.customerPhone;
      await tx.bill.update({
        where: { id: bill.id },
        data: {
          subtotalPaise: billSums.subtotalPaise,
          taxPaise: billSums.taxPaise,
          totalPaise: billSums.totalPaise,
          ...(!shared && { type, createdAt: when }),
          ...(isBillGuest && { customerName: name, customerPhone: phone || null }),
          ...(paid && !shared && { paidAt: when }),
          ...(paid && method && { paymentMethod: method }),
        },
      });
    }
    // everyone on the bill: its total may have changed
    await refreshCustomers(tx, [
      order.customerId,
      customerId,
      ...(bill?.orders.map((o) => o.customerId) ?? []),
    ]);
  });

  await publish({ type: "order", orderId: order.id, number: order.number, status: order.status });
  refresh();
  return { ok: true };
}

/* ------------------------------ delete order ------------------------------ */

/**
 * Delete an order entered by mistake. It stays in Order history (shown in red, with the reason)
 * but leaves the money book, reports and the guest's visits: its bill is voided, or – when the
 * bill has other orders – the bill's total drops by this order.
 */
export async function deleteOrder(orderId: string, reason: string): Promise<{ ok: true } | Fail> {
  const me = await editor();
  if ("ok" in me) return me;
  const parsed = DeleteOrderSchema.safeParse({ orderId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      bill: {
        include: {
          orders: {
            select: { id: true, number: true, subtotalPaise: true, customerId: true, deletedAt: true },
          },
        },
      },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.deletedAt) return { ok: false, error: `Order #${order.number} is already deleted.` };
  const bill = order.bill;
  const why = parsed.data.reason;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        deletedAt: new Date(),
        status: "CANCELLED",
        cancelReason: `Deleted: ${why}`,
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: "CANCELLED",
            changedById: me.id,
            note: `Deleted by ${me.name}: ${why}`,
          },
        },
      },
    });
    if (bill && !bill.voidedAt) {
      const left = bill.orders.filter((o) => o.id !== order.id && !o.deletedAt);
      if (left.length === 0) {
        // the bill stays (numbers are continuous) but no longer counts anywhere
        await tx.bill.update({
          where: { id: bill.id },
          data: {
            voidedAt: new Date(),
            voidReason: `Order #${order.number} deleted: ${why}`,
            voidedById: me.id,
            voidedOrderNumbers: bill.orders.map((o) => o.number),
          },
        });
      } else {
        const sums = billFromOrders(left, bill.taxBasisPoints);
        await rebalanceBill(tx, bill, sums.totalPaise);
        await tx.bill.update({
          where: { id: bill.id },
          data: { subtotalPaise: sums.subtotalPaise, taxPaise: sums.taxPaise, totalPaise: sums.totalPaise },
        });
      }
    }
    await refreshCustomers(tx, [order.customerId, ...(bill?.orders.map((o) => o.customerId) ?? [])]);
  });

  await publish({ type: "order", orderId: order.id, number: order.number, status: "CANCELLED" });
  refresh();
  return { ok: true };
}

/* ----------------------------- change payment ----------------------------- */

const ChangePaymentSchema = z.object({
  billId: z.string().min(1).max(40),
  to: z.enum([...PAY_CHOICES, "PENDING"]),
});

/**
 * Fix how a paid bill was paid, or set it back to "payment pending" (the guest didn't actually pay):
 * it goes to the Pay later list and leaves the money book until the payment is recorded again.
 */
export async function changeBillPayment(
  billId: string,
  to: PayChoice | "PENDING",
): Promise<{ ok: true } | Fail> {
  const me = await editor();
  if ("ok" in me) return me;
  const parsed = ChangePaymentSchema.safeParse({ billId, to });
  if (!parsed.success) return { ok: false, error: "Choose how the bill was paid, or payment pending." };

  const bill = await db.bill.findUnique({
    where: { id: parsed.data.billId },
    include: { orders: { where: { deletedAt: null } } },
  });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is void.` };
  if (!bill.paidAt) return { ok: false, error: `Bill #${bill.number} isn't paid yet – record the payment.` };
  const target = parsed.data.to;
  if (target === bill.paymentMethod) return { ok: true };

  const unpay = target === "PENDING";
  // a paid order goes back to served; a takeaway still waiting at the counter counts as picked up
  const statusFor = (s: OrderStatus): OrderStatus =>
    unpay && (s === "PAID" || s === "READY") ? "SERVED" : s;
  const note = unpay
    ? `Bill #${bill.number} set back to payment pending by ${me.name}`
    : `Bill #${bill.number} payment changed to ${PAYMENT_SHORT[target]} by ${me.name}`;

  await db.$transaction(async (tx) => {
    await tx.bill.update({
      where: { id: bill.id },
      data: unpay
        ? { paidAt: null, paymentMethod: null, payLaterAt: bill.payLaterAt ?? new Date() }
        : { paymentMethod: target },
    });
    for (const o of bill.orders) {
      const status = statusFor(o.status);
      await tx.order.update({
        where: { id: o.id },
        data: {
          status,
          statusLogs: { create: { fromStatus: o.status, toStatus: status, changedById: me.id, note } },
        },
      });
    }
    if (unpay)
      await refreshCustomers(
        tx,
        bill.orders.map((o) => o.customerId),
      );
  });

  for (const o of bill.orders)
    await publish({ type: "order", orderId: o.id, number: o.number, status: statusFor(o.status) });
  refresh();
  return { ok: true };
}
