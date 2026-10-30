import "server-only";
import { db } from "@/lib/db";
import { getTodaysOffers } from "@/lib/data/offers";
import { offerPrice } from "@/lib/offers";
import type { MenuItemPrice } from "@/lib/pricing";

/**
 * Current prices and availability for the given items, for `priceLines`. Today's offers apply
 * unless `offers` is false (the owner fixing a past order starts from regular prices).
 */
export async function loadMenuPrices(itemIds: string[], { offers = true } = {}) {
  const [items, active] = await Promise.all([
    db.menuItem.findMany({
      where: { id: { in: [...new Set(itemIds)] }, visible: true, category: { visible: true } },
      select: {
        id: true,
        name: true,
        pricePaise: true,
        available: true,
        addOns: { select: { id: true, name: true, pricePaise: true, available: true } },
      },
    }),
    offers ? getTodaysOffers() : new Map(),
  ]);
  return new Map<string, MenuItemPrice>(
    items.map((m) => [
      m.id,
      {
        name: m.name,
        pricePaise: offerPrice(m.pricePaise, active.get(m.id)),
        available: m.available,
        addOns: new Map(
          m.addOns.map((a) => [a.id, { name: a.name, pricePaise: a.pricePaise, available: a.available }]),
        ),
      },
    ]),
  );
}
