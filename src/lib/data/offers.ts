import "server-only";
import { unstable_cache } from "next/cache";
import { today } from "@/lib/data/cash";
import { getPublicMenu, MENU_TAG } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { applyOffers, type OfferRow, offersOn } from "@/lib/offers";

// keyed by day, so the next day's offers show without anyone saving; offer edits clear it via MENU_TAG
const offerRows = unstable_cache(
  async (day: string): Promise<OfferRow[]> =>
    db.offer.findMany({
      where: {
        startsOn: { lte: day },
        endsOn: { gte: day },
        menuItem: { visible: true, category: { visible: true } },
      },
      select: { menuItemId: true, pricePaise: true, title: true, startsOn: true, endsOn: true },
    }),
  ["offers-v1"],
  { tags: [MENU_TAG] },
);

/** Offers running today, one per dish. */
export async function getTodaysOffers(day = today()) {
  return offersOn(await offerRows(day), day);
}

/** The public menu with today's offer prices applied (`price` = what guests pay, `wasPrice` = regular). */
export async function getMenuWithOffers() {
  const day = today();
  const [menu, offers] = await Promise.all([getPublicMenu(), getTodaysOffers(day)]);
  return { ...menu, items: applyOffers(menu.items, offers), today: day };
}
