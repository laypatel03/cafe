// Today's offers: a lower price on a dish for a run of café days. Pure, so it's unit-tested.

import type { MenuItem } from "@/lib/menu-types";

export type OfferRow = {
  menuItemId: string;
  pricePaise: number;
  title: string;
  /** yyyy-mm-dd, IST, inclusive */
  startsOn: string;
  endsOn: string;
};

export type ActiveOffer = { pricePaise: number; title: string; endsOn: string };

/** Offers running on `day`, one per dish (the lowest price if two overlap). */
export function offersOn(rows: OfferRow[], day: string): Map<string, ActiveOffer> {
  const active = new Map<string, ActiveOffer>();
  for (const r of rows) {
    if (r.startsOn > day || r.endsOn < day) continue;
    const best = active.get(r.menuItemId);
    if (!best || r.pricePaise < best.pricePaise)
      active.set(r.menuItemId, { pricePaise: r.pricePaise, title: r.title, endsOn: r.endsOn });
  }
  return active;
}

/** Price to charge: the offer when it is lower than the regular price. */
export function offerPrice(regularPaise: number, offer: ActiveOffer | undefined) {
  return offer && offer.pricePaise < regularPaise ? offer.pricePaise : regularPaise;
}

/**
 * Menu items as guests see them today: `price` is what they pay, `wasPrice` the regular price
 * when an offer applies (prices in rupees, as in the public menu).
 */
export function applyOffers(items: MenuItem[], active: Map<string, ActiveOffer>): MenuItem[] {
  return items.map((m) => {
    const offer = active.get(m.id);
    const regularPaise = Math.round(m.price * 100);
    const paise = offerPrice(regularPaise, offer);
    if (!offer || paise === regularPaise) return m;
    return {
      ...m,
      price: paise / 100,
      wasPrice: m.price,
      offer: { title: offer.title, endsOn: offer.endsOn },
    };
  });
}

/** "Today only", "Till tomorrow" or "Till 3 Nov" for an offer ending on `endsOn`. */
export function offerEndsLabel(endsOn: string, today: string) {
  if (endsOn <= today) return "Today only";
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (endsOn === tomorrow) return "Till tomorrow";
  const [ey, em, ed] = endsOn.split("-").map(Number);
  return `Till ${new Date(Date.UTC(ey, em - 1, ed)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
}
