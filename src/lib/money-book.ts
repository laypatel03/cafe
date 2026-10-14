import type { PaymentMethod } from "@/generated/prisma/enums";

// The money book: sales by how guests paid, card machine fees, expenses and profit, per day and
// per month. Pure, so it's unit-tested. Amounts are paise; days are café days (yyyy-mm-dd).

export type CardFees = { creditBps: number; debitBps: number };

export type MoneyRow = {
  key: string;
  label: string;
  cash: number;
  upi: number;
  credit: number;
  debit: number;
  sales: number;
  cardFees: number;
  expenses: number;
  profit: number;
  /** expenses paid with cash from the drawer */
  cashExpenses: number;
  /** cash sales minus cash expenses: what the day added to the drawer */
  cashLeft: number;
};

export type SalesBucket = { key: string; method: PaymentMethod; paise: number };
export type SpendBucket = { key: string; paise: number; cashPaise: number };

/** What the card machine provider keeps on `paise` at `bps` basis points (180 = 1.8 %), rounded to the rupee. */
export const cardFee = (paise: number, bps: number) => Math.round((paise * bps) / 10_000 / 100) * 100;

/** One day's row. Old bills paid by "card" (before credit and debit were split) count as credit card. */
export function dayRow(
  key: string,
  label: string,
  sales: Partial<Record<PaymentMethod, number>>,
  spend: { paise: number; cashPaise: number },
  fees: CardFees,
): MoneyRow {
  const cash = sales.CASH ?? 0;
  const upi = sales.UPI ?? 0;
  const credit = (sales.CREDIT_CARD ?? 0) + (sales.CARD ?? 0);
  const debit = sales.DEBIT_CARD ?? 0;
  const total = cash + upi + credit + debit;
  const cardFees = cardFee(credit, fees.creditBps) + cardFee(debit, fees.debitBps);
  return {
    key,
    label,
    cash,
    upi,
    credit,
    debit,
    sales: total,
    cardFees,
    expenses: spend.paise,
    profit: total - cardFees - spend.paise,
    cashExpenses: spend.cashPaise,
    cashLeft: cash - spend.cashPaise,
  };
}

const SUMMED = [
  "cash",
  "upi",
  "credit",
  "debit",
  "sales",
  "cardFees",
  "expenses",
  "profit",
  "cashExpenses",
  "cashLeft",
] as const;

/** Rows added up (card fees too, so a month's fees equal the sum of its days). */
export function sumRows(rows: MoneyRow[], key: string, label: string): MoneyRow {
  const out = { key, label } as MoneyRow;
  for (const f of SUMMED) out[f] = rows.reduce((s, r) => s + r[f], 0);
  return out;
}

/** Profit as a share of sales, 0 when there were no sales. */
export const margin = (r: Pick<MoneyRow, "sales" | "profit">) => (r.sales === 0 ? 0 : r.profit / r.sales);

/** Day rows for every key, from raw sales and expense buckets. */
export function buildDays(
  keys: { key: string; label: string }[],
  sales: SalesBucket[],
  spend: SpendBucket[],
  fees: CardFees,
): MoneyRow[] {
  const byDay = new Map<string, Partial<Record<PaymentMethod, number>>>();
  for (const s of sales) {
    const day = byDay.get(s.key) ?? {};
    day[s.method] = (day[s.method] ?? 0) + s.paise;
    byDay.set(s.key, day);
  }
  const spendByDay = new Map(spend.map((s) => [s.key, s]));
  return keys.map(({ key, label }) =>
    dayRow(key, label, byDay.get(key) ?? {}, spendByDay.get(key) ?? { paise: 0, cashPaise: 0 }, fees),
  );
}

/* --------------------------------- dates --------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** `yyyy-mm` from the URL if it's a real month up to now, otherwise this month. */
export function resolveMonth(input: string | undefined, now = new Date()): string {
  const current = monthKey(now);
  if (!input || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input)) return current;
  return input > current ? current : input;
}

/** Month `yyyy-mm` moved by `n` months. */
export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

/** Every day of `month`, stopping at today for the current month. */
export function daysOfMonth(month: string, now = new Date()) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const isCurrent = month === monthKey(now);
  const upTo = isCurrent ? now.getDate() : last;
  const out: { key: string; label: string }[] = [];
  for (let d = 1; d <= upTo; d++) {
    const date = new Date(y, m - 1, d);
    out.push({
      key: `${month}-${pad(d)}`,
      label: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return out;
}

/** The twelve months ending with `month`, oldest first. */
export const twelveMonths = (month: string) =>
  Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11));
