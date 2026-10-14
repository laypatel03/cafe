"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { billFromOrders } from "@/lib/billing";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { customerTotals, type KeptLine, lineKey, priceEditedLines } from "@/lib/order-edit";
import { PAYMENT_SHORT } from "@/lib/payments";
import { billTotals, type PricedLine } from "@/lib/pricing";
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

const itemRows = (lines: PricedLine[]) =>
  lines.map((l) => ({
    menuItemId: l.menuItemId,
    itemName: l.itemName,
    unitPricePaise: l.unitPricePaise,
    quantity: l.quantity,
    addOns: l.addOns,
    lineTotalPaise: l.lineTotalPaise,
  }));

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
  const { when, takeaway, name, phone, note, items, method } = parsed.data;

  const priced = priceEditedLines(items, await loadMenuPrices(items.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
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
        items: { create: itemRows(priced.lines) },
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
  const { orderId, when, takeaway, name, phone, note, items, method } = parsed.data;

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
  const priced = priceEditedLines(items, await loadMenuPrices(items.map((i) => i.itemId)), kept);
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  const taxBps = bill ? bill.taxBasisPoints : (await getCafeDetails()).taxBasisPoints;
  const totals = billTotals(priced.subtotalPaise, taxBps);

  // a short note of what changed, for the order's history
  const changes: string[] = [];
  if (totals.totalPaise !== order.totalPaise)
    changes.push(
      `total ${formatINR(toRupees(order.totalPaise))} → ${formatINR(toRupees(totals.totalPaise))}`,
    );
  else if (
    JSON.stringify(itemRows(priced.lines).map((l) => [l.menuItemId, l.quantity])) !==
    JSON.stringify(order.items.map((l) => [l.menuItemId, l.quantity]))
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
        items: { create: itemRows(priced.lines) },
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
