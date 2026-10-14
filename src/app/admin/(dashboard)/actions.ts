"use server";

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
} from "@/lib/order-flow";
import { billFromOrders } from "@/lib/billing";
import { billTotals, priceLines } from "@/lib/pricing";
import { publish } from "@/lib/realtime";
import { maskPhone } from "@/lib/phone-mask";
import { PAY_CHOICES, type PayChoice, PAYMENT_SHORT } from "@/lib/payments";
import { RECEIPT_SMS_ENABLED, receiptMessage, smsLink } from "@/lib/receipt";
import { type CounterOrderInput, CounterOrderSchema } from "@/lib/validators/place-order";
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

/** Change an order's items before it goes to the kitchen. Re-priced from the menu. */
export async function updateOrderItems(
  orderId: string,
  items: z.input<typeof SelectionLinesSchema>,
): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  const lines = SelectionLinesSchema.min(1, "An order needs at least one item – cancel it instead").safeParse(
    items,
  );
  if (!id.success) return { ok: false, error: "Order not found." };
  if (!lines.success) return { ok: false, error: lines.error.issues[0].message };

  const order = await db.order.findUnique({
    where: { id: id.data },
    select: { id: true, number: true, status: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canEditItems(order.status))
    return { ok: false, error: "This order is already in the kitchen – items can't be changed." };

  const priced = priceLines(lines.data, await loadMenuPrices(lines.data.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  const totals = billTotals(priced.subtotalPaise, (await getCafeDetails()).taxBasisPoints);

  await db.$transaction([
    db.orderItem.deleteMany({ where: { orderId: order.id } }),
    db.order.update({
      where: { id: order.id },
      data: {
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
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
});

/**
 * Payment taken at the counter: orders become PAID (a takeaway not yet picked up stays READY),
 * customer stats update.
 */
export async function markBillPaid(billId: string, method: PayChoice): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = PaymentSchema.safeParse({ billId, method });
  if (!parsed.success) return { ok: false, error: "Choose cash, Google Pay, credit card or debit card." };

  const bill = await db.bill.findUnique({ where: { id: parsed.data.billId }, include: { orders: true } });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.paidAt) return { ok: false, error: `Bill #${bill.number} is already paid.` };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is void – make a new bill.` };

  const now = new Date();
  const label = PAYMENT_SHORT[parsed.data.method];
  const done = await db.$transaction(async (tx) => {
    const paid = await tx.bill.updateMany({
      where: { id: bill.id, paidAt: null, voidedAt: null },
      data: { paidAt: now, paymentMethod: parsed.data.method },
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
    const customerIds = [...new Set(bill.orders.map((o) => o.customerId).filter((id): id is string => !!id))];
    const billCustomer = bill.orders.find((o) => o.customerPhone === bill.customerPhone)?.customerId;
    for (const id of customerIds) {
      await tx.customer.update({
        where: { id },
        data: {
          orderCount: { increment: 1 },
          lastVisitAt: now,
          ...(id === billCustomer && { totalSpendPaise: { increment: bill.totalPaise } }),
        },
      });
    }
    return true;
  });
  if (!done) return { ok: false, error: `Bill #${bill.number} was just paid or voided by someone else.` };
  for (const o of bill.orders)
    await publish({ type: "order", orderId: o.id, number: o.number, status: statusOnPayment(o.status) });
  return { ok: true };
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

/* ------------------------------ receipt SMS ------------------------------ */

export type ReceiptSms = { ok: true; to: string; text: string; href: string } | Fail;

/**
 * The receipt text for a paid bill and an sms: link that opens the counter phone's messages app
 * with it filled in. Staff see the number masked; the full number is only inside the link.
 */
export async function receiptSms(billId: string): Promise<ReceiptSms> {
  if (!RECEIPT_SMS_ENABLED) return { ok: false, error: "Texting receipts is switched off." };
  const me = await staff();
  if ("ok" in me) return me;
  const id = z.string().min(1).max(40).safeParse(billId);
  if (!id.success) return { ok: false, error: "Bill not found." };
  const bill = await db.bill.findUnique({
    where: { id: id.data },
    select: {
      number: true,
      totalPaise: true,
      paymentMethod: true,
      paidAt: true,
      voidedAt: true,
      customerPhone: true,
    },
  });
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.voidedAt) return { ok: false, error: `Bill #${bill.number} is void.` };
  if (!bill.paidAt) return { ok: false, error: `Bill #${bill.number} isn't paid yet.` };
  if (!bill.customerPhone) return { ok: false, error: "There's no phone number on this bill." };

  const text = receiptMessage({
    cafeName: (await getCafeDetails()).name,
    number: bill.number,
    totalPaise: bill.totalPaise,
    paymentMethod: bill.paymentMethod,
  });
  return {
    ok: true,
    to: me.role === "OWNER" ? bill.customerPhone : maskPhone(bill.customerPhone),
    text,
    href: smsLink(bill.customerPhone, text),
  };
}
