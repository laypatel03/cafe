import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { type Bucket, fillDays, fillHours, fillMonths, type ReportRange } from "@/lib/reports";

// Sales = paid bills that weren't voided, counted when they were paid. Timestamps are stored
// in UTC, so grouping happens in café time (IST) – otherwise 1 am sales land on the day before.
const local = (column: string) => Prisma.raw(`(${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'`);
const PAID = Prisma.sql`b."paidAt" IS NOT NULL AND b."voidedAt" IS NULL`;

type BucketRow = { key: string; paise: bigint | number | null; bills: bigint | number };
const rows = (r: BucketRow[]) =>
  r.map((x) => ({ key: x.key, paise: Number(x.paise ?? 0), bills: Number(x.bills) }));

export type Report = {
  salesPaise: number;
  bills: number;
  byType: { type: "DINE_IN" | "PARCEL"; paise: number; bills: number }[];
  cancelledOrders: number;
  guests: { total: number; returning: number };
  hours: Bucket[];
  days: Bucket[];
  months: Bucket[];
  topItems: { name: string; quantity: number; paise: number }[];
  expensesPaise: number;
  /** biggest first */
  expensesByCategory: { category: ExpenseCategory; paise: number }[];
};

export async function getReport(range: ReportRange): Promise<Report> {
  const { start, end } = range;
  const inRange = Prisma.sql`${PAID} AND b."paidAt" >= ${start} AND b."paidAt" < ${end}`;
  const monthsFrom = new Date(end.getFullYear(), end.getMonth() - 11, 1);

  const [byType, cancelled, guests, hours, days, months, top, spent] = await Promise.all([
    db.$queryRaw<{ type: "DINE_IN" | "PARCEL"; paise: bigint | null; bills: bigint }[]>`
      SELECT b."type", SUM(b."totalPaise") AS paise, COUNT(*) AS bills
      FROM "Bill" b WHERE ${inRange} GROUP BY b."type"`,
    db.order.count({ where: { status: "CANCELLED", createdAt: { gte: start, lt: end } } }),
    // guests on this period's bills, and how many of them are regulars (2+ paid visits so far)
    db.$queryRaw<{ total: bigint; returning: bigint }[]>`
      WITH g AS (
        SELECT DISTINCT o."customerId" AS id FROM "Bill" b JOIN "Order" o ON o."billId" = b."id"
        WHERE ${inRange} AND o."customerId" IS NOT NULL AND o."deletedAt" IS NULL
      )
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE (
          SELECT COUNT(DISTINCT b."id") FROM "Order" o2 JOIN "Bill" b ON o2."billId" = b."id"
          WHERE o2."customerId" = g.id AND o2."deletedAt" IS NULL AND ${PAID} AND b."paidAt" < ${end}
        ) >= 2) AS returning
      FROM g`,
    db.$queryRaw<BucketRow[]>`
      SELECT EXTRACT(HOUR FROM ${local('b."paidAt"')})::int::text AS key, SUM(b."totalPaise") AS paise, COUNT(*) AS bills
      FROM "Bill" b WHERE ${inRange} GROUP BY 1`,
    db.$queryRaw<BucketRow[]>`
      SELECT to_char(${local('b."paidAt"')}, 'YYYY-MM-DD') AS key, SUM(b."totalPaise") AS paise, COUNT(*) AS bills
      FROM "Bill" b WHERE ${inRange} GROUP BY 1`,
    db.$queryRaw<BucketRow[]>`
      SELECT to_char(${local('b."paidAt"')}, 'YYYY-MM') AS key, SUM(b."totalPaise") AS paise, COUNT(*) AS bills
      FROM "Bill" b WHERE ${PAID} AND b."paidAt" >= ${monthsFrom} AND b."paidAt" < ${end} GROUP BY 1`,
    db.$queryRaw<{ name: string; quantity: bigint; paise: bigint }[]>`
      SELECT i."itemName" AS name, SUM(i."quantity") AS quantity, SUM(i."lineTotalPaise") AS paise
      FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId" JOIN "Bill" b ON b."id" = o."billId"
      WHERE ${inRange} AND o."deletedAt" IS NULL AND NOT i."custom"
      GROUP BY i."itemName" ORDER BY quantity DESC, paise DESC LIMIT 10`,
    db.expense.groupBy({
      by: ["category"],
      where: { paidAt: { gte: start, lt: end } },
      _sum: { amountPaise: true },
    }),
  ]);
  const expensesByCategory = spent
    .map((e) => ({ category: e.category, paise: e._sum.amountPaise ?? 0 }))
    .sort((a, b) => b.paise - a.paise);

  const types = byType.map((t) => ({ type: t.type, paise: Number(t.paise ?? 0), bills: Number(t.bills) }));
  return {
    salesPaise: types.reduce((s, t) => s + t.paise, 0),
    bills: types.reduce((s, t) => s + t.bills, 0),
    byType: (["DINE_IN", "PARCEL"] as const).map(
      (type) => types.find((t) => t.type === type) ?? { type, paise: 0, bills: 0 },
    ),
    cancelledOrders: cancelled,
    guests: { total: Number(guests[0]?.total ?? 0), returning: Number(guests[0]?.returning ?? 0) },
    hours: fillHours(rows(hours)),
    days: fillDays(rows(days), range),
    months: fillMonths(rows(months), new Date(end.getTime() - 1)),
    topItems: top.map((t) => ({ name: t.name, quantity: Number(t.quantity), paise: Number(t.paise) })),
    expensesPaise: expensesByCategory.reduce((s, e) => s + e.paise, 0),
    expensesByCategory,
  };
}
