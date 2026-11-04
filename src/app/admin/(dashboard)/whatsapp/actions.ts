"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Access, AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fieldErrors, type FormState } from "@/lib/validators/menu";
import { ReminderSettingsSchema, TemplateTextSchema } from "@/lib/validators/whatsapp";
import { submitTemplate } from "@/lib/whatsapp/templates";
import {
  sendBill,
  sendDueReminder,
  sendPayLaterNote,
  sendPaymentReceived,
  type SendResult,
  sendWelcome,
} from "@/lib/whatsapp/send";

type Result = { ok: true } | { error: string };

async function allowed(access: Access): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser(access);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const Id = z.string().min(1).max(40);

const refresh = () => {
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/customers", "layout");
};

/** Owner: "Send reminder now" on a customer's page – not counted as the week's / month's reminder. */
export async function sendReminderNow(customerId: string): Promise<SendResult> {
  const me = await allowed("OWNER");
  if ("error" in me) return { ok: false, error: me.error };
  const id = Id.safeParse(customerId);
  if (!id.success) return { ok: false, error: "Customer not found." };
  const res = await sendDueReminder(id.data, { auto: false, byId: me.id });
  refresh();
  return res;
}

/** Owner: send a failed message again (a new message, built from today's bill or dues). */
export async function retryWhatsApp(messageId: string): Promise<SendResult> {
  const me = await allowed("OWNER");
  if ("error" in me) return { ok: false, error: me.error };
  const id = Id.safeParse(messageId);
  if (!id.success) return { ok: false, error: "Message not found." };
  const msg = await db.whatsAppMessage.findUnique({ where: { id: id.data } });
  if (!msg) return { ok: false, error: "Message not found." };
  if (msg.status !== "FAILED") return { ok: false, error: "Only a failed message can be sent again." };
  const res =
    msg.kind === "WELCOME"
      ? msg.customerId
        ? await sendWelcome(msg.customerId, { auto: false, byId: me.id })
        : { ok: false as const, error: "The customer is gone." }
      : msg.kind === "PAYMENT_RECEIVED"
        ? await sendPaymentReceived(msg.billIds, { auto: false, byId: me.id })
        : msg.kind === "PAY_LATER"
          ? msg.billId
            ? await sendPayLaterNote(msg.billIds.length ? msg.billIds : [msg.billId], {
                auto: false,
                byId: me.id,
              })
            : { ok: false as const, error: "The bill is gone." }
          : msg.kind === "BILL"
            ? msg.billId
              ? await sendBill(msg.billId, { auto: false, byId: me.id })
              : { ok: false as const, error: "The bill is gone." }
            : msg.customerId
              ? await sendDueReminder(msg.customerId, { auto: false, byId: me.id })
              : { ok: false as const, error: "The customer is gone." };
  refresh();
  return res;
}

/** Owner: due reminders on or paused for one guest (bound to the customer on their page). */
export async function setRemindersOn(customerId: string, on: boolean): Promise<Result> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  const id = Id.safeParse(customerId);
  if (!id.success) return { error: "Customer not found." };
  await db.customer.update({ where: { id: id.data }, data: { remindersPaused: on !== true } });
  refresh();
  return { ok: true };
}

/** Owner, customer page: bills on WhatsApp (bill PDF, pay-later note, payment received) on or off for one guest. */
export async function setBillsOn(customerId: string, on: boolean): Promise<Result> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  const id = Id.safeParse(customerId);
  if (!id.success) return { error: "Customer not found." };
  await db.customer.update({ where: { id: id.data }, data: { waBillsPaused: on !== true } });
  refresh();
  return { ok: true };
}

/** Settings → WhatsApp: send each bill by itself when it's paid or put on pay later. */
export async function setWaBillsEnabled(enabled: boolean): Promise<Result> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { waBillsEnabled: enabled === true } });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Settings → WhatsApp: the first-visit welcome with the Google review link on or off. */
export async function setWaWelcomeEnabled(enabled: boolean): Promise<Result> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { waWelcomeEnabled: enabled === true } });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Settings → WhatsApp: how often due reminders go out, when, and from what amount. */
export async function saveReminderSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  const parsed = ReminderSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { frequency, weekday, monthDay, hour, minAmount } = parsed.data;
  await db.cafeSettings.update({
    where: { id: 1 },
    data: {
      dueReminders: frequency,
      reminderWeekday: weekday,
      reminderMonthDay: monthDay,
      reminderHour: hour,
      reminderMinPaise: minAmount,
    },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/whatsapp");
  return { ok: true };
}

/** Settings → WhatsApp → Messages: send a new wording to Meta. Guests get the old one until it's approved. */
export async function saveTemplateText(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await allowed("OWNER");
  if ("error" in me) return me;
  const parsed = TemplateTextSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const res = await submitTemplate(parsed.data.key, parsed.data.body, parsed.data.footer);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/settings");
  return { ok: true };
}
