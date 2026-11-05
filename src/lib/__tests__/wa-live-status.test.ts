import { describe, expect, it } from "vitest";
import { waLine } from "@/lib/whatsapp/live-status";

const now = new Date("2026-11-05T12:00:00Z");
const base = {
  msg: null,
  paid: true,
  payLater: false,
  paidAt: new Date("2026-11-05T11:00:00Z"),
  now,
  phone: true,
  optedOut: false,
  billsPaused: false,
  sending: true,
  payLaterReady: true,
};

describe("WhatsApp line on Live orders", () => {
  it("shows the message's status in words", () => {
    expect(waLine({ ...base, msg: { kind: "BILL", status: "READ", error: null } })).toEqual({
      tone: "ok",
      text: "WhatsApp bill: read",
    });
    expect(
      waLine({ ...base, msg: { kind: "PAYMENT_RECEIVED", status: "FAILED", error: "not on WhatsApp" } }),
    ).toEqual({ tone: "bad", text: "WhatsApp payment received: failed – not on WhatsApp" });
  });
  it("says why nothing went", () => {
    expect(waLine({ ...base, phone: false })?.text).toBe("WhatsApp: no phone number");
    expect(waLine({ ...base, optedOut: true })?.text).toMatch(/STOP/);
    expect(waLine({ ...base, billsPaused: true })?.text).toMatch(/off for this guest/);
    expect(waLine({ ...base, sending: false })?.text).toMatch(/Settings/);
    expect(waLine({ ...base })?.text).toMatch(/not sent/);
  });
  it("a payment a moment ago is still sending; a pay-later bill waits for closing", () => {
    expect(waLine({ ...base, paidAt: new Date("2026-11-05T11:59:30Z") })?.text).toBe("WhatsApp: sending…");
    expect(waLine({ ...base, paid: false, payLater: true, paidAt: null })?.text).toBe(
      "WhatsApp thank-you goes after closing",
    );
  });
  it("nothing for a bill still waiting to be paid at the counter", () => {
    expect(waLine({ ...base, paid: false, paidAt: null })).toBeNull();
  });
});
