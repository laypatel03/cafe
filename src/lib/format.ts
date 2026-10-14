/** The café's time zone. Times are shown in it on every device, whatever the device's own clock zone. */
export const CAFE_TZ = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return inr.format(amount);
}
