// Adding and fixing orders after the fact (Order history, when the owner switches it on).
// Pure, so it's unit-tested. All money in paise.

import type { MenuItemPrice, PricedLine, PricingResult, RequestedLine } from "@/lib/pricing";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";

/** Same dish with the same add-ons, in any order. */
export const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

/** What a line was sold at, so an untouched line keeps its old price after the menu changes. */
export type KeptLine = { itemName: string; unitPricePaise: number; addOns: PricedLine["addOns"] };

/**
 * Prices lines for a past order. Lines already on the order keep the price the guest paid;
 * new lines take today's menu price. Sold-out doesn't matter here – the guest already had it.
 */
export function priceEditedLines(
  requested: RequestedLine[],
  menu: Map<string, MenuItemPrice>,
  kept: Map<string, KeptLine> = new Map(),
): PricingResult {
  const problems: string[] = [];
  const lines: PricedLine[] = [];
  if (requested.length === 0) problems.push("Add at least one item.");

  for (const r of requested) {
    const addOnIds = [...new Set(r.addOnIds)];
    if (!Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > MAX_LINE_QUANTITY) {
      problems.push(`Quantities go from 1 to ${MAX_LINE_QUANTITY}.`);
      continue;
    }
    const old = kept.get(lineKey(r.itemId, addOnIds));
    if (old) {
      lines.push({
        menuItemId: r.itemId,
        itemName: old.itemName,
        addOns: old.addOns,
        unitPricePaise: old.unitPricePaise,
        quantity: r.quantity,
        lineTotalPaise: old.unitPricePaise * r.quantity,
      });
      continue;
    }
    const item = menu.get(r.itemId);
    if (!item) {
      problems.push("An item in the list is no longer on the menu.");
      continue;
    }
    const addOns: PricedLine["addOns"] = [];
    for (const id of addOnIds) {
      const addOn = item.addOns.get(id);
      if (!addOn) problems.push(`An add-on for ${item.name} is no longer offered.`);
      else addOns.push({ id, name: addOn.name, pricePaise: addOn.pricePaise });
    }
    const unitPricePaise = item.pricePaise + addOns.reduce((s, a) => s + a.pricePaise, 0);
    lines.push({
      menuItemId: r.itemId,
      itemName: item.name,
      addOns,
      unitPricePaise,
      quantity: r.quantity,
      lineTotalPaise: unitPricePaise * r.quantity,
    });
  }

  if (problems.length) return { ok: false, problems: [...new Set(problems)] };
  return { ok: true, lines, subtotalPaise: lines.reduce((s, l) => s + l.lineTotalPaise, 0) };
}

/* ------------------------------ café time ------------------------------ */

// The café is in India (UTC+5:30, no daylight saving), so these don't depend on the server's clock zone.
const IST_OFFSET_MS = 330 * 60_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** A Date as "yyyy-mm-ddThh:mm" in café time, for <input type="datetime-local">. */
export function toCafeInput(d: Date) {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/** "yyyy-mm-ddThh:mm" in café time back to a Date, or null if it isn't a real date and time. */
export function fromCafeInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi);
  const back = new Date(utc);
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || h > 23 || mi > 59) return null;
  return new Date(utc - IST_OFFSET_MS);
}

/* --------------------------- customer totals --------------------------- */

export type PaidBillForStats = {
  totalPaise: number;
  paidAt: Date;
  customerPhone: string | null;
  orders: { customerId: string | null; customerPhone: string | null }[];
};

/**
 * A guest's visits and spend worked out again from their paid bills, the same way payment adds
 * them up: one visit per bill they were on; the bill's amount counts for the guest it was made out to.
 */
export function customerTotals(customerId: string, bills: PaidBillForStats[]) {
  const mine = bills.filter((b) => b.orders.some((o) => o.customerId === customerId));
  return {
    orderCount: mine.length,
    totalSpendPaise: mine
      .filter((b) => b.orders.some((o) => o.customerId === customerId && o.customerPhone === b.customerPhone))
      .reduce((s, b) => s + b.totalPaise, 0),
    lastVisitAt: mine.reduce<Date | null>((m, b) => (!m || b.paidAt > m ? b.paidAt : m), null),
  };
}
