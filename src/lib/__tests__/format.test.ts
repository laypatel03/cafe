import { describe, expect, it } from "vitest";

import { initials, startOfCafeDay } from "@/lib/format";

describe("startOfCafeDay", () => {
  it("is midnight in India, even when the server clock is UTC", () => {
    // 3:57 am on 20 Oct in India = 22:27 UTC on 19 Oct
    expect(startOfCafeDay(new Date("2026-10-19T22:27:00Z")).toISOString()).toBe("2026-10-19T18:30:00.000Z");
  });

  it("stays on the same India day until the next midnight there", () => {
    expect(startOfCafeDay(new Date("2026-10-20T18:29:59Z")).toISOString()).toBe("2026-10-19T18:30:00.000Z");
    expect(startOfCafeDay(new Date("2026-10-20T18:30:00Z")).toISOString()).toBe("2026-10-20T18:30:00.000Z");
  });
});

describe("initials", () => {
  it("takes the first and last name's first letters", () => {
    expect(initials("Aakash  Mehta")).toBe("AM");
    expect(initials("Pooja Rani Sharma")).toBe("PS");
    expect(initials("asha")).toBe("A");
    expect(initials(" ")).toBe("G");
  });
});
