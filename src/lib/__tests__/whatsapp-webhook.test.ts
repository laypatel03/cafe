import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { localNumber, parseWebhook, verifySignature } from "@/lib/whatsapp/webhook";

const change = (value: object) => ({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ value }] }],
});

describe("WhatsApp webhook", () => {
  it("accepts only Meta's signature over the raw body", () => {
    const raw = '{"a":1}';
    const sig = `sha256=${createHmac("sha256", "s3cret").update(raw).digest("hex")}`;
    expect(verifySignature(raw, sig, "s3cret")).toBe(true);
    expect(verifySignature(raw + " ", sig, "s3cret")).toBe(false);
    expect(verifySignature(raw, sig, "other")).toBe(false);
    expect(verifySignature(raw, null, "s3cret")).toBe(false);
    expect(verifySignature(raw, "sha256=abc", "s3cret")).toBe(false);
  });

  it("reads delivery statuses with the failure reason", () => {
    const events = parseWebhook(
      change({
        statuses: [
          { id: "wamid.1", status: "delivered" },
          {
            id: "wamid.2",
            status: "failed",
            errors: [{ title: "x", error_data: { details: "Not a WhatsApp number" } }],
          },
          { id: "wamid.3", status: "deleted" },
        ],
      }),
    );
    expect(events.statuses).toEqual([
      { waId: "wamid.1", status: "DELIVERED", error: null },
      { waId: "wamid.2", status: "FAILED", error: "Not a WhatsApp number" },
    ]);
  });

  it("turns STOP and START replies into opt-outs and opt-ins", () => {
    const events = parseWebhook(
      change({
        messages: [
          { from: "919876543210", type: "text", text: { body: " Stop " } },
          { from: "918888888888", type: "button", button: { text: "START" } },
          { from: "917777777777", type: "text", text: { body: "stop by tomorrow" } },
        ],
      }),
    );
    expect(events.optOuts).toEqual(["9876543210"]);
    expect(events.optIns).toEqual(["8888888888"]);
  });

  it("ignores anything it doesn't know", () => {
    expect(parseWebhook(null)).toEqual({ statuses: [], optOuts: [], optIns: [] });
    expect(localNumber("14155550100")).toBeNull();
    expect(localNumber("9876543210")).toBe("9876543210");
  });
});
