// The WhatsApp line on a Live orders card: what went to the guest for this bill and how it's doing,
// or why nothing went. Pure, so it's unit-tested and shared with the browser.

export type WaTone = "ok" | "wait" | "bad" | "off";
export type WaLine = { tone: WaTone; text: string };

type Kind = "BILL" | "DUE_REMINDER" | "PAY_LATER" | "PAYMENT_RECEIVED" | "WELCOME";
type Status = "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

const WHAT: Partial<Record<Kind, string>> = {
  BILL: "bill",
  PAYMENT_RECEIVED: "payment received",
  PAY_LATER: "pay-later thank-you",
};
const STATUS: Record<Status, { word: string; tone: WaTone }> = {
  SENDING: { word: "sending…", tone: "wait" },
  SENT: { word: "sent", tone: "wait" },
  DELIVERED: { word: "delivered", tone: "ok" },
  READ: { word: "read", tone: "ok" },
  FAILED: { word: "failed", tone: "bad" },
};

export function waLine(b: {
  /** the newest message for this bill, if any */
  msg: { kind: Kind; status: Status; error: string | null } | null;
  paid: boolean;
  payLater: boolean;
  /** when it was paid – a payment a moment ago may still be sending */
  paidAt: Date | null;
  now: Date;
  phone: boolean;
  optedOut: boolean;
  billsPaused: boolean;
  /** WhatsApp connected and "Send bills on WhatsApp" on */
  sending: boolean;
  payLaterReady: boolean;
}): WaLine | null {
  if (b.msg) {
    const s = STATUS[b.msg.status];
    const what = WHAT[b.msg.kind] ?? "message";
    return {
      tone: s.tone,
      text: `WhatsApp ${what}: ${s.word}${b.msg.status === "FAILED" && b.msg.error ? ` – ${b.msg.error}` : ""}`,
    };
  }
  // nothing is expected for a bill still waiting to be paid at the counter
  if (!b.paid && !b.payLater) return null;
  if (!b.phone) return { tone: "off", text: "WhatsApp: no phone number" };
  if (b.optedOut) return { tone: "off", text: "WhatsApp: the guest replied STOP" };
  if (b.billsPaused) return { tone: "off", text: "WhatsApp: bills are off for this guest" };
  if (!b.sending) return { tone: "off", text: "WhatsApp: bills are off (Settings → WhatsApp)" };
  if (!b.paid)
    return b.payLaterReady
      ? { tone: "wait", text: "WhatsApp thank-you goes after closing" }
      : { tone: "off", text: "WhatsApp: no pay-later thank-you (template not set)" };
  if (b.paidAt && b.now.getTime() - b.paidAt.getTime() < 2 * 60_000)
    return { tone: "wait", text: "WhatsApp: sending…" };
  return { tone: "off", text: "WhatsApp: not sent – use the WhatsApp button in Order history" };
}
