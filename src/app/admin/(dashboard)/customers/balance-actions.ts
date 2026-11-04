"use server";

import { revalidatePath } from "next/cache";
import { AuthError, assertUser, type Access, type CurrentUser } from "@/lib/auth/dal";
import { BALANCE_KIND_LABEL, MANUAL_SIGN, settleLine, settleLineName } from "@/lib/customer-balance";
import { balanceBills, balanceOf } from "@/lib/data/customer-balance";
import { getCafeDetails } from "@/lib/data/menu";
import { retotal } from "@/lib/data/order-totals";
import { db } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { BalanceEntryId, BalanceEntrySchema, BalanceOrderIds } from "@/lib/validators/customer-balance";
import { owedByCustomer } from "@/lib/data/owed";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { fieldErrors, type FormState } from "@/lib/validators/menu";

type Fail = { ok: false; error: string };

async function signedIn(access: Access): Promise<CurrentUser | Fail> {
  try {
    return await assertUser(access);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * Owner, on the customer page: money handed over or given back outside a bill – a ± sale today.
 * "Paid less" only records what they owe: no money moved, so no sale (it counts when they pay).
 */
export async function addBalanceEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return { error: me.error };
  const parsed = BalanceEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { customerId, kind, amount, method, note } = parsed.data;
  const customer = await db.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) return { error: "Customer not found." };
  const signed = MANUAL_SIGN[kind] * amount;

  // paying back / giving back only settles the balance – unpaid bills are paid with Take payment
  const balance = await balanceOf(customerId);
  const rupees = (paise: number) => formatINR(toRupees(paise));
  let tooMuch: string | null = null;
  if (kind === "PAID_BACK" && amount > -balance) {
    const unpaid = (await owedByCustomer([customerId])).get(customerId);
    tooMuch =
      balance < 0
        ? `They owe ${rupees(-balance)} on their balance – that's the most they can pay back here.`
        : "They don't owe anything on their balance.";
    if (unpaid)
      tooMuch += ` The ${rupees(unpaid.paise)} still to pay is on unpaid bills – use Take payment under "Still to pay" at the top.`;
  } else if (kind === "RETURNED" && amount > balance)
    tooMuch =
      balance > 0
        ? `They have ${rupees(balance)} credit – that's the most you can give back.`
        : "They have no credit to give back.";
  if (tooMuch) return { error: tooMuch, fieldErrors: { amount: tooMuch } };

  await db.$transaction(async (tx) => {
    const sale = method
      ? await tx.extraSale.create({
          data: {
            soldAt: new Date(),
            method,
            amountPaise: signed,
            note: `Customer balance – ${BALANCE_KIND_LABEL[kind].toLowerCase()}${note ? ` – ${note}` : ""}`.slice(
              0,
              250,
            ),
            createdById: me.id,
          },
          select: { id: true },
        })
      : null;
    await tx.customerBalanceEntry.create({
      data: {
        customerId,
        kind,
        amountPaise: signed,
        method: method ?? null,
        saleId: sale?.id ?? null,
        note: note || null,
        createdById: me.id,
      },
    });
  });
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/money");
  revalidatePath("/admin/cash");
  return { ok: true };
}

/** Unbilled, open orders of one guest (a balance belongs to a customer, so a phone is needed). */
async function guestOrders(orderIds: string[]) {
  const parsed = BalanceOrderIds.safeParse(orderIds);
  if (!parsed.success) return { ok: false as const, error: "Nothing to settle." };
  const ids = [...new Set(parsed.data)];
  const orders = await db.order.findMany({
    where: { id: { in: ids }, deletedAt: null },
    orderBy: { number: "asc" },
    select: { id: true, number: true, status: true, billId: true, customerId: true, totalPaise: true },
  });
  if (orders.length !== ids.length)
    return { ok: false as const, error: "Some of these orders changed – refresh the screen." };
  if (orders.some((o) => o.billId))
    return { ok: false as const, error: "The bill is already made – void it first to change this." };
  if (orders.some((o) => o.status === "CANCELLED" || o.status === "PAID"))
    return { ok: false as const, error: "These orders are finished – refresh the screen." };
  const customerId = orders[0].customerId;
  if (!customerId || orders.some((o) => o.customerId !== customerId))
    return { ok: false as const, error: "A balance needs the guest's phone number on the order." };
  return { ok: true as const, orders, customerId };
}

/**
 * Staff, on a "To bill" card: a credit comes off these orders (never below ₹0), an amount owed is
 * added. One line on the last order; undo before billing.
 */
export async function settleBalance(orderIds: string[]): Promise<{ ok: true; linePaise: number } | Fail> {
  const me = await signedIn("team");
  if ("ok" in me) return me;
  const res = await guestOrders(orderIds);
  if (!res.ok) return res;
  const { orders, customerId } = res;
  const { taxBasisPoints } = await getCafeDetails();

  const out = await db
    .$transaction(async (tx) => {
      // one till at a time per customer, so a credit can't be spent twice
      await tx.$executeRaw`SELECT 1 FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
      if (await tx.customerBalanceEntry.count({ where: { orderId: { in: orders.map((o) => o.id) } } }))
        throw new Error("ALREADY");
      const balance = await balanceOf(customerId, tx);
      const linePaise = settleLine(
        balance,
        orders.reduce((s, o) => s + o.totalPaise, 0),
      );
      if (linePaise === 0) throw new Error("NOTHING");
      const last = orders[orders.length - 1];
      const bills = (await balanceBills({ [customerId]: balance }, tx))[customerId] ?? [];
      const entry = await tx.customerBalanceEntry.create({
        data: { customerId, kind: "SETTLED", amountPaise: linePaise, orderId: last.id, createdById: me.id },
        select: { id: true },
      });
      await tx.orderItem.create({
        data: {
          orderId: last.id,
          itemName: settleLineName(linePaise, bills),
          unitPricePaise: linePaise,
          quantity: 1,
          lineTotalPaise: linePaise,
          custom: true,
          balanceEntryId: entry.id,
        },
      });
      return { linePaise, order: await retotal(tx, last.id, taxBasisPoints) };
    })
    .catch((e: Error) =>
      e.message === "ALREADY" || e.message === "NOTHING" ? e.message : Promise.reject(e),
    );
  if (out === "ALREADY") return { ok: false, error: "The balance is already on these orders." };
  if (out === "NOTHING") return { ok: false, error: "This guest's balance is ₹0 now – refresh the screen." };

  await publish({ type: "order", orderId: out.order.id, number: out.order.number, status: out.order.status });
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true, linePaise: out.linePaise };
}

/** Takes the balance line off these unbilled orders; the balance goes back as it was. */
export async function undoBalanceSettle(orderIds: string[]): Promise<{ ok: true; paise: number } | Fail> {
  const me = await signedIn("team");
  if ("ok" in me) return me;
  const res = await guestOrders(orderIds);
  if (!res.ok) return res;
  const { taxBasisPoints } = await getCafeDetails();
  const ids = res.orders.map((o) => o.id);

  const out = await db.$transaction(async (tx) => {
    const entries = await tx.customerBalanceEntry.findMany({
      where: { orderId: { in: ids }, kind: "SETTLED" },
      select: { orderId: true, amountPaise: true },
    });
    // the lines go with the entries (OrderItem.balanceEntryId cascades)
    await tx.customerBalanceEntry.deleteMany({ where: { orderId: { in: ids }, kind: "SETTLED" } });
    const changed = [];
    for (const id of new Set(entries.map((e) => e.orderId!)))
      changed.push(await retotal(tx, id, taxBasisPoints));
    return { changed, paise: entries.reduce((s, e) => s + e.amountPaise, 0) };
  });
  for (const o of out.changed)
    await publish({ type: "order", orderId: o.id, number: o.number, status: o.status });
  revalidatePath(`/admin/customers/${res.customerId}`);
  return { ok: true, paise: out.paise };
}

/**
 * Owner: delete a hand entry made by mistake. It stays on the page in red but no longer counts, and
 * its money-book sale is removed. Entries from a bill are changed through the bill instead.
 */
export async function deleteBalanceEntry(entryId: string): Promise<{ ok: true } | Fail> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return me;
  const id = BalanceEntryId.safeParse(entryId);
  if (!id.success) return { ok: false, error: "Entry not found." };
  const entry = await db.customerBalanceEntry.findUnique({ where: { id: id.data } });
  if (!entry) return { ok: false, error: "Entry not found." };
  if (entry.deletedAt) return { ok: false, error: "This entry is already deleted." };
  if (entry.billId || entry.orderId || entry.kind === "SETTLED")
    return {
      ok: false,
      error: "This came from a bill – change the bill (void it or change the payment) instead.",
    };
  await db.$transaction(async (tx) => {
    await tx.customerBalanceEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date(), deletedById: me.id },
    });
    if (entry.saleId) await tx.extraSale.deleteMany({ where: { id: entry.saleId } });
  });
  revalidatePath(`/admin/customers/${entry.customerId}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/money");
  revalidatePath("/admin/cash");
  return { ok: true };
}
