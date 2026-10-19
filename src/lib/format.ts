/** The café's time zone. Times are shown in it on every device, whatever the device's own clock zone. */
export const CAFE_TZ = "Asia/Kolkata";

// India is UTC+5:30 all year (no daylight saving).
const IST_OFFSET_MS = 330 * 60_000;

/** Midnight at the start of today in India, whatever time zone the server's clock is set to. */
export function startOfCafeDay(now: Date = new Date()) {
  const india = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate()) - IST_OFFSET_MS);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return inr.format(amount);
}
