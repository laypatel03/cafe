/**
 * Opening hours, as the owner types them in Settings ("Mon – Sat" / "7:30 am – 10:30 pm"), and
 * whether guests can order right now. The café runs on Indian Standard Time (Asia/Kolkata).
 * Pure, so it's unit-tested; Settings refuses hours this file can't read.
 */

export type CafeHourSchedule = {
  days: string;
  time: string;
};

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DASH = /\s*(?:–|—|-|\bto\b)\s*/i;
// "Mon – Fri, Sun" · "8 am – 2 pm & 5 pm – 10 pm"
const LIST = /\s*(?:,|&|\band\b)\s*/i;

/** "7:30 am", "7.30pm", "8 am", "22:00", "noon", "midnight" → minutes after midnight. */
function parseTime(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (s === "noon" || s === "12 noon") return 12 * 60;
  if (s === "midnight" || s === "12 midnight") return 24 * 60;
  const m = s.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)?$/);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3]?.replace(/\./g, "");
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "pm" ? 12 : 0);
  } else if (hours > 24 || (hours === 24 && minutes > 0)) {
    return null;
  }
  return hours * 60 + minutes;
}

/** "Mon – Sat", "Sunday", "Daily", "Mon – Fri, Sun" → day numbers (0 = Sunday). */
function parseDays(raw: string): number[] | null {
  const s = raw.trim().toLowerCase().replace(/\./g, "");
  if (/^(daily|every ?day|all days|all week|7 days)$/.test(s)) return ALL_DAYS;
  const days = new Set<number>();
  for (const part of s.split(LIST)) {
    if (!part) continue;
    const ends = part.split(DASH);
    if (ends.length === 1 && DAY_MAP[part] !== undefined) {
      days.add(DAY_MAP[part]);
    } else if (ends.length === 2 && DAY_MAP[ends[0]] !== undefined && DAY_MAP[ends[1]] !== undefined) {
      // wraps round the week, so "Sat – Mon" works too
      for (let d = DAY_MAP[ends[0]]; ; d = (d + 1) % 7) {
        days.add(d);
        if (d === DAY_MAP[ends[1]]) break;
      }
    } else {
      return null;
    }
  }
  return days.size > 0 ? [...days] : null;
}

/** "7:30 am – 10:30 pm", "8 am – 2 pm, 5 pm – 10 pm", "Closed" → [open, close] pairs in minutes. */
function parseTimes(raw: string): [number, number][] | null {
  const s = raw.trim().toLowerCase();
  if (s === "closed") return [];
  const ranges: [number, number][] = [];
  for (const part of s.split(LIST)) {
    const ends = part.split(DASH);
    if (ends.length !== 2) return null;
    const open = parseTime(ends[0]);
    const close = parseTime(ends[1]);
    if (open === null || close === null || open === close) return null;
    ranges.push([open, close]);
  }
  return ranges.length > 0 ? ranges : null;
}

type ParsedRow = { days: number[]; ranges: [number, number][] };

function parseRow(row: CafeHourSchedule): ParsedRow | null {
  const days = parseDays(row.days);
  const ranges = parseTimes(row.time);
  return days && ranges ? { days, ranges } : null;
}

/** What's wrong with one row of opening hours, in the owner's words – or null when it's fine. */
export function hoursRowError(row: CafeHourSchedule): string | null {
  if (!row.days.trim() || !row.time.trim()) return "Fill in both the days and the times.";
  if (!parseDays(row.days)) {
    return `Couldn't read the days "${row.days}". Write them like "Mon – Sat", "Sunday" or "Daily".`;
  }
  if (!parseTimes(row.time)) {
    const sameTime = row.time.split(LIST).some((part) => {
      const ends = part.split(DASH).map(parseTime);
      return ends.length === 2 && ends[0] !== null && ends[0] === ends[1];
    });
    if (sameTime) return `"${row.time}" opens and closes at the same time. Put the closing time second.`;
    return `Couldn't read the times "${row.time}". Write them like "7:30 am – 10:30 pm", or "Closed".`;
  }
  return null;
}

/** Day of the week (0 = Sunday) and minutes after midnight, in India. */
function indiaNow(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: DAY_MAP[get("weekday").toLowerCase()] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Can guests order now, by the opening hours? No hours (or none readable) means always open, so a
 * typo never locks guests out. A range that runs past midnight ("6 pm – 2 am") belongs to the day
 * it starts on.
 */
export function isWithinWorkingHours(
  schedules: CafeHourSchedule[] | null | undefined,
  now: Date = new Date(),
): boolean {
  const rows = (schedules ?? []).map(parseRow).filter((r) => r !== null);
  if (rows.length === 0) return true;

  const { day, minutes } = indiaNow(now);
  const yesterday = (day + 6) % 7;
  return rows.some((row) =>
    row.ranges.some(([open, close]) => {
      if (open < close) return row.days.includes(day) && minutes >= open && minutes < close;
      // overnight: the evening part today, or the after-midnight part of yesterday's hours
      return (row.days.includes(day) && minutes >= open) || (row.days.includes(yesterday) && minutes < close);
    }),
  );
}
