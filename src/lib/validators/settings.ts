import { z } from "zod";
import { INDIAN_MOBILE } from "./phone";

const optional = <T extends z.ZodType<string, string>>(schema: T) => z.union([z.literal(""), schema]);

export const CafeDetailsSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  tagline: z.string().trim().max(60, "Keep the tagline under 60 characters").default(""),
  address: z.string().trim().max(200, "Keep the address under 200 characters").default(""),
  mapUrl: optional(z.url("Paste the full Google Maps link (starting with https://)")).default(""),
  phone: optional(
    z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{6,18}$/, "Enter a phone number, like +91 98000 00000"),
  ).default(""),
  whatsapp: optional(
    z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,15}$/, "WhatsApp number with country code, like 919800000000")),
  ).default(""),
  instagram: optional(
    z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, ""))
      .pipe(z.string().regex(/^[\w.]{1,30}$/, "Instagram username without @")),
  ).default(""),
  hours: z
    .array(z.object({ days: z.string().trim().max(30), time: z.string().trim().max(40) }))
    .max(7)
    .transform((rows) => rows.filter((r) => r.days || r.time)),
  todaysPickId: z.string().max(40).default(""),
});

export const StaffSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/, "3–32 lowercase letters, numbers, dots or dashes"),
  phone: optional(z.string().trim().regex(INDIAN_MOBILE, "10-digit mobile number")).default(""),
  role: z.enum(["STAFF", "OWNER"]).default("STAFF"),
});

export const PasswordChangeSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(10, "Use at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The two new passwords don't match", path: ["confirm"] });

/** Form fields hours.0.days, hours.0.time … → [{ days, time }]. */
export function hoursFromForm(formData: FormData) {
  const rows: { days: string; time: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const days = formData.get(`hours.${i}.days`);
    const time = formData.get(`hours.${i}.time`);
    if (days === null && time === null) break;
    rows.push({ days: String(days ?? ""), time: String(time ?? "") });
  }
  return rows;
}
