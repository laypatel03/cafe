"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { db } from "@/lib/db";
import {
  ACTION_LABEL,
  canCancel,
  canEditItems,
  nextStatus,
  type OrderAction,
  statusOnPayment,
  stepToUndo,
  UNDO_NOTE,
} from "@/lib/order-flow";
import { billFromOrders } from "@/lib/billing";
import { allocatePayment, paymentDifference } from "@/lib/customer-balance";
import { debtsOf } from "@/lib/data/customer-balance";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import {
  type CustomLineInput,
  CustomLinesSchema,
  customRows,
  type OrderItemRow,
  orderRows,
} from "@/lib/custom-lines";
import { billTotals, priceLines } from "@/lib/pricing";
import { publish } from "@/lib/realtime";
import { PAY_CHOICES, type PayChoice, PAYMENT_SHORT } from "@/lib/payments";
import { autoSendPayment } from "@/lib/whatsapp/send";
import { type CounterOrderInput, CounterOrderSchema } from "@/lib/validators/place-order";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { SelectionLinesSchema } from "@/lib/validators/selection";

type Fail = { ok: false; error: string; problems?: string[] };

async function staff(): Promise<CurrentUser | Fail> {
  try {
    return await assertUser();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * Staff take a walk-in guest's order at the counter (P3-09). Prices come from the menu; it starts
 * as ACCEPTED because staff took it themselves. The phone is optional – with one, the visit counts
 * toward the customer's record.
 */
export async function createCounterOrder(
  input: CounterOrderInput,
): Promise<{ ok: true; number: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = CounterOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { takeaway, name, phone, note, items } = parsed.data;

  const priced = priceLines(items, await loadMenuPrices(items.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  const totals = billTotals(priced.subtotalPaise, (await getCafeDetails()).taxBasisPoints);

  const order = await db.$transaction(async (tx) => {
    const customer = phone
      ? await tx.customer.upsert({
          where: { phone },
          create: { name, phone },
          update: { name, lastVisitAt: new Date() },
          select: { id: true },
        })
      : null;
    return tx.order.create({
      data: {
        type: takeaway ? "PARCEL" : "DINE_IN",
        status: "ACCEPTED",
        customerId: customer?.id ?? null,
        customerName: name,
        customerPhone: phone || null,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        createdById: me.id,
        items: {
          create: priced.lines.map((l) => ({
            menuItemId: l.menuItemId,
            itemName: l.itemName,
            unitPricePaise: l.unitPricePaise,
            quantity: l.quantity,
            addOns: l.addOns,
            lineTotalPaise: l.lineTotalPaise,
          })),
        },
        statusLogs: {
          create: [
            { toStatus: "NEW", changedById: me.id, note: `Counter order taken by ${me.name}` },
            { fromStatus: "NEW", toStatus: "ACCEPTED", changedById: me.id },
          ],
        },
      },
      select: { id: true, number: true },
    });
  });

  await publish({ type: "order", orderId: order.id, number: order.number, status: "ACCEPTED" });
  return { ok: true, number: order.number };
}

/** Counter order: a returning guest's name from their number, so staff don't ask again. */
export async function findGuestByPhone(
  phone: string,
): Promise<{ ok: true; guest: { name: string; visits: number } | null } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = z.string().regex(INDIAN_MOBILE).safeParse(phone);
  if (!parsed.success) return { ok: false, error: "Enter a 10-digit mobile number." };
  const customer = await db.customer.findUnique({
    where: { phone: parsed.data },
    select: { name: true, orderCount: true },
  });
  return { ok: true, guest: customer && { name: customer.name, visits: customer.orderCount } };
}

export type GuestMatch = { name: string; phone: string; visits: number };

/**
 * Owner, counter order: saved customers matching what's typed so far – part of the number (3+ digits)
 * or of the name (2+ letters) – most recent visit first. Owner only: it shows full numbers.
 */
export async function searchGuests(query: string): Promise<{ ok: true; guests: GuestMatch[] } | Fail> {
  try {
    await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
  const q = z.string().trim().max(60).safeParse(query);
  if (!q.success) return { ok: true, guests: [] };
  const digits = /^\d+$/.test(q.data);
  if (digits ? q.data.length < 3 : q.data.length < 2) return { ok: true, guests: [] };
  const rows = await db.customer.findMany({
    where: digits ? { phone: { contains: q.data } } : { name: { contains: q.data, mode: "insensitive" } },
    orderBy: { lastVisitAt: "desc" },
    take: 6,
    select: { name: true, phone: true, orderCount: true },
  });
  return { ok: true, guests: rows.map((r) => ({ name: r.name, phone: r.phone, visits: r.orderCount })) };
}

/** Guest left without ordering – take their list off the board. */
export async function removeSelection(selectionId: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = z.uuid().safeParse(selectionId);
  if (!id.success) return { ok: false, error: "Nothing to remove." };
  await db.selection.deleteMany({ where: { id: id.data, status: { not: "CONFIRMED" } } });
  await publish({ type: "selection", selectionId: id.data });
  return { ok: true };
}

/* ---------------------------- after ordering ---------------------------- */

const OrderId = z.string().min(1).max(40);

/**
 * Change an order's items before it goes to the kitchen. Dishes are re-priced from the menu.
 * Other items (`others`) are the owner's: staff edits keep the ones already on the order.
 */
export async function updateOrderItems(
  orderId: string,
  items: z.input<typeof SelectionLinesSchema>,
  others?: CustomLineInput[],
): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  const lines = SelectionLinesSchema.safeParse(items);
  const custom = CustomLinesSchema.safeParse(others ?? []);
  if (!id.success) return { ok: false, error: "Order not found." };
  if (!lines.success) return { ok: false, error: lines.error.issues[0].message };
  if (!custom.success) return { ok: false, error: custom.error.issues[0].message };

  const order = await db.order.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      number: true,
      status: true,
      _count: { select: { mealPassUses: true, balanceEntries: true } },
      items: {
        where: { custom: true },
        select: {
          menuItemId: true,
          itemName: true,
          unitPricePaise: true,
          quantity: true,
          addOns: true,
          lineTotalPaise: true,
          custom: true,
        },
      },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canEditItems(order.status))
    return { ok: false, error: "This order is already in the kitchen – items can't be changed." };
  if (order._count.mealPassUses > 0)
    return {
      ok: false,
      error: "A meal pass is used on this order – undo the meal pass first, then change items.",
    };
  if (order._count.balanceEntries > 0)
    return {
      ok: false,
      error: "A customer balance is settled on this order – undo it first, then change items.",
    };

  const priced = lines.data.length
    ? priceLines(lines.data, await loadMenuPrices(lines.data.map((i) => i.itemId)))
    : { ok: true as const, lines: [], subtotalPaise: 0 };
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  const combined = orderRows(
    priced.lines,
    me.role === "OWNER" && others !== undefined
      ? customRows(custom.data)
      : order.items.map((row) => ({ ...row, addOns: row.addOns as OrderItemRow["addOns"] })),
  );
  if (!combined.ok)
    return {
      ok: false,
      error:
        combined.error === "Add at least one item."
          ? "An order needs at least one item – cancel it instead"
          : combined.error,
    };
  const totals = billTotals(combined.subtotalPaise, (await getCafeDetails()).taxBasisPoints);

  await db.$transaction([
    db.orderItem.deleteMany({ where: { orderId: order.id } }),
    db.order.update({
      where: { id: order.id },
      data: {
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        items: { create: combined.rows },
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: order.status,
            changedById: me.id,
            note: `Items changed by ${me.name}`,
          },
        },
      },
    }),
  ]);
  await publish({ type: "order", orderId: order.id, number: order.number, status: order.status });
  return { ok: true };
}

/** Send to kitchen, served, ready to collect, picked up. */
export async function advanceOrder(orderId: string, action: OrderAction): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  if (!id.success || !(action in ACTION_LABEL)) return { ok: false, error: "Order not found." };
  const order = await db.order.findUnique({
    where: { id: id.data },
    select: { id: true, number: true, status: true, type: true, bill: { select: { paidAt: true } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const next = nextStatus(action, order.status, order.type);
  // a takeaway paid at the counter before pickup is finished once it's picked up
  const to = next === "SERVED" && order.bill?.paidAt ? "PAID" : next;
  if (!to)
    return {
      ok: false,
      error: `Order #${order.number} can't do “${ACTION_LABEL[action]}” right now – refresh the screen.`,
    };

  // only move it if nobody else moved it in the meantime
  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: to },
  });
  if (moved.count === 0)
    return { ok: false, error: `Order #${order.number} was just changed by someone else.` };
  await db.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: to,
      changedById: me.id,
      ...(to !== next && { note: ACTION_LABEL[action] }),
    },
  });
  await publish({ type: "order", orderId: order.id, number: order.number, status: to });
  return { ok: true };
}

/** Take back the last step staff took on an order (a mis-tap on the live board). */
export async function undoOrderStep(orderId: string): Promise<{ ok: true; label: string } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  if (!id.success) return { ok: false, error: "Order not found." };
  const order = await db.order.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      number: true,
      status: true,
      deletedAt: true,
      bill: { select: { number: true } },
      statusLogs: { orderBy: { createdAt: "asc" }, select: { fromStatus: true, toStatus: true, note: true } },
    },
  });
  if (!order || order.deletedAt) return { ok: false, error: "Order not found." };
  const step = stepToUndo(order.statusLogs, order.status);
  if (!step) return { ok: false, error: `Nothing to undo on order #${order.number}.` };
  // a bill is made from served orders, so only a pickup can be taken back while it's on one
  if (order.bill && step.from !== "READY")
    return {
      ok: false,
      error: `Order #${order.number} is on bill #${order.bill.number}. Void the bill first, then undo.`,
    };

  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: step.from, ...(step.to === "CANCELLED" && { cancelReason: null }) },
  });
  if (moved.count === 0)
    return { ok: false, error: `Order #${order.number} was just changed by someone else.` };
  await db.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: step.from,
      changedById: me.id,
      note: UNDO_NOTE,
    },
  });
  await publish({ type: "order", orderId: order.id, number: order.number, status: step.from });
  return { ok: true, label: step.label };
}

const CancelSchema = z.object({
  orderId: OrderId,
  reason: z
    .string()
    .trim()
    .min(3, "Say why the order is cancelled")
    .max(200, "Keep the reason under 200 characters"),
});

export async function cancelOrder(orderId: string, reason: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = CancelSchema.safeParse({ orderId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, number: true, status: true, bill: { select: { number: true, paidAt: true } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.bill?.paidAt)
    return {
      ok: false,
      error: `Order #${order.number} is on paid bill #${order.bill.number} and can't be cancelled.`,
    };
  if (!canCancel(order.status))
    return { ok: false, error: `Order #${order.number} is already ${order.status.toLowerCase()}.` };

  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: "CANCELLED", cancelReason: parsed.data.reason },
  });
  if (moved.count === 0)
    return { ok: false, error: `Order #${order.number} was just changed by someone else.` };
  await db.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "CANCELLED",
      changedById: me.id,
      note: parsed.data.reason,
    },
  });
  await publish({ type: "order", orderId: order.id, number: order.number, status: "CANCELLED" });
  return { ok: true };
}

/* ------------------------------- billing ------------------------------- */

const BillOrderIds = z.array(OrderId).min(1).max(20);

/**
 * Dine-in: one bill per visit – the guest's served, unbilled orders (same customer).
 * Takeaway: one bill per order (once it's ready to collect or picked up).
 */
export async function generateBill(
  orderIds: string[],
): Promise<{ ok: true; billId: string; number: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = BillOrderIds.safeParse(orderIds);
  if (!parsed.success) return { ok: false, error: "Nothing to bill." };

  const orders = await db.order.findMany({
    where: { id: { in: parsed.data }, billId: null, status: { notIn: ["CANCELLED", "PAID"] } },
    orderBy: { createdAt: "asc" },
  });
  if (orders.length !== parsed.data.length)
    return { ok: false, error: "Some of these orders were just billed or changed – refresh the screen." };
  const kinds = new Set(orders.map((o) => o.type));
  const guests = new Set(orders.map((o) => o.customerId));
  if (kinds.size > 1 || guests.size > 1 || (orders[0].type === "PARCEL" && orders.length > 1))
    return { ok: false, error: "These orders can't go on one bill." };
  const unfinished = orders.filter((o) =>
    o.type === "PARCEL" ? !["READY", "SERVED"].includes(o.status) : o.status !== "SERVED",
  );
  if (unfinished.length > 0) {
    return {
      ok: false,
      error: `Order${unfinished.length > 1 ? "s" : ""} ${unfinished.map((o) => `#${o.number}`).join(", ")} ${unfinished.length > 1 ? "aren't" : "isn't"} served yet. Mark ${unfinished.length > 1 ? "them" : "it"} served (or cancel) first.`,
    };
  }

  const totals = billFromOrders(orders, (await getCafeDetails()).taxBasisPoints);
  const last = orders[orders.length - 1];
  const bill = await db
    .$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          type: last.type,
          customerName: last.customerName,
          customerPhone: last.customerPhone,
          subtotalPaise: totals.subtotalPaise,
          taxBasisPoints: totals.taxBasisPoints,
          taxPaise: totals.taxPaise,
          totalPaise: totals.totalPaise,
          createdById: me.id,
        },
        select: { id: true, number: true },
      });
      // only link orders that are still unbilled (another cashier may have billed them a moment ago)
      const linked = await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) }, billId: null },
        data: { billId: created.id },
      });
      if (linked.count !== orders.length) throw new Error("ALREADY_BILLED");
      return created;
    })
    .catch((e: Error) => (e.message === "ALREADY_BILLED" ? null : Promise.reject(e)));

  if (!bill) return { ok: false, error: "Someone else just made this bill – refresh the screen." };
  for (const o of orders) await publish({ type: "order", orderId: o.id, number: o.number, status: o.status });
  return { ok: true, billId: bill.id, number: bill.number };
}

const PaymentSchema = z.object({
  billId: z.string().min(1).max(40),
  method: z.enum(PAY_CHOICES),
  /** what the guest actually paid, when it isn't the bill total */
  receivedPaise: z.number().int().min(0).max(10_000_000).optional(),
});

/**
 * Payment taken at the counter: orders become PAID (a takeaway not yet picked up stays READY),
 * customer stats update. If the guest paid more or less than the bill, the difference goes on
 * their balance and is kept on the bill, so the money book and drawer count what was received.
 */
export async function markBillPaid(
  billId: string,
  method: PayChoice,
  receivedPaise?: number,
): Promise<{ ok: true; difference: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const res = await payBill(me, billId, method, receivedPaise);
  // only payments taken on Live orders message the guest by themselves
  if (res.ok) after(() => autoSendPayment([billId], me.id));
  return res;
}

/**
 * Order history / Bills / customer page: record that a bill was paid, without messaging the guest –
 * they can be sent the bill by hand ("Send on WhatsApp") if they want it.
 */
export async function recordBillPayment(
  billId: string,
  method: PayChoice,
): Promise<{ ok: true; difference: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  return payBill(me, billId, method);
}

/**
 * Takes the payment for one bill (no WhatsApp – the caller sends one message for the whole payment).
 * `receivedPaise` differing from the total goes on the guest's balance.
 */
async function payBill(
  me: CurrentUser,
  billId: string,
  method: PayChoice,
  receivedPaise?: number,
): Promise<{ ok: true; difference: number } | Fail> {
  const parsed = PaymentSchema.safeParse({ billId, method, receivedPaise });
  if (!parsed.success) return { ok: false, error: "Choose how they paid, and check the amount received." };

  const bill = await db.bill.findUnique({ where: { id: parsed.data.billId }, include: { orders: true } });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.paidAt) return { ok: false, error: `Bill #${bill.number} is already paid.` };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is void – make a new bill.` };

  const now = new Date();
  const label = PAYMENT_SHORT[parsed.data.method];
  // the guest the bill is for: the order with the bill's phone, else the only guest on it
  const guestIds = [...new Set(bill.orders.map((o) => o.customerId).filter((id): id is string => !!id))];
  const billCustomer =
    bill.orders.find((o) => o.customerId && o.customerPhone === bill.customerPhone)?.customerId ??
    (guestIds.length === 1 ? guestIds[0] : undefined);
  const difference =
    parsed.data.receivedPaise === undefined
      ? 0
      : paymentDifference(bill.totalPaise, parsed.data.receivedPaise);
  if (difference !== 0 && !billCustomer)
    return {
      ok: false,
      error: "To keep extra or short money on account, the order needs the guest's phone number.",
    };
  const done = await db.$transaction(async (tx) => {
    const paid = await tx.bill.updateMany({
      where: { id: bill.id, paidAt: null, voidedAt: null },
      data: { paidAt: now, paymentMethod: parsed.data.method, differencePaise: difference },
    });
    if (paid.count === 0) return false;
    for (const o of bill.orders) {
      const to = statusOnPayment(o.status);
      if (to !== o.status) await tx.order.update({ where: { id: o.id }, data: { status: to } });
    }
    await tx.orderStatusLog.createMany({
      data: bill.orders.map((o) => ({
        orderId: o.id,
        fromStatus: o.status,
        toStatus: statusOnPayment(o.status),
        changedById: me.id,
        note: `Bill #${bill.number} paid by ${label}`,
      })),
    });
    // one visit per customer on the bill; the spend goes to the guest the bill is for
    for (const id of guestIds) {
      await tx.customer.update({
        where: { id },
        data: {
          orderCount: { increment: 1 },
          lastVisitAt: now,
          ...(id === billCustomer && { totalSpendPaise: { increment: bill.totalPaise } }),
        },
      });
    }
    if (difference !== 0 && billCustomer)
      await tx.customerBalanceEntry.create({
        data: {
          customerId: billCustomer,
          kind: difference > 0 ? "PAID_EXTRA" : "PAID_LESS",
          amountPaise: difference,
          method: parsed.data.method,
          billId: bill.id,
          createdById: me.id,
        },
      });
    return true;
  });
  if (!done) return { ok: false, error: `Bill #${bill.number} was just paid or voided by someone else.` };
  for (const o of bill.orders)
    await publish({ type: "order", orderId: o.id, number: o.number, status: statusOnPayment(o.status) });
  if (difference !== 0 && billCustomer) revalidatePath(`/admin/customers/${billCustomer}`);
  return { ok: true, difference };
}

const BillIds = z.array(z.string().min(1).max(40)).min(1, "Pick at least one bill").max(30);

/**
 * A guest pays some of their pay-later bills at once, all the same way. Each bill is paid as if
 * tapped on its own (same checks, customer stats); then one WhatsApp "payment received" for all of
 * them. Stops at the first that fails (the ones before it stay paid and are in the message).
 */
export async function markBillsPaid(
  billIds: string[],
  method: PayChoice,
): Promise<{ ok: true; paid: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const ids = BillIds.safeParse(billIds);
  if (!ids.success) return { ok: false, error: ids.error.issues[0].message };
  const paid: string[] = [];
  let failed: Fail | null = null;
  for (const id of [...new Set(ids.data)]) {
    const res = await payBill(me, id, method);
    if (!res.ok) {
      failed = res;
      break;
    }
    paid.push(id);
  }
  if (paid.length) after(() => autoSendPayment(paid, me.id));
  if (failed)
    return { ok: false, error: paid.length ? `${paid.length} paid, then: ${failed.error}` : failed.error };
  return { ok: true, paid: paid.length };
}

/**
 * Complete a bill without payment – the guest pays later. Its orders are finished (a takeaway
 * waiting at the counter counts as picked up) and it leaves "Awaiting payment" for the "Pay later"
 * list, where the payment is recorded whenever it comes. Not counted as a sale until then.
 */
export async function markBillPayLater(billId: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = z.string().min(1).max(40).safeParse(billId);
  if (!id.success) return { ok: false, error: "Bill not found." };
  const bill = await db.bill.findUnique({ where: { id: id.data }, include: { orders: true } });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.paidAt) return { ok: false, error: `Bill #${bill.number} is already paid.` };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is void – make a new bill.` };
  if (bill.payLaterAt) return { ok: false, error: `Bill #${bill.number} is already on pay later.` };

  const done = await db.$transaction(async (tx) => {
    const marked = await tx.bill.updateMany({
      where: { id: bill.id, paidAt: null, voidedAt: null, payLaterAt: null },
      data: { payLaterAt: new Date() },
    });
    if (marked.count === 0) return false;
    for (const o of bill.orders) {
      if (o.status === "READY") await tx.order.update({ where: { id: o.id }, data: { status: "SERVED" } });
    }
    await tx.orderStatusLog.createMany({
      data: bill.orders.map((o) => ({
        orderId: o.id,
        fromStatus: o.status,
        toStatus: o.status === "READY" ? "SERVED" : o.status,
        changedById: me.id,
        note: `Bill #${bill.number} completed – pay later`,
      })),
    });
    return true;
  });
  if (!done) return { ok: false, error: `Bill #${bill.number} was just changed by someone else.` };
  for (const o of bill.orders)
    await publish({
      type: "order",
      orderId: o.id,
      number: o.number,
      status: o.status === "READY" ? "SERVED" : o.status,
    });
  return { ok: true };
}

const VoidSchema = z.object({
  billId: z.string().min(1).max(40),
  reason: z
    .string()
    .trim()
    .min(3, "Say why the bill is voided")
    .max(200, "Keep the reason under 200 characters"),
});

/**
 * Void a bill made by mistake (only before it's paid). The bill is kept – marked void with a
 * reason – so bill numbers stay continuous; its orders go back to "to bill".
 */
export async function voidBill(billId: string, reason: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = VoidSchema.safeParse({ billId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const bill = await db.bill.findUnique({
    where: { id: parsed.data.billId },
    include: { orders: { select: { id: true, number: true, status: true }, orderBy: { number: "asc" } } },
  });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is already void.` };
  if (bill.paidAt) return { ok: false, error: `Bill #${bill.number} is paid and can't be voided.` };

  const done = await db.$transaction(async (tx) => {
    // only if nobody paid or voided it in the meantime
    const voided = await tx.bill.updateMany({
      where: { id: bill.id, paidAt: null, voidedAt: null },
      data: {
        voidedAt: new Date(),
        voidReason: parsed.data.reason,
        voidedById: me.id,
        voidedOrderNumbers: bill.orders.map((o) => o.number),
      },
    });
    if (voided.count === 0) return false;
    await tx.order.updateMany({ where: { billId: bill.id }, data: { billId: null } });
    await tx.orderStatusLog.createMany({
      data: bill.orders.map((o) => ({
        orderId: o.id,
        fromStatus: o.status,
        toStatus: o.status,
        changedById: me.id,
        note: `Bill #${bill.number} voided: ${parsed.data.reason}`,
      })),
    });
    return true;
  });
  if (!done) return { ok: false, error: `Bill #${bill.number} was just paid or voided by someone else.` };
  for (const o of bill.orders)
    await publish({ type: "order", orderId: o.id, number: o.number, status: o.status });
  return { ok: true };
}

const PayOwedSchema = z.object({
  customerId: z.string().min(1).max(40),
  amountPaise: z.number().int().positive().max(100_000_000),
  method: z.enum(PAY_CHOICES),
});

export type PayOwedResult =
  { ok: true; paid: number[]; part: { number: number; left: number } | null } | Fail;

/**
 * A guest pays towards what they owe (customer page): the money goes on their oldest bills first –
 * each one it covers is paid in full, the one it runs out on is paid in part (the rest stays owed,
 * like "Received" at the counter), what's left of short bills is paid back. No WhatsApp by itself.
 */
export async function payOwed(
  customerId: string,
  amountPaise: number,
  method: PayChoice,
): Promise<PayOwedResult> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = PayOwedSchema.safeParse({ customerId, amountPaise, method });
  if (!parsed.success) return { ok: false, error: "Enter the amount they paid and how." };
  const { debts } = await debtsOf(parsed.data.customerId);
  const owed = debts.reduce((n, d) => n + d.paise, 0);
  if (owed === 0) return { ok: false, error: "They don't owe anything on a bill." };
  if (parsed.data.amountPaise > owed)
    return { ok: false, error: `They owe ${formatINR(toRupees(owed))} on their bills – take that or less.` };

  const paid: number[] = [];
  let part: { number: number; left: number } | null = null;
  for (const { debt, pay } of allocatePayment(debts, parsed.data.amountPaise)) {
    if (debt.kind === "unpaid") {
      // a part payment is the counter's "Received": the rest goes on the guest's balance
      const res = await payBill(me, debt.billId, parsed.data.method, pay < debt.paise ? pay : undefined);
      if (!res.ok)
        return {
          ok: false,
          error: paid.length
            ? `Bills ${paid.map((n) => `#${n}`).join(", ")} paid, then: ${res.error}`
            : res.error,
        };
    } else {
      // what's left of a short bill: paid back on the balance (oldest short bills clear first)
      await db.$transaction(async (tx) => {
        const sale = await tx.extraSale.create({
          data: {
            soldAt: new Date(),
            method: parsed.data.method,
            amountPaise: pay,
            note: `Customer balance – paid back on bill #${debt.number}`,
            createdById: me.id,
          },
          select: { id: true },
        });
        await tx.customerBalanceEntry.create({
          data: {
            customerId: parsed.data.customerId,
            kind: "PAID_BACK",
            amountPaise: pay,
            method: parsed.data.method,
            saleId: sale.id,
            note: `for bill #${debt.number}`,
            createdById: me.id,
          },
        });
      });
    }
    if (pay < debt.paise) part = { number: debt.number, left: debt.paise - pay };
    else paid.push(debt.number);
  }
  // no WhatsApp by itself here – only Live orders send; the bills can be sent by hand
  revalidatePath(`/admin/customers/${parsed.data.customerId}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/bills");
  revalidatePath("/admin/money");
  return { ok: true, paid, part };
}
