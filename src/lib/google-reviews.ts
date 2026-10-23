// Turns a Google Places (New) response into what the home page shows. Pure, so it's unit-tested.

import { z } from "zod";

/** Only reviews with at least this many stars are shown; the overall rating and count stay Google's. */
export const MIN_SHOWN_RATING = 4;

/** Rating and up to 5 reviews from Google Places (New), refreshed every 3 hours. */
export type GoogleReviews = {
  rating: number;
  count: number;
  mapsUrl: string;
  reviews: {
    author: string;
    authorUrl: string;
    photo: string;
    rating: number;
    text: string;
    when: string;
  }[];
};

const PlaceSchema = z.object({
  rating: z.number().default(0),
  userRatingCount: z.number().int().default(0),
  googleMapsUri: z.string().default(""),
  reviews: z
    .array(
      z.object({
        rating: z.number().default(0),
        relativePublishTimeDescription: z.string().default(""),
        text: z.object({ text: z.string() }).optional(),
        originalText: z.object({ text: z.string() }).optional(),
        authorAttribution: z
          .object({
            displayName: z.string().default("Google user"),
            uri: z.string().default(""),
            photoUri: z.string().default(""),
          })
          .optional(),
      }),
    )
    .default([]),
});

const httpsOrEmpty = (url: string) => (url.startsWith("https://") ? url : "");

export function parsePlace(json: unknown): GoogleReviews {
  const p = PlaceSchema.parse(json);
  return {
    rating: p.rating,
    count: p.userRatingCount,
    mapsUrl: httpsOrEmpty(p.googleMapsUri),
    reviews: p.reviews
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google user",
        authorUrl: httpsOrEmpty(r.authorAttribution?.uri ?? ""),
        photo: httpsOrEmpty(r.authorAttribution?.photoUri ?? ""),
        rating: r.rating,
        text: (r.text ?? r.originalText)?.text.trim() ?? "",
        when: r.relativePublishTimeDescription,
      }))
      .filter((r) => r.text && r.rating >= MIN_SHOWN_RATING),
  };
}

export type Dish = { id: string; name: string };
/** A run of review text; `dish` is set when the run names a menu dish. */
export type ReviewPart = { text: string; dish?: string };
export type MarkedReview = GoogleReviews["reviews"][number] & { parts: ReviewPart[]; dishes: Dish[] };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds menu dish names in each review (whole words, any case) so they can be highlighted and
 * filtered. The text itself is never changed. `lovedFor` lists the dishes named, most-mentioned first.
 */
export function markDishes(reviews: GoogleReviews["reviews"], menu: Dish[]) {
  const byName = new Map(menu.filter((d) => norm(d.name).length >= 3).map((d) => [norm(d.name), d]));
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const re = names.length
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${names.map((n) => escape(n).replace(/ /g, "\\s+")).join("|")})(?![\\p{L}\\p{N}])`,
        "giu",
      )
    : null;

  const mentions = new Map<string, { dish: Dish; count: number }>();
  const marked: MarkedReview[] = reviews.map((r) => {
    const parts: ReviewPart[] = [];
    const dishes = new Map<string, Dish>();
    let last = 0;
    for (const m of re ? r.text.matchAll(re) : []) {
      const dish = byName.get(norm(m[0]))!;
      if (m.index > last) parts.push({ text: r.text.slice(last, m.index) });
      parts.push({ text: m[0], dish: dish.id });
      dishes.set(dish.id, dish);
      last = m.index + m[0].length;
    }
    if (last < r.text.length) parts.push({ text: r.text.slice(last) });
    for (const d of dishes.values()) {
      const e = mentions.get(d.id) ?? { dish: d, count: 0 };
      e.count++;
      mentions.set(d.id, e);
    }
    return { ...r, parts, dishes: [...dishes.values()] };
  });

  const lovedFor = [...mentions.values()].sort((a, b) => b.count - a.count).map((e) => e.dish);
  return { reviews: marked, lovedFor };
}
