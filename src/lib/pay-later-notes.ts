// When the pay-later thank-you goes out: 30 minutes after the café closes that day, so a guest who
// put several bills on pay later gets one note for all of them. Pure, so it's unit-tested.

import { type CafeHourSchedule, closingMinutes } from "./cafe-hours";

export const AFTER_CLOSING_MIN = 30;
/** Closed that day, or no readable hours: send at 11 pm. */
export const FALLBACK_SEND_MIN = 23 * 60;

const IST_MS = 330 * 60_000;

/** The moment the note for pay-later bills of the café day starting at `dayStart` (IST midnight) goes out. */
export function payLaterSendAt(schedules: CafeHourSchedule[] | null | undefined, dayStart: Date): Date {
  const weekday = new Date(dayStart.getTime() + IST_MS).getUTCDay();
  const close = closingMinutes(schedules, weekday);
  const minutes = close === null ? FALLBACK_SEND_MIN : close + AFTER_CLOSING_MIN;
  return new Date(dayStart.getTime() + minutes * 60_000);
}
