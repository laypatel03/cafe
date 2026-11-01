// When due reminders go out: weekly on a weekday or monthly on a day, at an hour – all in café time
// (IST), whatever the server's clock zone. Pure, so it's unit-tested.

export type ReminderFrequency = "OFF" | "WEEKLY" | "MONTHLY";

export type ReminderSettings = {
  frequency: ReminderFrequency;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** 1–28, so every month has it */
  monthDay: number;
  /** 0–23 */
  hour: number;
};

// India is UTC+5:30 all year. Shifting by it lets the UTC getters read India's wall clock.
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** A missed run (server off, timer late) still sends within this long; after that it waits for the next one. */
export const CATCH_UP_MS = DAY_MS;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The latest scheduled moment at or before `now`, or null when reminders are off. */
export function lastScheduled(set: ReminderSettings, now: Date): Date | null {
  const t = new Date(now.getTime() + IST_MS);
  const [y, m, d] = [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()];
  let at: number;
  if (set.frequency === "WEEKLY") {
    const back = (t.getUTCDay() - set.weekday + 7) % 7;
    at = Date.UTC(y, m, d - back, set.hour);
    if (at > t.getTime()) at -= 7 * DAY_MS;
  } else if (set.frequency === "MONTHLY") {
    at = Date.UTC(y, m, set.monthDay, set.hour);
    if (at > t.getTime()) at = Date.UTC(y, m - 1, set.monthDay, set.hour);
  } else return null;
  return new Date(at - IST_MS);
}

/** The next scheduled moment after `now` (for "Next reminders: …" in Settings). */
export function nextScheduled(set: ReminderSettings, now: Date): Date | null {
  const last = lastScheduled(set, now);
  if (!last) return null;
  if (set.frequency === "WEEKLY") return new Date(last.getTime() + 7 * DAY_MS);
  const t = new Date(last.getTime() + IST_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, set.monthDay, set.hour) - IST_MS);
}

/** "yyyy-mm-dd" of a moment in café time. */
const istDay = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

/**
 * Whether reminders should go out now, and the period they belong to. Each guest gets at most one
 * reminder per period, so running this every hour (or twice by mistake) never sends twice.
 */
export function reminderDue(set: ReminderSettings, now: Date): { periodKey: string } | null {
  const last = lastScheduled(set, now);
  if (!last || now.getTime() - last.getTime() >= CATCH_UP_MS) return null;
  return { periodKey: `${set.frequency}:${istDay(last)}` };
}
