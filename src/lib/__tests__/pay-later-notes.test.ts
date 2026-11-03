import { describe, expect, it } from "vitest";

import { closingMinutes } from "@/lib/cafe-hours";
import { payLaterSendAt } from "@/lib/pay-later-notes";

const hours = [
  { days: "Mon – Sat", time: "7:30 am – 10:30 pm" },
  { days: "Sunday", time: "8:00 am – 9:00 pm" },
];
// India midnight of a date
const day = (d: string) => new Date(`${d}T00:00:00+05:30`);
const ist = (s: string) => new Date(`${s}+05:30`);

describe("pay-later note time", () => {
  it("finds the closing time of a day, including split and overnight hours", () => {
    expect(closingMinutes(hours, 1)).toBe(22 * 60 + 30);
    expect(closingMinutes(hours, 0)).toBe(21 * 60);
    expect(closingMinutes([{ days: "Daily", time: "8 am – 2 pm & 5 pm – 10 pm" }], 3)).toBe(22 * 60);
    expect(closingMinutes([{ days: "Fri", time: "6 pm – 2 am" }], 5)).toBe(26 * 60);
    expect(closingMinutes([{ days: "Mon", time: "Closed" }], 1)).toBeNull();
    expect(closingMinutes([], 1)).toBeNull();
  });

  it("is 30 minutes after closing (2 Nov 2026 is a Monday, 1 Nov a Sunday)", () => {
    expect(payLaterSendAt(hours, day("2026-11-02"))).toEqual(ist("2026-11-02T23:00:00"));
    expect(payLaterSendAt(hours, day("2026-11-01"))).toEqual(ist("2026-11-01T21:30:00"));
  });

  it("runs into the next day for overnight hours, and falls back to 11 pm", () => {
    expect(payLaterSendAt([{ days: "Daily", time: "6 pm – 2 am" }], day("2026-11-02"))).toEqual(
      ist("2026-11-03T02:30:00"),
    );
    expect(payLaterSendAt([], day("2026-11-02"))).toEqual(ist("2026-11-02T23:00:00"));
  });
});
