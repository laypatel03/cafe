import { describe, expect, it } from "vitest";

import { lastScheduled, nextScheduled, reminderDue, type ReminderSettings } from "@/lib/reminder-schedule";

// moments written in India time
const ist = (s: string) => new Date(`${s}+05:30`);
const weekly: ReminderSettings = { frequency: "WEEKLY", weekday: 1, monthDay: 1, hour: 11 }; // Monday 11:00
const monthly: ReminderSettings = { frequency: "MONTHLY", weekday: 1, monthDay: 5, hour: 9 };

describe("reminder schedule", () => {
  it("finds this week's Monday 11:00 once it has passed, else last week's", () => {
    // 2 Nov 2026 is a Monday
    expect(lastScheduled(weekly, ist("2026-11-02T11:30:00"))).toEqual(ist("2026-11-02T11:00:00"));
    expect(lastScheduled(weekly, ist("2026-11-02T10:59:00"))).toEqual(ist("2026-10-26T11:00:00"));
    expect(lastScheduled(weekly, ist("2026-11-07T08:00:00"))).toEqual(ist("2026-11-02T11:00:00"));
  });

  it("finds the monthly day in this month or the one before", () => {
    expect(lastScheduled(monthly, ist("2026-11-05T09:00:00"))).toEqual(ist("2026-11-05T09:00:00"));
    expect(lastScheduled(monthly, ist("2026-11-04T23:00:00"))).toEqual(ist("2026-10-05T09:00:00"));
    expect(lastScheduled(monthly, ist("2026-01-02T09:00:00"))).toEqual(ist("2025-12-05T09:00:00"));
  });

  it("is due from the set hour for one day, with a key for the period", () => {
    expect(reminderDue(weekly, ist("2026-11-02T11:00:00"))).toEqual({ periodKey: "WEEKLY:2026-11-02" });
    expect(reminderDue(weekly, ist("2026-11-03T10:30:00"))).toEqual({ periodKey: "WEEKLY:2026-11-02" });
    expect(reminderDue(weekly, ist("2026-11-03T11:00:00"))).toBeNull();
    expect(reminderDue(weekly, ist("2026-11-02T10:00:00"))).toBeNull();
    expect(reminderDue(monthly, ist("2026-11-05T12:00:00"))).toEqual({ periodKey: "MONTHLY:2026-11-05" });
  });

  it("never runs when reminders are off", () => {
    const off = { ...weekly, frequency: "OFF" as const };
    expect(reminderDue(off, ist("2026-11-02T11:00:00"))).toBeNull();
    expect(nextScheduled(off, new Date())).toBeNull();
  });

  it("gives the next time for Settings", () => {
    expect(nextScheduled(weekly, ist("2026-11-02T12:00:00"))).toEqual(ist("2026-11-09T11:00:00"));
    expect(nextScheduled(weekly, ist("2026-11-02T10:00:00"))).toEqual(ist("2026-11-02T11:00:00"));
    expect(nextScheduled(monthly, ist("2026-12-20T00:00:00"))).toEqual(ist("2027-01-05T09:00:00"));
  });
});
