import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { carriedOpening, expectedCash } from "@/lib/cash";
import { isoDay } from "@/lib/reports";

/** Start of a café day and of the next one (the server runs in IST). */
export function dayBounds(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) };
}

export const today = () => isoDay(new Date());

/** Money in and out between two moments: paid, non-void bills by method, and expenses. */
export async function moneyBetween(start: Date, end: Date) {
  const [bills, extra, expenses] = await Promise.all([
    db.bill.groupBy({
      by: ["paymentMethod"],
      where: { paidAt: { gte: start, lt: end }, voidedAt: null },
      _sum: { totalPaise: true },
      _count: true,
    }),
    // sales added by hand in the money book (no bill)
    db.extraSale.groupBy({
      by: ["method"],
      where: { soldAt: { gte: start, lt: end } },
      _sum: { amountPaise: true },
    }),
    db.expense.groupBy({
      by: ["paidWith"],
      where: { paidAt: { gte: start, lt: end } },
      _sum: { amountPaise: true },
      _count: true,
    }),
  ]);
  const sales = (...methods: PaymentMethod[]) =>
    bills
      .filter((b) => b.paymentMethod && methods.includes(b.paymentMethod))
      .reduce((s, b) => s + (b._sum.totalPaise ?? 0), 0) +
    extra.filter((x) => methods.includes(x.method)).reduce((s, x) => s + (x._sum.amountPaise ?? 0), 0);
  const spent = expenses.reduce((s, e) => s + (e._sum.amountPaise ?? 0), 0);
  return {
    cashSalesPaise: sales("CASH"),
    upiSalesPaise: sales("UPI"),
    cardSalesPaise: sales("CARD", "CREDIT_CARD", "DEBIT_CARD"),
    bills: bills.reduce((n, b) => n + b._count, 0),
    cashExpensesPaise: expenses.find((e) => e.paidWith === "CASH")?._sum.amountPaise ?? 0,
    expensesPaise: spent,
    expenseCount: expenses.reduce((n, e) => n + e._count, 0),
  };
}

/** Opening cash for `day` when nobody entered it: from the last recorded day before it. */
async function carryInto(day: string) {
  const last = await db.cashDay.findFirst({ where: { day: { lt: day } }, orderBy: { day: "desc" } });
  if (!last) return 0;
  const closed = last.closedAt !== null && last.countedPaise !== null;
  // a closed day already counted its own cash; an open one still needs its own sales and expenses
  const from = closed ? dayBounds(last.day).end : dayBounds(last.day).start;
  const since = await moneyBetween(from, dayBounds(day).start);
  return carriedOpening(
    { openingPaise: last.openingPaise, countedPaise: last.countedPaise, closed },
    since.cashSalesPaise - since.cashExpensesPaise,
  );
}

export type DrawerDay = {
  day: string;
  openingPaise: number;
  openingSource: "ENTERED" | "CARRIED";
  openedBy: string | null;
  cashSalesPaise: number;
  cashExpensesPaise: number;
  expectedPaise: number;
  upiSalesPaise: number;
  cardSalesPaise: number;
  bills: number;
  closed: null | { at: string; countedPaise: number; by: string | null; note: string | null };
};

/** The drawer for one day: live totals while open, the saved snapshot once closed. */
export async function getDrawerDay(day: string): Promise<DrawerDay> {
  const row = await db.cashDay.findUnique({
    where: { day },
    include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
  });
  const { start, end } = dayBounds(day);
  const money = await moneyBetween(start, end);
  const openingPaise = row ? row.openingPaise : await carryInto(day);
  const closed = row?.closedAt && row.countedPaise !== null;
  const totals = closed
    ? { openingPaise, cashSalesPaise: row.cashSalesPaise ?? 0, cashExpensesPaise: row.cashExpensesPaise ?? 0 }
    : { openingPaise, cashSalesPaise: money.cashSalesPaise, cashExpensesPaise: money.cashExpensesPaise };
  return {
    day,
    ...totals,
    openingSource: row?.openingSource ?? "CARRIED",
    openedBy: row?.openedBy?.name ?? null,
    expectedPaise: closed && row.expectedPaise !== null ? row.expectedPaise : expectedCash(totals),
    upiSalesPaise: money.upiSalesPaise,
    cardSalesPaise: money.cardSalesPaise,
    bills: money.bills,
    closed: closed
      ? {
          at: row.closedAt!.toISOString(),
          countedPaise: row.countedPaise!,
          by: row.closedBy?.name ?? null,
          note: row.closeNote,
        }
      : null,
  };
}

/** Recent recorded days, newest first (today included even if nobody touched the drawer yet). */
export async function getDrawerHistory(limit = 14) {
  const rows = await db.cashDay.findMany({ orderBy: { day: "desc" }, take: limit, select: { day: true } });
  const days = [...new Set([today(), ...rows.map((r) => r.day)])].slice(0, limit);
  return Promise.all(days.map(getDrawerDay));
}
