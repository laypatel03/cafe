import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { AddOn, Category, MenuItem } from "@/lib/menu-types";
import { toRupees } from "@/lib/money";

/** Cache tags – server actions call updateTag() with these after every edit. */
export const MENU_TAG = "menu";
export const SETTINGS_TAG = "settings";

export const mediaUrl = (path: string | null | undefined) => (path ? `/media/${path}` : undefined);

export type PublicMenu = { categories: Category[]; items: MenuItem[]; addOns: AddOn[] };

/** Visible categories and items for the landing page and QR menu (sold-out items included). */
export const getPublicMenu = unstable_cache(
  async (): Promise<PublicMenu> => {
    const [categories, addOns] = await Promise.all([
      db.category.findMany({
        where: { visible: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { visible: true },
            orderBy: { sortOrder: "asc" },
            include: { addOns: { select: { id: true } } },
          },
        },
      }),
      db.addOn.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    return {
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
      items: categories.flatMap((c) =>
        c.items.map((m) => ({
          id: m.id,
          category: c.slug,
          name: m.name,
          description: m.description,
          ingredients: m.ingredients,
          price: toRupees(m.pricePaise),
          protein: m.proteinG,
          kcal: m.kcal,
          tags: m.isBestseller ? ["bestseller" as const] : [],
          isVeg: m.isVeg,
          available: m.available,
          photo: mediaUrl(m.photo),
          addOnIds: m.addOns.map((a) => a.id),
        })),
      ),
      addOns: addOns.map((a) => ({
        id: a.id,
        name: a.name,
        price: toRupees(a.pricePaise),
        protein: a.proteinG,
        kcal: a.kcal,
        available: a.available,
      })),
    };
  },
  ["public-menu-v3"],
  { tags: [MENU_TAG] },
);

export type CafeDetails = {
  name: string;
  tagline: string;
  address: string;
  mapUrl: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  hours: { days: string; time: string }[];
  orderingEnabled: boolean;
  /** the public Blog; off = guests get "not found" and no blog links */
  blogEnabled: boolean;
  taxBasisPoints: number;
  todaysPickId: string | null;
};

export const getCafeDetails = unstable_cache(
  async (): Promise<CafeDetails> => {
    const s = await db.cafeSettings.findUnique({ where: { id: 1 } });
    if (!s) throw new Error("Café settings missing – run `pnpm db:seed`.");
    return {
      name: s.name,
      tagline: s.tagline,
      address: s.address,
      mapUrl: s.mapUrl,
      phone: s.phone,
      whatsapp: s.whatsapp,
      instagram: s.instagram,
      hours: (s.hours as CafeDetails["hours"]) ?? [],
      orderingEnabled: s.orderingEnabled,
      blogEnabled: s.blogEnabled,
      taxBasisPoints: s.taxBasisPoints,
      todaysPickId: s.todaysPickId,
    };
  },
  ["cafe-details"],
  { tags: [SETTINGS_TAG] },
);
