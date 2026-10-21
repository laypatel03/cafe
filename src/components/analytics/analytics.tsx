import { getCafeDetails } from "@/lib/data/menu";
import { SiteAnalytics } from "./site-analytics";

/** Loads Google Analytics once the owner adds a Measurement ID in Settings. */
export async function Analytics() {
  // analytics must never break a page, e.g. before the database is seeded
  const gaId = await getCafeDetails()
    .then((c) => c.gaMeasurementId)
    .catch(() => "");
  return gaId ? <SiteAnalytics gaId={gaId} /> : null;
}
