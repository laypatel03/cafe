import "server-only";
import { createWhatsAppClient, type WaConfig, type WhatsAppClient } from "./client";
import type { WaTemplateKey } from "./messages";

export * from "./client";
export * from "./messages";

/** The café's WhatsApp Cloud API number, from `.env`; null until it's set up (then: wa.me links). */
export function whatsappConfig(): WaConfig | null {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return null;
  const env = (k: string) => process.env[k]?.trim() || undefined;
  return {
    token,
    phoneNumberId,
    apiVersion: env("WHATSAPP_API_VERSION") ?? "v23.0",
    // sending picks a template by name + language (the template IDs in .env are for editing them later)
    templates: {
      bill: env("WHATSAPP_BILL_TEMPLATE"),
      dueReminder: env("WHATSAPP_REMINDER_TEMPLATE"),
      payLater: env("WHATSAPP_PAYLATER_TEMPLATE"),
      paymentReceived: env("WHATSAPP_PAYMENT_TEMPLATE"),
      welcome: env("WHATSAPP_WELCOME_TEMPLATE"),
    },
    language: env("WHATSAPP_TEMPLATE_LANGUAGE"),
  };
}

export const whatsappReady = () => whatsappConfig() !== null;

/** The pay-later thank-you goes out only once its template is approved and named in .env. */
export const payLaterTemplateReady = () => !!process.env.WHATSAPP_PAYLATER_TEMPLATE?.trim();

/** Same for "payment received" when pay-later bills are paid off. */
export const paymentTemplateReady = () => !!process.env.WHATSAPP_PAYMENT_TEMPLATE?.trim();

/** Same for the first-visit welcome with the Google review link. */
export const welcomeTemplateReady = () => !!process.env.WHATSAPP_WELCOME_TEMPLATE?.trim();

/** Template IDs from WhatsApp Manager – needed to see a template's status and to edit its wording. */
export function templateIds(): Partial<Record<WaTemplateKey, string>> {
  const env = (k: string) => process.env[k]?.trim() || undefined;
  return {
    bill: env("WHATSAPP_BILL_TEMPLATE_ID"),
    dueReminder: env("WHATSAPP_REMINDER_TEMPLATE_ID"),
    payLater: env("WHATSAPP_PAYLATER_TEMPLATE_ID"),
    paymentReceived: env("WHATSAPP_PAYMENT_TEMPLATE_ID"),
    welcome: env("WHATSAPP_WELCOME_TEMPLATE_ID"),
  };
}

/** WhatsApp Manager → Account tools → WhatsApp account ID; only needed to show what Meta charged. */
export const whatsappBusinessAccountId = () => process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null;

/** The client, or null when WhatsApp isn't set up. */
export function whatsapp(): WhatsAppClient | null {
  const config = whatsappConfig();
  return config ? createWhatsAppClient(config) : null;
}
