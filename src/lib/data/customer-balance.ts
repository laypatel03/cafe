import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Entries that count: a settlement on a cancelled or deleted order gives the balance back. */
export const COUNTED_BALANCE = {
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
