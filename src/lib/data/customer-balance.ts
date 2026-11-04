import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { shortBillPayoffs, shortfallsLeft } from "@/lib/customer-balance";
import { db } from "@/lib/db";

/** Entries that count: not deleted, and a settlement on a cancelled or deleted order gives the balance back. */
export const COUNTED_BALANCE = {
  deletedAt: null,
  OR: [{ orderId: null }, { order: { deletedAt: null, status: { not: "CANCELLED" } } }],
} satisfies Prisma.CustomerBalanceEntryWhereInput;

type Client = Pick<Prisma.TransactionClient, "customerBalanceEntry">;

/** Balances by customer id (plus = credit, minus = owed); customers at ₹0 are left out. */
export async function balancesFor(
  customerIds: string[],
  client: Client = db,
): Promise<Record<string, number>> {
  const ids = [...new Set(customerIds)];
  if (!ids.length) return {};
  const rows = await client.customerBalanceEntry.groupBy({
    by: ["customerId"],
    where: { customerId: { in: ids }, ...COUNTED_BALANCE },
    _sum: { amountPaise: true },
  });
  return Object.fromEntries(
    rows.filter((r) => r._sum.amountPaise).map((r) => [r.customerId, r._sum.amountPaise!]),
  );
}

export const balanceOf = async (customerId: string, client: Client = db) =>
  (await balancesFor([customerId], client))[customerId] ?? 0;

/** Every customer with a balance (plus = credit, minus = owed), for the customers list. */
export async function allBalances(): Promise<Map<string, number>> {
  const rows = await db.customerBalanceEntry.groupBy({
    by: ["customerId"],
    where: COUNTED_BALANCE,
    _sum: { amountPaise: true },
  });
  return new Map(rows.filter((r) => r._sum.amountPaise).map((r) => [r.customerId, r._sum.amountPaise!]));
}

/**
 * Bills paid short that are still owed, with what's left on each (bill id → paise). A balance is one
 * sum per guest, so what they've paid back is taken as clearing their oldest short bills first.
 */
export async function shortBillsDue(customerIds?: string[]): Promise<Map<string, number>> {
  const balances = customerIds ? Object.entries(await balancesFor(customerIds)) : [...(await allBalances())];
  const left = new Map(balances.filter(([, b]) => b < 0).map(([id, b]) => [id, -b]));
  if (!left.size) return new Map();
  const shorts = await db.customerBalanceEntry.findMany({
    where: {
      kind: "PAID_LESS",
      deletedAt: null,
      customerId: { in: [...left.keys()] },
      bill: { is: { voidedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: { customerId: true, billId: true, amountPaise: true },
  });
  return shortfallsLeft(left, shorts);
}

/**
 * The bill numbers each guest's balance comes from (customer id → numbers, oldest first): their short
 * bills while they owe, their overpaid bills while they have credit.
 */
export async function balanceBills(
  balances: Record<string, number>,
  client: Pick<Prisma.TransactionClient, "customerBalanceEntry"> = db,
): Promise<Record<string, number[]>> {
  const ids = Object.keys(balances).filter((id) => balances[id] !== 0);
  if (!ids.length) return {};
  const entries = await client.customerBalanceEntry.findMany({
    where: {
      customerId: { in: ids },
      kind: { in: ["PAID_LESS", "PAID_EXTRA"] },
      deletedAt: null,
      bill: { is: { voidedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      customerId: true,
      billId: true,
      amountPaise: true,
      kind: true,
      bill: { select: { number: true } },
    },
  });
  const out: Record<string, number[]> = {};
  for (const id of ids) {
    const kind = balances[id] < 0 ? "PAID_LESS" : "PAID_EXTRA";
    const mine = entries.filter((e) => e.customerId === id && e.kind === kind);
    const open = shortfallsLeft(new Map([[id, Math.abs(balances[id])]]), mine);
    out[id] = mine
      .filter((e) => e.billId && open.has(e.billId))
      .map((e) => e.bill!.number)
      .sort((a, b) => a - b);
  }
  return out;
}

/** When each of a guest's short bills was paid off since (bill id → payments, oldest first). */
export async function billPayoffs(customerId: string) {
  const entries = await db.customerBalanceEntry.findMany({
    where: { customerId, ...COUNTED_BALANCE },
    orderBy: { createdAt: "asc" },
    select: { amountPaise: true, billId: true, kind: true, createdAt: true },
  });
  return shortBillPayoffs(entries);
}
