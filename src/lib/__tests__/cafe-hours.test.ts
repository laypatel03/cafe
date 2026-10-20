import { describe, expect, it } from "vitest";

import { hoursRowError, isWithinWorkingHours } from "@/lib/cafe-hours";

// A moment in India time: 19 Oct 2026 is a Monday.
const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const MON = "2026-10-19";
const SAT = "2026-10-24";
const SUN = "2026-10-25";

const CAFE = [
  { days: "Mon – Sat", time: "7:30 am – 10:30 pm" },
  { days: "Sunday", time: "8:00 am – 9:00 pm" },
];

describe("isWithinWorkingHours", () => {
  it("is open inside the hours and closed outside, in India time", () => {
    expect(isWithinWorkingHours(CAFE, ist(MON, "07:29"))).toBe(false);
    expect(isWithinWorkingHours(CAFE, ist(MON, "07:30"))).toBe(true);
    expect(isWithinWorkingHours(CAFE, ist(MON, "22:29"))).toBe(true);
    expect(isWithinWorkingHours(CAFE, ist(MON, "22:30"))).toBe(false);
  });

  it("uses each day's own row", () => {
    expect(isWithinWorkingHours(CAFE, ist(SAT, "22:00"))).toBe(true);
    expect(isWithinWorkingHours(CAFE, ist(SUN, "22:00"))).toBe(false);
    expect(isWithinWorkingHours(CAFE, ist(SUN, "08:00"))).toBe(true);
  });

  it("follows the hours as soon as they change", () => {
    const later = [{ days: "Daily", time: "9 am – 11 pm" }];
    expect(isWithinWorkingHours(CAFE, ist(MON, "22:45"))).toBe(false);
    expect(isWithinWorkingHours(later, ist(MON, "22:45"))).toBe(true);
    expect(isWithinWorkingHours(later, ist(MON, "08:00"))).toBe(false);
  });

  it("reads the usual ways of writing times and days", () => {
    const at = (days: string, time: string, when: Date) => isWithinWorkingHours([{ days, time }], when);
    expect(at("Mon-Sat", "7.30am-10.30pm", ist(MON, "08:00"))).toBe(true);
    expect(at("Monday to Friday", "08:00 to 22:00", ist(MON, "21:59"))).toBe(true);
    expect(at("Mon – Fri, Sun", "noon – 9 pm", ist(SAT, "13:00"))).toBe(false);
    expect(at("Mon – Fri, Sun", "noon – 9 pm", ist(SUN, "13:00"))).toBe(true);
    expect(at("Daily", "8 am – midnight", ist(MON, "23:59"))).toBe(true);
  });

  it("handles a lunch break (two slots in one row)", () => {
    const split = [{ days: "Daily", time: "8 am – 2 pm, 5 pm – 10 pm" }];
    expect(isWithinWorkingHours(split, ist(MON, "13:00"))).toBe(true);
    expect(isWithinWorkingHours(split, ist(MON, "15:00"))).toBe(false);
    expect(isWithinWorkingHours(split, ist(MON, "18:00"))).toBe(true);
  });

  it("keeps late-night hours open past midnight, counted from the day they start", () => {
    const late = [{ days: "Sat", time: "6 pm – 2 am" }];
    expect(isWithinWorkingHours(late, ist(SAT, "23:00"))).toBe(true);
    expect(isWithinWorkingHours(late, ist(SUN, "01:00"))).toBe(true); // still Saturday night
    expect(isWithinWorkingHours(late, ist(SUN, "03:00"))).toBe(false);
    expect(isWithinWorkingHours(late, ist(SAT, "01:00"))).toBe(false); // Friday night isn't listed
  });

  it("is closed on a day marked Closed", () => {
    const hours = [...CAFE.slice(0, 1), { days: "Sunday", time: "Closed" }];
    expect(isWithinWorkingHours(hours, ist(SUN, "12:00"))).toBe(false);
  });

  it("stays open when there are no hours, or none it can read", () => {
    expect(isWithinWorkingHours([], ist(MON, "03:00"))).toBe(true);
    expect(isWithinWorkingHours([{ days: "weekdays", time: "morning" }], ist(MON, "03:00"))).toBe(true);
  });
});

describe("hoursRowError", () => {
  it("accepts rows it can read", () => {
    for (const row of [
      ...CAFE,
      { days: "Daily", time: "Closed" },
      { days: "Sat – Mon", time: "6 pm – 2 am" },
      { days: "Mon & Wed", time: "8 am – 2 pm & 5 pm – 10 pm" },
    ]) {
      expect(hoursRowError(row)).toBeNull();
    }
  });

  it("explains what it couldn't read", () => {
    expect(hoursRowError({ days: "Weekdays", time: "8 am – 9 pm" })).toMatch(/days "Weekdays"/);
    expect(hoursRowError({ days: "Mon – Sat", time: "8 – late" })).toMatch(/times "8 – late"/);
    expect(hoursRowError({ days: "Mon – Sat", time: "13 pm – 10 pm" })).toMatch(/times/);
    expect(hoursRowError({ days: "Mon – Sat", time: "" })).toMatch(/both/);
    expect(hoursRowError({ days: "Mon – Sat", time: "7:30 am – 7:30 am" })).toMatch(/same time/);
  });
});
