// What goes on a guest's dues statement (the PDF sent with a WhatsApp reminder). Pure, so it's tested.
// The amounts come from the unpaid orders themselves – the same sum as "Still to pay" (data/owed.ts).

import { type BillLine, type BillSourceItem, mergeBillLines } from "./billing";

export type StatementOrder = {
  number: number;
  createdAt: Date;
  totalPaise: number;
  items: BillSourceItem[];
  bill: { number: number; createdAt: Date } | null;
};

export type StatementGroup = {
  /** "Bill #12", or "Order #34" for an order that was never billed, or "Earlier balance" */
  label: string;
  /** a bill paid short: "Paid ₹9 of ₹149" */
  note?: string;
  date: Date;
  orderNumbers: number[];
  lines: BillLine[];
  amountPaise: number;
};

/** One group per unpaid bill (its orders together) and per unbilled order, oldest first. */
export function statementGroups(orders: StatementOrder[]): { groups: StatementGroup[]; totalPaise: number } {
  const byKey = new Map<string, { label: string; date: Date; orders: StatementOrder[] }>();
  for (const o of orders) {
    const key = o.bill ? `b${o.bill.number}` : `o${o.number}`;
    const group = byKey.get(key);
    if (group) group.orders.push(o);
    else
      byKey.set(key, {
        label: o.bill ? `Bill #${o.bill.number}` : `Order #${o.number}`,
        date: o.bill?.createdAt ?? o.createdAt,
        orders: [o],
      });
  }
  const groups = [...byKey.values()]
    .map((g) => ({
      label: g.label,
      date: g.date,
      orderNumbers: g.orders.map((o) => o.number).sort((a, b) => a - b),
      lines: mergeBillLines(g.orders.flatMap((o) => o.items)),
      amountPaise: g.orders.reduce((s, o) => s + o.totalPaise, 0),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return { groups, totalPaise: groups.reduce((s, g) => s + g.amountPaise, 0) };
}

/** A bill paid short whose rest is still owed (from the guest's balance, oldest cleared first). */
export type ShortBill = {
  number: number;
  createdAt: Date;
  totalPaise: number;
  /** paid at the counter, plus anything paid back since */
  paidPaise: number;
  leftPaise: number;
  orderNumbers: number[];
  items: BillSourceItem[];
};

/**
 * The statement with what's owed from paying less added: one group per short bill (what's left of it)
 * and, when part of the balance came from a hand entry with no bill, one "Earlier balance" line.
 */
export function withShortBills(
  base: { groups: StatementGroup[]; totalPaise: number },
  shorts: ShortBill[],
  otherOwedPaise: number,
  rupees: (paise: number) => string,
): { groups: StatementGroup[]; totalPaise: number } {
  const groups: StatementGroup[] = [
    ...base.groups,
    ...shorts.map((b) => ({
      label: `Bill #${b.number}`,
      note: `Paid ${rupees(b.paidPaise)} of ${rupees(b.totalPaise)} – rest still to pay`,
      date: b.createdAt,
      orderNumbers: [...b.orderNumbers].sort((x, y) => x - y),
      lines: mergeBillLines(b.items),
      amountPaise: b.leftPaise,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (otherOwedPaise > 0)
    groups.unshift({
      label: "Earlier balance",
      date: new Date(0),
      orderNumbers: [],
      lines: [],
      amountPaise: otherOwedPaise,
    });
  return { groups, totalPaise: groups.reduce((s, g) => s + g.amountPaise, 0) };
}
