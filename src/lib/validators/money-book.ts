import { z } from "zod";
import { PAY_CHOICES } from "@/lib/payments";
import { rupeesToPaise } from "@/lib/validators/cash";

/** A sale that didn't go through a bill, for one day. */
export const ExtraSaleSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  method: z.enum(PAY_CHOICES, { error: "Pick how the guest paid" }),
  amount: rupeesToPaise("Amount"),
  note: z.string().trim().max(120, "Keep the note under 120 characters").optional(),
});

/** "1.8" or "1.8%" → 180 basis points. Empty means 0. */
const percent = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v.replace(/[%\s]/g, "") === "" ? 0 : Number(v.replace(/[%\s]/g, ""))))
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .min(0, `${label} can't be negative`)
        .max(10, `${label} looks too high – card fees are usually under 3 %`),
    )
    .transform((v) => Math.round(v * 100));

export const CardFeesSchema = z.object({
  credit: percent("Credit card fee"),
  debit: percent("Debit card fee"),
});
