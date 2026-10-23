import "server-only";
import { unstable_cache } from "next/cache";
import { type GoogleReviews, parsePlace } from "@/lib/google-reviews";

const REFRESH_SECONDS = 3 * 60 * 60;

// a thrown error isn't cached, so a Google hiccup never sticks for 3 hours; the last good copy keeps showing
const fetchReviews = unstable_cache(
  async (placeId: string): Promise<GoogleReviews> => {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        // read here, not passed in: arguments become part of the cache key on disk
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY ?? "",
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return parsePlace(await res.json());
  },
  ["google-reviews"],
  { revalidate: REFRESH_SECONDS, tags: ["google-reviews"] },
);

/** null when not set up (no API key or Place ID) or Google can't be reached – the section then hides. */
export async function getGoogleReviews(placeId: string): Promise<GoogleReviews | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY || !placeId) return null;
  try {
    const data = await fetchReviews(placeId);
    return data.count > 0 ? data : null;
  } catch (e) {
    console.error("[google-reviews]", e instanceof Error ? e.message : e);
    return null;
  }
}
