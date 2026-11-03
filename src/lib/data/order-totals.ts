import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { billTotals } from "@/lib/pricing";

/** Recomputes an order's totals from its lines (after meal pass or balance lines are added or removed). */
export async function retotal(tx: Prisma.TransactionClient, orderId: string, taxBasisPoints: number) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { lineTotalPaise: true } });
  const t = billTotals(
    items.reduce((s, i) => s + i.lineTotalPaise, 0),
    taxBasisPoints,
  );
  return tx.order.update({
    where: { id: orderId },
    data: { subtotalPaise: t.subtotalPaise, taxPaise: t.taxPaise, totalPaise: t.totalPaise },
    select: { id: true, number: true, status: true },
  });
}
