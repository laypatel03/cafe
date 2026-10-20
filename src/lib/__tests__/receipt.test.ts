import { describe, expect, it } from "vitest";

import { receiptMessage, smsLink } from "@/lib/receipt";

describe("receipt SMS", () => {
  it("thanks the guest and links the review page and menu", () => {
    expect(receiptMessage({ cafeName: "Healthy Hunger" })).toBe(
      "Thank you for visiting Healthy Hunger! 🥗 Enjoyed your meal? Please leave us a quick review: https://g.page/r/Cb44MqB8wgCAEBM/review · Menu: healthyhungercafe.com",
    );
  });

  it("builds an sms link with the Indian number and encoded text", () => {
    expect(smsLink("9876543210", "Bill #1 – ₹5 & more")).toBe(
      "sms:+919876543210?&body=Bill%20%231%20%E2%80%93%20%E2%82%B95%20%26%20more",
    );
  });
});
