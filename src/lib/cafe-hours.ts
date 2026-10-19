/**
 * Working hours utility for Healthy Hunger Café.
 * The café operates in Indian Standard Time (Asia/Kolkata, UTC+5:30).
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

/**
 * Parses time string like "7:30 am", "10:30 pm", "8 am", "22:00" into minutes from midnight.
 */
function parseTimeToMinutes(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parses days string like "Mon – Sat", "Sunday", "Mon - Sun", "Monday to Friday"
 * into an array of day integers (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 */
function parseDaysToIndices(raw: string): number[] {
  const s = raw.trim().toLowerCase();

  // All days / Daily
  if (
    s.includes("daily") ||
    s.includes("all day") ||
    s.includes("every day") ||
    s.includes("everyday") ||
    s === "mon - sun" ||
    s === "mon – sun" ||
    s === "monday - sunday" ||
    s === "monday – sunday"
  ) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  // Range: "Mon – Sat", "Mon - Sat", "Monday to Saturday"
  const rangeMatch = s.match(/^([a-z]+)\s*(?:–|—|-|to)\s*([a-z]+)$/);
  if (rangeMatch) {
    const startIdx = DAY_MAP[rangeMatch[1]];
    const endIdx = DAY_MAP[rangeMatch[2]];
    if (startIdx !== undefined && endIdx !== undefined) {
      const days: number[] = [];
      let cur = startIdx;
      while (true) {
        days.push(cur);
        if (cur === endIdx) break;
        cur = (cur + 1) % 7;
      }
      return days;
    }
  }

  // Comma-separated: "Mon, Wed, Fri"
  const parts = s.split(/[\s,]+/).filter(Boolean);
  const matched = parts
    .map((p) => DAY_MAP[p])
    .filter((idx): idx is number => idx !== undefined);

  if (matched.length > 0) {
    return matched;
  }

  // Single day match
  const single = DAY_MAP[s];
  if (single !== undefined) return [single];

  return [];
}

/**
 * Checks whether a given Date is currently within the café's working hours.
 * Uses IST (Asia/Kolkata) timezone.
 */
export function isWithinWorkingHours(
  schedules: CafeHourSchedule[] | null | undefined,
  now: Date = new Date()
): boolean {
  if (!schedules || schedules.length === 0) {
    // If no schedule configured, default to open
    return true;
  }

  try {
    // Extract current day, hour, and minute in Asia/Kolkata
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);

    const weekdayStr = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "";
    const currentHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const currentMinute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

    const currentDayIdx = DAY_MAP[weekdayStr];
    if (currentDayIdx === undefined) return true;

    const currentMinutes = currentHour * 60 + currentMinute;

    for (const schedule of schedules) {
      const applicableDays = parseDaysToIndices(schedule.days);
      if (!applicableDays.includes(currentDayIdx)) {
        continue;
      }

      // Parse time range, e.g. "7:30 am – 10:30 pm"
      const timeParts = schedule.time.split(/\s*(?:–|—|-|to)\s*/i);
      if (timeParts.length !== 2) continue;

      const startMin = parseTimeToMinutes(timeParts[0]);
      const endMin = parseTimeToMinutes(timeParts[1]);

      if (startMin === null || endMin === null) continue;

      if (startMin <= endMin) {
        // Standard daytime range (e.g., 7:30 AM to 10:30 PM)
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          return true;
        }
      } else {
        // Overnight range (e.g., 8:00 PM to 2:00 AM)
        if (currentMinutes >= startMin || currentMinutes <= endMin) {
          return true;
        }
      }
    }

    // Checked all schedules for today and none matched the current time
    return false;
  } catch (err) {
    console.error("Error evaluating working hours:", err);
    return true;
  }
}
