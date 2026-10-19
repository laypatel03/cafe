import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { startOfCafeDay } from "@/lib/format";

/**
 * Orders a customer still owes for: not paid (no bill, or a bill waiting for payment), and either
 * from an earlier day or put on "pay later". Today's orders that are still being served or billed
 * don't count yet. Same "not paid" rule as Order history's "Payment pending".
 */
export function owedOrdersWhere(): Prisma.OrderWhereInput {
  return {
    deletedAt: null,
    customerId: { not: null },
    status: { not: "CANCELLED" },
    AND: [
      { OR: [{ billId: null }, { bill: { is: { paidAt: null, voidedAt: null } } }] },
      { OR: [{ createdAt: { lt: startOfCafeDay() } }, { bill: { is: { payLaterAt: { not: null } } } }] },
    ],
  };
}

export type Owed = { paise: number; orders: number };

/** What each customer still owes, for customers who owe anything (all of them, or just these ids). */
export async function owedByCustomer(ids?: string[]): Promise<Map<string, Owed>> {
  const rows = await db.order.groupBy({
    by: ["customerId"],
    where: { ...owedOrdersWhere(), ...(ids && { customerId: { in: ids } }) },
    _sum: { totalPaise: true },
    _count: true,
  });
  return new Map(
    rows
      .filter((r) => r.customerId && (r._sum.totalPaise ?? 0) > 0)
      .map((r) => [r.customerId as string, { paise: r._sum.totalPaise ?? 0, orders: r._count }]),
  );
}
