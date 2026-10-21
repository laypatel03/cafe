import { describe, expect, it } from "vitest";

import { CafeDetailsSchema } from "@/lib/validators/settings";

const base = { name: "Healthy Hunger", hours: [] };
const parse = (extra: Record<string, string>) => CafeDetailsSchema.safeParse({ ...base, ...extra });

describe("CafeDetailsSchema", () => {
  it("accepts a GA4 Measurement ID, uppercased", () => {
    expect(parse({ gaMeasurementId: " g-ab12cd34ef " }).data?.gaMeasurementId).toBe("G-AB12CD34EF");
    expect(parse({ gaMeasurementId: "" }).data?.gaMeasurementId).toBe("");
  });

  it("rejects anything else, since the ID goes into an inline script", () => {
    for (const bad of ["UA-12345-1", "G-", "AB12CD34EF", "G-AB12'});alert(1)//", "G-AB 12"]) {
      expect(parse({ gaMeasurementId: bad }).success, bad).toBe(false);
    }
  });

  it("takes a 14-digit FSSAI licence, ignoring spaces", () => {
    expect(parse({ fssaiLicence: "1234 5678 9012 34" }).data?.fssaiLicence).toBe("12345678901234");
    expect(parse({ fssaiLicence: "12345" }).success).toBe(false);
  });
});
