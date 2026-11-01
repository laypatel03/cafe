import { describe, expect, it } from "vitest";

import { ReminderSettingsSchema } from "@/lib/validators/whatsapp";

describe("reminder settings", () => {
  it("reads the form, with the minimum in paise", () => {
    expect(
      ReminderSettingsSchema.parse({
        frequency: "MONTHLY",
        weekday: "1",
        monthDay: "5",
        hour: "11",
        minAmount: "50",
      }),
    ).toEqual({ frequency: "MONTHLY", weekday: 1, monthDay: 5, hour: 11, minAmount: 5000 });
  });

  it("refuses a month day every month doesn't have, and a bad hour", () => {
    const bad = ReminderSettingsSchema.safeParse({
      frequency: "MONTHLY",
      weekday: "1",
      monthDay: "31",
      hour: "24",
      minAmount: "0",
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path[0])).toEqual(["monthDay", "hour"]);
  });
});
