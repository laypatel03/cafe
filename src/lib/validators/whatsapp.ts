import { z } from "zod";
import { rupeesToPaise } from "./cash";

/** Settings → WhatsApp: when due reminders go out. */
export const ReminderSettingsSchema = z.object({
  frequency: z.enum(["OFF", "WEEKLY", "MONTHLY"], { error: "Pick how often" }),
  weekday: z.coerce.number().int().min(0).max(6, "Pick a day of the week"),
  monthDay: z.coerce.number().int().min(1).max(28, "Pick a day from 1 to 28"),
  hour: z.coerce.number().int().min(0).max(23, "Pick an hour"),
  minAmount: rupeesToPaise("Minimum", { allowZero: true }),
});

/** Settings → WhatsApp → Messages: a new wording for one message, sent to Meta for review. */
export const TemplateTextSchema = z.object({
  key: z.enum(["bill", "dueReminder", "payLater", "paymentReceived", "welcome"]),
  body: z.string().trim().min(1, "Write the message").max(1024, "Keep it under 1,024 characters"),
  footer: z.string().trim().max(60, "Keep the footer under 60 characters").default(""),
});
