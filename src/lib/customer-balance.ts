// A customer's balance: money they paid over (credit) or under (owed), carried to a later visit.
// Plus = the café owes the guest; minus = the guest owes the café. Pure rules, unit-tested.
// Money in paise.

export type BalanceKind = "PAID_EXTRA" | "PAID_LESS" | "PAID_BACK" | "RETURNED" | "SETTLED";

export const BALANCE_KIND_LABEL: Record<BalanceKind, string> = {
  PAID_EXTRA: "Paid extra",
  PAID_LESS: "Paid less",
  PAID_BACK: "Paid back what they owed",
  RETURNED: "Extra given back",
  SETTLED: "Settled on an order",
};

/** Entries the owner adds by hand on the customer page, and which way each moves the balance. */
export const MANUAL_KINDS = ["PAID_EXTRA", "PAID_LESS", "PAID_BACK", "RETURNED"] as const;
export type ManualKind = (typeof MANUAL_KINDS)[number];
export const MANUAL_SIGN: Record<ManualKind, 1 | -1> = {
  PAID_EXTRA: 1,
  PAID_LESS: -1,
  PAID_BACK: 1,
  RETURNED: -1,
};

/** The difference when a bill is paid: plus = paid extra, minus = paid less, 0 = exact. */
export const paymentDifference = (billPaise: number, receivedPaise: number) => receivedPaise - billPaise;

/**
 * The line that settles a balance on an order: a credit comes off (but never below ₹0 for
 * these orders), an amount owed is added in full. Returns the line amount (minus = off the bill).
 */
export function settleLine(balancePaise: number, ordersTotalPaise: number) {
  if (balancePaise > 0) return 0 - Math.min(balancePaise, Math.max(0, ordersTotalPaise));
  return 0 - balancePaise;
}

export const settleLineName = (linePaise: number) =>
  linePaise < 0 ? "Paid extra on an earlier visit" : "Still owed from an earlier visit";

/** "Credit ₹50", "Owes ₹20" or "Settled", for the balance in words. */
export function balanceState(balancePaise: number): "credit" | "owes" | "settled" {
  return balancePaise > 0 ? "credit" : balancePaise < 0 ? "owes" : "settled";
}
