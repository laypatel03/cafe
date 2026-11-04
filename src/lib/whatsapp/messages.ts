// What the café sends on WhatsApp. Messages the café starts must use templates Meta has approved,
// so each body here is the exact text submitted to Meta ({{1}}, {{2}} … are filled in when sent).
// The same text, filled in, is used for the wa.me fallback. Pure, so it's unit-tested.

import type { PaymentMethod } from "@/generated/prisma/enums";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAYMENT_SHORT } from "@/lib/payments";

export const WA_LANGUAGE = "en";

/**
 * Template name (as created in WhatsApp Manager), its body and footer. Meta rejects a body that starts
 * or ends with a variable, or has two side by side, so fixed words sit around each one. Both have a
 * Document header. New lines are fine in the body (not in a parameter).
 */
export const WA_TEMPLATES = {
  bill: {
    name: "bill_receipt",
    body: [
      "Hi {{1}} 👋",
      "",
      "Thank you for eating with us at {{2}}! 🥗",
      "",
      "🧾 Bill #{{3}}",
      "💰 Total: {{4}}",
      "📌 Status: {{5}}",
      "",
      "Your bill is attached as a PDF. We hope to see you again soon! 💚",
    ].join("\n"),
    footer: "Eat well, live well",
  },
  dueReminder: {
    name: "due_reminder",
    body: [
      "Hi {{1}} 👋",
      "",
      "A gentle reminder from {{2}} 🥗",
      "",
      "💰 Amount due: {{3}}",
      "🧾 For: {{4}}",
      "",
      "The details are attached as a PDF. You can pay at the counter on your next visit.",
      "",
      "Thank you for being with us! 💚",
    ].join("\n"),
    footer: "Reply STOP to stop these reminders",
  },
  // sent when a bill goes on pay later – no header, no PDF; the weekly reminder lists what's owed
  payLater: {
    name: "pay_later_thanks",
    body: [
      "Hi {{1}} 👋",
      "",
      "Thank you for eating with us at {{2}}! 🥗 We hope you enjoyed your meal.",
      "",
      "🧾 {{3}} has been added to your account, to pay on your next visit.",
      "",
      "See you again soon! 💚",
    ].join("\n"),
    footer: "Eat well, live well",
  },
  // pay-later bills paid off – one message for the whole payment, receipt PDF in the header
  paymentReceived: {
    name: "payment_received",
    body: [
      "Hi {{1}} 👋",
      "",
      "Thank you! We've received {{2}} for {{3}} at {{4}}. 🙏",
      "",
      "💰 Still to pay: {{5}}",
      "",
      "Your receipt is attached as a PDF. See you again soon! 💚",
    ].join("\n"),
    footer: "Eat well, live well",
  },
  // once per guest, an hour after their first visit – asks for a Google review (no header, no PDF)
  welcome: {
    name: "welcome_review",
    body: [
      "Hi {{1}} 👋",
      "",
      "Thank you for visiting {{2}} for the first time! 🥗 We hope you loved your meal.",
      "",
      "If you have a minute, a Google review helps a small café like ours a lot ⭐",
      "👉 {{3}}",
      "",
      "See you again soon! 💚",
    ].join("\n"),
    footer: "Reply STOP to stop messages",
  },
} as const;

export type WaTemplateKey = keyof typeof WA_TEMPLATES;

/**
 * For editing the messages in Settings: a name, what each {{n}} is filled with, sample values Meta
 * reviews with, and whether the template carries a PDF heading.
 */
export const WA_TEMPLATE_INFO: Record<
  WaTemplateKey,
  { label: string; vars: string[]; samples: string[]; pdf: boolean }
> = {
  bill: {
    label: "Bill (paid at the counter)",
    vars: ["guest's first name", "café name", "bill number", "total", "paid by …"],
    samples: ["Ravi", "Healthy Hunger", "14", "₹418", "Paid by cash"],
    pdf: true,
  },
  dueReminder: {
    label: "Due reminder",
    vars: ["guest's first name", "café name", "amount due", "how many orders"],
    samples: ["Ravi", "Healthy Hunger", "₹1,509", "2 orders"],
    pdf: true,
  },
  payLater: {
    label: "Pay later thank-you",
    vars: ["guest's first name", "café name", "amount added to their account"],
    samples: ["Ravi", "Healthy Hunger", "₹418"],
    pdf: false,
  },
  paymentReceived: {
    label: "Payment received",
    vars: ["guest's first name", "amount received", "how many bills", "café name", "still to pay"],
    samples: ["Ravi", "₹815", "2 bills", "Healthy Hunger", "₹328"],
    pdf: true,
  },
  welcome: {
    label: "Welcome (first visit)",
    vars: ["guest's first name", "café name", "Google review link"],
    samples: [
      "Ravi",
      "Healthy Hunger",
      "https://search.google.com/local/writereview?placeid=ChIJ9A5uLXt4DsRvjgyoHzCAIA",
    ],
    pdf: false,
  },
};

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

/**
 * Why Meta would refuse an edited body/footer, in plain words – or null when it's fine. The same
 * {{1}}…{{n}} must stay (the app fills them in), each once; not first or last, never side by side.
 */
export function checkTemplateText(key: WaTemplateKey, body: string, footer: string): string | null {
  const n = WA_TEMPLATE_INFO[key].vars.length;
  const text = body.trim();
  if (!text) return "The message can't be empty.";
  if (text.length > 1024) return "The message is too long – keep it under 1,024 characters.";
  const used = [...text.matchAll(PLACEHOLDER)].map((m) => Number(m[1]));
  for (let i = 1; i <= n; i++) {
    const count = used.filter((u) => u === i).length;
    if (count === 0) return `{{${i}}} (${WA_TEMPLATE_INFO[key].vars[i - 1]}) is missing.`;
    if (count > 1) return `{{${i}}} is used twice – keep each one once.`;
  }
  const extra = used.find((u) => u < 1 || u > n);
  if (extra !== undefined) return `{{${extra}}} isn't one of this message's blanks ({{1}}–{{${n}}}).`;
  if (/^\{\{\d+\}\}/.test(text) || /\{\{\d+\}\}$/.test(text))
    return "The message can't start or end with a {{blank}} – put words before and after it.";
  if (/\}\}\s*\{\{/.test(text)) return "Two {{blanks}} can't sit side by side – put words between them.";
  if (/\{\{|\}\}|\{\s*\d+\s*\}/.test(text.replace(PLACEHOLDER, "")))
    return "Write the blanks exactly like {{1}} – two curly brackets on each side.";
  if (footer.length > 60) return "The footer is too long – keep it under 60 characters.";
  if (/\{\{/.test(footer)) return "The footer can't have {{blanks}}.";
  return null;
}

/** A filled-in template: what the API gets (params) and what a person reads (text). */
export type WaMessage = { template: WaTemplateKey; params: string[]; text: string };

/**
 * Meta refuses parameters with new lines, tabs or more than four spaces in a row, and empty ones.
 */
export function cleanParam(value: string, fallback = "–") {
  const v = value.replace(/\s+/g, " ").trim().slice(0, 120);
  return v || fallback;
}

export function fillTemplate(body: string, params: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (m, n: string) => params[Number(n) - 1] ?? m);
}

function message(template: WaTemplateKey, params: string[]): WaMessage {
  return { template, params, text: fillTemplate(WA_TEMPLATES[template].body, params) };
}

/** "Asha Mehta" → "Asha"; a missing name → "there" ("Hi there"). */
const firstName = (name: string) => cleanParam(name.trim().split(/\s+/)[0] ?? "", "there");
const rupees = (paise: number) => formatINR(toRupees(paise));

export type BillStatus = { kind: "PAID"; method: PaymentMethod | null } | { kind: "PAY_LATER" };

export function billMessage(bill: {
  guestName: string;
  cafeName: string;
  number: number;
  totalPaise: number;
  status: BillStatus;
}): WaMessage {
  const status =
    bill.status.kind === "PAY_LATER"
      ? "Pay later – added to your dues"
      : bill.status.method
        ? `Paid by ${PAYMENT_SHORT[bill.status.method]}`
        : "Paid";
  return message("bill", [
    firstName(bill.guestName),
    cleanParam(bill.cafeName),
    String(bill.number),
    rupees(bill.totalPaise),
    status,
  ]);
}

export function dueReminderMessage(due: {
  guestName: string;
  cafeName: string;
  duePaise: number;
  orders: number;
}): WaMessage {
  return message("dueReminder", [
    firstName(due.guestName),
    cleanParam(due.cafeName),
    rupees(due.duePaise),
    `${due.orders} ${due.orders === 1 ? "order" : "orders"}`,
  ]);
}

export function payLaterMessage(bill: {
  guestName: string;
  cafeName: string;
  totalPaise: number;
}): WaMessage {
  return message("payLater", [firstName(bill.guestName), cleanParam(bill.cafeName), rupees(bill.totalPaise)]);
}

export function paymentReceivedMessage(p: {
  guestName: string;
  cafeName: string;
  receivedPaise: number;
  bills: number;
  stillDuePaise: number;
}): WaMessage {
  return message("paymentReceived", [
    firstName(p.guestName),
    rupees(p.receivedPaise),
    `${p.bills} ${p.bills === 1 ? "bill" : "bills"}`,
    cleanParam(p.cafeName),
    p.stillDuePaise > 0 ? rupees(p.stillDuePaise) : "nothing – all paid up ✅",
  ]);
}

/** Opens Google's "write a review" box for the café (Settings → Café → Google Place ID). */
export const googleReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`;

export function welcomeMessage(w: { guestName: string; cafeName: string; reviewUrl: string }): WaMessage {
  return message("welcome", [firstName(w.guestName), cleanParam(w.cafeName), cleanParam(w.reviewUrl, "")]);
}

/** WhatsApp wants the number with the country code and no "+": 919876543210. */
export const waNumber = (phone: string) => `91${phone}`;

/** Opens WhatsApp on the counter phone with the guest and the text filled in (no attachment). */
export const waLink = (phone: string, text: string) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
