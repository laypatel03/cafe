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
