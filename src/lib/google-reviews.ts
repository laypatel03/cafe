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
