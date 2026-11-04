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

/** "bill #12", "bills #12, #15" – or "an earlier visit" when the bills aren't known (hand entries). */
export function fromBills(billNumbers: number[]) {
  if (!billNumbers.length) return "an earlier visit";
  return `${billNumbers.length === 1 ? "bill" : "bills"} ${billNumbers.map((n) => `#${n}`).join(", ")}`;
}

/** The order line that settles a balance, naming the bills it came from. */
export const settleLineName = (linePaise: number, billNumbers: number[] = []) =>
  linePaise < 0 ? `Paid extra on ${fromBills(billNumbers)}` : `Still owed from ${fromBills(billNumbers)}`;

/** "Credit ₹50", "Owes ₹20" or "Settled", for the balance in words. */
export function balanceState(balancePaise: number): "credit" | "owes" | "settled" {
  return balancePaise > 0 ? "credit" : balancePaise < 0 ? "owes" : "settled";
}

/**
 * Which bills a balance still comes from, and how much of each (bill id → paise). `open` is each guest's
 * balance size (owed, or credit); `entries` their "paid less" (or "paid extra") entries, newest first –
 * what's been settled since clears the oldest bills first. Works the same for owed and credit.
 */
export function shortfallsLeft(
  open: Map<string, number>,
  entries: { customerId: string; billId: string | null; amountPaise: number }[],
): Map<string, number> {
  const left = new Map(open);
  const due = new Map<string, number>();
  for (const s of entries) {
    const rest = left.get(s.customerId) ?? 0;
    if (rest <= 0 || !s.billId) continue;
    const part = Math.min(Math.abs(s.amountPaise), rest);
    due.set(s.billId, (due.get(s.billId) ?? 0) + part);
    left.set(s.customerId, rest - part);
  }
  return due;
}

export type Payoff = { at: Date; paise: number };

/**
 * When each short bill was paid off, and how much each time (bill id → payments, oldest first).
 * Replays a guest's balance entries in order: what they owe piles up bill by bill, and money in
 * (paid back, added to a later bill, or credit) clears the oldest bill first. `entries` are the counted
 * ones (COUNTED_BALANCE), oldest first.
 */
export function shortBillPayoffs(
  entries: { amountPaise: number; billId: string | null; kind: string; createdAt: Date }[],
): Map<string, Payoff[]> {
  const open: { billId: string | null; left: number }[] = [];
  let credit = 0;
  const paid = new Map<string, Payoff[]>();
  const pay = (lot: { billId: string | null; left: number }, paise: number, at: Date) => {
    lot.left -= paise;
    if (lot.billId) paid.set(lot.billId, [...(paid.get(lot.billId) ?? []), { at, paise }]);
  };
  for (const e of entries) {
    if (e.amountPaise < 0) {
      // credit the guest has covers it first; a short bill is owed for the rest
      const fromCredit = Math.min(credit, -e.amountPaise);
      credit -= fromCredit;
      if (e.kind === "PAID_LESS") {
        const lot = { billId: e.billId, left: -e.amountPaise };
        if (fromCredit > 0) pay(lot, fromCredit, e.createdAt);
        if (lot.left > 0) open.push(lot);
      } else if (-e.amountPaise > fromCredit) open.push({ billId: null, left: -e.amountPaise - fromCredit });
    } else {
      let money = e.amountPaise;
      while (money > 0 && open.length) {
        const part = Math.min(money, open[0].left);
        pay(open[0], part, e.createdAt);
        money -= part;
        if (open[0].left === 0) open.shift();
      }
      credit += money;
    }
  }
  return paid;
}
