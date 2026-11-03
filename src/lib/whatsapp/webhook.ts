// What WhatsApp tells us on the webhook: delivery status of our messages, and guests' replies
// (STOP / START). Pure (node:crypto only), so it's unit-tested.

import { createHmac, timingSafeEqual } from "node:crypto";

export type WaDelivery = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type WebhookEvents = {
  statuses: { waId: string; status: WaDelivery; error: string | null }[];
  /** 10-digit numbers that replied STOP (or START) */
  optOuts: string[];
  optIns: string[];
};

/** A later status never goes back to an earlier one (WhatsApp can send them out of order). */
export const DELIVERY_RANK: Record<WaDelivery | "SENDING", number> = {
  SENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

const STOP_WORDS = new Set(["stop", "unsubscribe", "stop messages"]);
const START_WORDS = new Set(["start", "subscribe"]);

/** Meta signs each call with the app secret: `X-Hub-Signature-256: sha256=<hex hmac of the raw body>`. */
export function verifySignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=") || !appSecret) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** "919876543210" → "9876543210"; anything that isn't an Indian mobile → null. */
export function localNumber(wa: string | undefined): string | null {
  const digits = (wa ?? "").replace(/\D/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

type Change = {
  value?: {
    statuses?: {
      id?: string;
      status?: string;
      errors?: { title?: string; message?: string; error_data?: { details?: string } }[];
    }[];
    messages?: { from?: string; type?: string; text?: { body?: string }; button?: { text?: string } }[];
  };
};

export function parseWebhook(body: unknown): WebhookEvents {
  const events: WebhookEvents = { statuses: [], optOuts: [], optIns: [] };
  const entries = (body as { entry?: { changes?: Change[] }[] })?.entry ?? [];
  for (const change of entries.flatMap((e) => e.changes ?? [])) {
    for (const st of change.value?.statuses ?? []) {
      const status = st.status?.toUpperCase();
      if (!st.id || !status || !(status in DELIVERY_RANK) || status === "SENDING") continue;
      const err = st.errors?.[0];
      events.statuses.push({
        waId: st.id,
        status: status as WaDelivery,
        error: err ? (err.error_data?.details ?? err.message ?? err.title ?? "Failed") : null,
      });
    }
    for (const m of change.value?.messages ?? []) {
      const phone = localNumber(m.from);
      const said = (m.text?.body ?? m.button?.text ?? "").trim().toLowerCase();
      if (!phone || !said) continue;
      if (STOP_WORDS.has(said)) events.optOuts.push(phone);
      else if (START_WORDS.has(said)) events.optIns.push(phone);
    }
  }
  return events;
}
