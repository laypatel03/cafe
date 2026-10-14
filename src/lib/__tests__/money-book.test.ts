import { describe, expect, it } from "vitest";

import {
  buildDays,
  cardFee,
  dayRow,
  daysOfMonth,
  margin,
  resolveMonth,
  shiftMonth,
  sumRows,
  twelveMonths,
} from "@/lib/money-book";
import { ExtraSaleSchema, CardFeesSchema } from "@/lib/validators/money-book";

const NO_FEES = { creditBps: 0, debitBps: 0 };

describe("money book", () => {
  it("adds every way of paying, takes off card fees and expenses", () => {
    // the spreadsheet's example day: ₹3,450 cash, ₹5,200 Google Pay, ₹900 credit, ₹600 debit, ₹850 spent in cash
    const r = dayRow(
      "2026-10-12",
      "Mon",
      { CASH: 345000, UPI: 520000, CREDIT_CARD: 90000, DEBIT_CARD: 60000 },
      { paise: 85000, cashPaise: 85000 },
      { creditBps: 180, debitBps: 40 },
    );
    expect(r.sales).toBe(1015000);
    expect(r.cardFees).toBe(1600 + 200); // ₹16.20 → ₹16, ₹2.40 → ₹2
    expect(r.profit).toBe(1015000 - 1800 - 85000);
    expect(r.cashLeft).toBe(345000 - 85000);
  });

  it("counts old 'card' bills as credit card", () => {
    const r = dayRow("d", "d", { CARD: 50000, CREDIT_CARD: 10000 }, { paise: 0, cashPaise: 0 }, NO_FEES);
    expect(r.credit).toBe(60000);
    expect(r.sales).toBe(60000);
  });

  it("rounds card fees to whole rupees", () => {
    expect(cardFee(90000, 180)).toBe(1600);
    expect(cardFee(100000, 175)).toBe(1800); // ₹17.50 → ₹18
    expect(cardFee(0, 180)).toBe(0);
  });

  it("builds every day from raw buckets, empty days at zero", () => {
    const rows = buildDays(
      [
        { key: "2026-10-01", label: "1" },
        { key: "2026-10-02", label: "2" },
      ],
      [
        { key: "2026-10-01", method: "CASH", paise: 1000 },
        { key: "2026-10-01", method: "CASH", paise: 500 }, // a bill and an extra sale on the same day
        { key: "2026-10-01", method: "UPI", paise: 2000 },
      ],
      [{ key: "2026-10-01", paise: 700, cashPaise: 200 }],
      NO_FEES,
    );
    expect(rows[0]).toMatchObject({
      cash: 1500,
      upi: 2000,
      sales: 3500,
      expenses: 700,
      profit: 2800,
      cashLeft: 1300,
    });
    expect(rows[1]).toMatchObject({ sales: 0, expenses: 0, profit: 0 });
  });

  it("sums rows, fees included, and works out the margin", () => {
    const fees = { creditBps: 200, debitBps: 0 };
    const a = dayRow("a", "a", { CREDIT_CARD: 10000 }, { paise: 0, cashPaise: 0 }, fees);
    const b = dayRow("b", "b", { CREDIT_CARD: 10000 }, { paise: 0, cashPaise: 0 }, fees);
    const t = sumRows([a, b], "t", "Total");
    expect(t.cardFees).toBe(a.cardFees + b.cardFees);
    expect(t.sales).toBe(20000);
    expect(margin(t)).toBeCloseTo(t.profit / 20000);
    expect(margin({ sales: 0, profit: -500 })).toBe(0);
  });

  it("reads the month from the URL, never in the future", () => {
    const now = new Date(2026, 9, 13);
    expect(resolveMonth(undefined, now)).toBe("2026-10");
    expect(resolveMonth("2026-09", now)).toBe("2026-09");
    expect(resolveMonth("2027-01", now)).toBe("2026-10");
    expect(resolveMonth("2026-13", now)).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(twelveMonths("2026-10")[0]).toBe("2025-11");
    expect(twelveMonths("2026-10")[11]).toBe("2026-10");
  });

  it("lists the days of a month, up to today for the current one", () => {
    const now = new Date(2026, 9, 13);
    expect(daysOfMonth("2026-10", now)).toHaveLength(13);
    expect(daysOfMonth("2026-09", now)).toHaveLength(30);
    expect(daysOfMonth("2024-02", now)).toHaveLength(29);
  });
});

describe("money book forms", () => {
  it("takes an unbilled sale in rupees", () => {
    const ok = ExtraSaleSchema.safeParse({ day: "2026-10-12", method: "UPI", amount: "₹1,250", note: "" });
    expect(ok.success && ok.data.amount).toBe(125000);
    expect(ExtraSaleSchema.safeParse({ day: "2026-10-12", method: "CARD", amount: "100" }).success).toBe(
      false,
    );
    expect(ExtraSaleSchema.safeParse({ day: "12-10-2026", method: "CASH", amount: "100" }).success).toBe(
      false,
    );
  });

  it("takes card fees as a percentage, stored in basis points", () => {
    const ok = CardFeesSchema.safeParse({ credit: "1.8", debit: "0.4%" });
    expect(ok.success && ok.data).toEqual({ credit: 180, debit: 40 });
    expect(CardFeesSchema.safeParse({ credit: "12", debit: "0" }).success).toBe(false);
    expect(CardFeesSchema.safeParse({ credit: "", debit: "" }).success && true).toBe(true);
  });
});
