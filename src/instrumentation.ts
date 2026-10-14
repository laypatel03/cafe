/**
 * Runs once when the server starts. Dates across the app (today, this month, reports, money book)
 * are the café's local days, so the server works in Indian time even if the machine is set to UTC,
 * as cloud servers usually are. Without this, "this month" and "today" roll over at 5:30 am IST.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") process.env.TZ = "Asia/Kolkata";
}
