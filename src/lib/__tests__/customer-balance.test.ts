import { describe, expect, it } from "vitest";

import {
  balanceState,
  MANUAL_SIGN,
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
