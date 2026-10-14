import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  buildDays,
  type CardFees,
  daysOfMonth,
  monthLabel,
  type MoneyRow,
  type SalesBucket,
  type SpendBucket,
  shiftMonth,
  sumRows,
  twelveMonths,
} from "@/lib/money-book";

// Sales = paid, non-void bills (counted on the day they were paid) plus sales added by hand.
// Timestamps are stored in UTC, so days are taken in café time (IST), as in Reports.
const local = (column: string) => Prisma.raw(`(${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'`);

export type ExtraSaleRow = {
  id: string;
  day: string;
  method: PaymentMethod;
  amountPaise: number;
  note: string | null;
  by: string | null;
};

export type MoneyBook = {
  month: string;
  fees: CardFees;
  days: MoneyRow[];
  monthTotal: MoneyRow;
  months: MoneyRow[];
  byCategory: { category: ExpenseCategory; paise: number }[];
  extraSales: ExtraSaleRow[];
};

const monthStart = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

export async function getMoneyBook(month: string): Promise<MoneyBook> {
  const months = twelveMonths(month);
  const from = monthStart(months[0]);
  const end = monthStart(shiftMonth(month, 1));
  const monthFrom = monthStart(month);

  const [settings, billSales, extraSales, spend, byCategory, extraList] = await Promise.all([
    db.cafeSettings.findUnique({
      where: { id: 1 },
      select: { creditCardFeeBps: true, debitCardFeeBps: true },
    }),
    db.$queryRaw<{ key: string; method: PaymentMethod; paise: bigint | null }[]>`
      SELECT to_char(${local('b."paidAt"')}, 'YYYY-MM-DD') AS key, b."paymentMethod" AS method, SUM(b."totalPaise") AS paise
      FROM "Bill" b
      WHERE b."paidAt" IS NOT NULL AND b."voidedAt" IS NULL AND b."paymentMethod" IS NOT NULL
        AND b."paidAt" >= ${from} AND b."paidAt" < ${end}
      GROUP BY 1, 2`,
    db.$queryRaw<{ key: string; method: PaymentMethod; paise: bigint | null }[]>`
      SELECT to_char(${local('s."soldAt"')}, 'YYYY-MM-DD') AS key, s."method" AS method, SUM(s."amountPaise") AS paise
      FROM "ExtraSale" s WHERE s."soldAt" >= ${from} AND s."soldAt" < ${end}
      GROUP BY 1, 2`,
    db.$queryRaw<{ key: string; paise: bigint | null; cash: bigint | null }[]>`
      SELECT to_char(${local('e."paidAt"')}, 'YYYY-MM-DD') AS key, SUM(e."amountPaise") AS paise,
        SUM(e."amountPaise") FILTER (WHERE e."paidWith" = 'CASH') AS cash
      FROM "Expense" e WHERE e."paidAt" >= ${from} AND e."paidAt" < ${end}
      GROUP BY 1`,
    db.expense.groupBy({
      by: ["category"],
      where: { paidAt: { gte: monthFrom, lt: end } },
      _sum: { amountPaise: true },
    }),
    db.extraSale.findMany({
      where: { soldAt: { gte: monthFrom, lt: end } },
      orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  const fees: CardFees = {
    creditBps: settings?.creditCardFeeBps ?? 0,
    debitBps: settings?.debitCardFeeBps ?? 0,
  };
  const sales: SalesBucket[] = [...billSales, ...extraSales].map((s) => ({
    key: s.key,
    method: s.method,
    paise: Number(s.paise ?? 0),
  }));
  const spent: SpendBucket[] = spend.map((s) => ({
    key: s.key,
    paise: Number(s.paise ?? 0),
    cashPaise: Number(s.cash ?? 0),
  }));

  // every day of the twelve months, so a month's card fees are the sum of its days
  const allDays = months.flatMap((m) => daysOfMonth(m));
  const dayRows = buildDays(allDays, sales, spent, fees);
  const monthRows = months.map((m) =>
    sumRows(
      dayRows.filter((d) => d.key.startsWith(m)),
      m,
      monthLabel(m),
    ),
  );
  const days = dayRows.filter((d) => d.key.startsWith(month));

  return {
    month,
    fees,
    days,
    monthTotal: monthRows[monthRows.length - 1],
    months: monthRows,
    byCategory: byCategory
      .map((c) => ({ category: c.category, paise: c._sum.amountPaise ?? 0 }))
      .filter((c) => c.paise > 0)
      .sort((a, b) => b.paise - a.paise),
    extraSales: extraList.map((s) => ({
      id: s.id,
      day: `${s.soldAt.getFullYear()}-${String(s.soldAt.getMonth() + 1).padStart(2, "0")}-${String(s.soldAt.getDate()).padStart(2, "0")}`,
      method: s.method,
      amountPaise: s.amountPaise,
      note: s.note,
      by: s.createdBy?.name ?? null,
    })),
  };
}
