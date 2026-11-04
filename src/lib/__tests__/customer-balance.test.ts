import { describe, expect, it } from "vitest";

import {
  allocatePayment,
  balanceState,
  MANUAL_SIGN,
  shortBillPayoffs,
  shortfallsLeft,
  paymentDifference,
  settleLine,
  settleLineName,
} from "@/lib/customer-balance";

describe("paymentDifference", () => {
  it("is plus when paid extra, minus when paid less", () => {
    expect(paymentDifference(20000, 25000)).toBe(5000);
    expect(paymentDifference(20000, 18000)).toBe(-2000);
    expect(paymentDifference(20000, 20000)).toBe(0);
  });
});

describe("settleLine", () => {
  it("takes a credit off the bill, never below ₹0", () => {
    expect(settleLine(5000, 30000)).toBe(-5000);
    expect(settleLine(5000, 3000)).toBe(-3000);
    expect(settleLine(5000, 0)).toBe(0);
  });

  it("adds an amount owed in full", () => {
    expect(settleLine(-2000, 30000)).toBe(2000);
    expect(settleLine(-2000, 0)).toBe(2000);
  });

  it("names the line by direction", () => {
    expect(settleLineName(-5000)).toBe("Paid extra on an earlier visit");
    expect(settleLineName(2000)).toBe("Still owed from an earlier visit");
    expect(settleLineName(2000, [407])).toBe("Still owed from bill #407");
    expect(settleLineName(-5000, [402, 408])).toBe("Paid extra on bills #402, #408");
  });
});

describe("balance words and manual entries", () => {
  it("reads the balance", () => {
    expect(balanceState(1)).toBe("credit");
    expect(balanceState(-1)).toBe("owes");
    expect(balanceState(0)).toBe("settled");
  });

  it("moves the balance the right way", () => {
    expect(MANUAL_SIGN.PAID_EXTRA).toBe(1);
    expect(MANUAL_SIGN.PAID_BACK).toBe(1);
    expect(MANUAL_SIGN.PAID_LESS).toBe(-1);
    expect(MANUAL_SIGN.RETURNED).toBe(-1);
  });
});

describe("shortfallsLeft", () => {
  const shorts = [
    { customerId: "a", billId: "b3", amountPaise: -5000 },
    { customerId: "a", billId: "b2", amountPaise: -3000 },
    { customerId: "a", billId: "b1", amountPaise: -2000 },
    { customerId: "b", billId: "x1", amountPaise: -1000 },
  ];
  it("keeps the newest short bills owed when part has been paid back", () => {
    // owed 10,000 in all, 6,500 still owed → b3 in full, 1,500 of b2, b1 paid off
    const due = shortfallsLeft(new Map([["a", 6500]]), shorts);
    expect([...due]).toEqual([
      ["b3", 5000],
      ["b2", 1500],
    ]);
  });
  it("works the same for credit (plus amounts)", () => {
    const credit = [
      { customerId: "c", billId: "e2", amountPaise: 3000 },
      { customerId: "c", billId: "e1", amountPaise: 4000 },
    ];
    expect([...shortfallsLeft(new Map([["c", 5000]]), credit)]).toEqual([
      ["e2", 3000],
      ["e1", 2000],
    ]);
  });
  it("leaves out guests who owe nothing and entries without a bill", () => {
    const due = shortfallsLeft(new Map([["a", 1000]]), [
      { customerId: "a", billId: null, amountPaise: -500 },
      ...shorts,
    ]);
    expect([...due]).toEqual([["b3", 1000]]);
  });
});

describe("shortBillPayoffs", () => {
  const d = (day: number) => new Date(2026, 10, day);
  it("pays the oldest short bill first, with the date of each payment", () => {
    const paid = shortBillPayoffs([
      { kind: "PAID_LESS", billId: "b1", amountPaise: -4800, createdAt: d(1) },
      { kind: "PAID_LESS", billId: "b2", amountPaise: -8200, createdAt: d(2) },
      { kind: "PAID_BACK", billId: null, amountPaise: 4000, createdAt: d(3) },
      { kind: "SETTLED", billId: null, amountPaise: 5000, createdAt: d(4) },
    ]);
    expect(paid.get("b1")).toEqual([
      { at: d(3), paise: 4000 },
      { at: d(4), paise: 800 },
    ]);
    expect(paid.get("b2")).toEqual([{ at: d(4), paise: 4200 }]);
  });
  it("uses credit the guest already had when a bill is paid short", () => {
    const paid = shortBillPayoffs([
      { kind: "PAID_EXTRA", billId: "x", amountPaise: 1500, createdAt: d(1) },
      { kind: "PAID_LESS", billId: "b1", amountPaise: -4000, createdAt: d(2) },
    ]);
    expect(paid.get("b1")).toEqual([{ at: d(2), paise: 1500 }]);
  });
});

describe("allocatePayment", () => {
  const d = (n: number, day: number, paise: number, kind: "unpaid" | "short" = "unpaid") => ({
    billId: `b${n}`,
    number: n,
    at: new Date(2026, 10, day),
    paise,
    kind,
  });
  // ₹1,000 over 4 bills, listed out of order
  const debts = [d(4, 4, 30000), d(1, 1, 20000), d(3, 3, 25000), d(2, 2, 25000)];
  it("pays the oldest bills in full and the next one in part", () => {
    expect(allocatePayment(debts, 50000).map((a) => [a.debt.number, a.pay])).toEqual([
      [1, 20000],
      [2, 25000],
      [3, 5000],
    ]);
  });
  it("covers everything when it's enough, never more than each bill", () => {
    expect(allocatePayment(debts, 100000).map((a) => a.pay)).toEqual([20000, 25000, 25000, 30000]);
  });
  it("mixes unpaid bills and short ones by date", () => {
    const mixed = [d(2, 2, 10000), d(1, 1, 4000, "short")];
    expect(allocatePayment(mixed, 6000).map((a) => [a.debt.kind, a.pay])).toEqual([
      ["short", 4000],
      ["unpaid", 2000],
    ]);
  });
});
