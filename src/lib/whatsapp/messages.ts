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
} as const;

export type WaTemplateKey = keyof typeof WA_TEMPLATES;

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

/** WhatsApp wants the number with the country code and no "+": 919876543210. */
export const waNumber = (phone: string) => `91${phone}`;

/** Opens WhatsApp on the counter phone with the guest and the text filled in (no attachment). */
export const waLink = (phone: string, text: string) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
