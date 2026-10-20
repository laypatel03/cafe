import { z } from "zod";
import { CustomLinesSchema } from "@/lib/custom-lines";
import { fromCafeInput } from "@/lib/order-edit";
import { PAY_CHOICES } from "@/lib/payments";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";
import { INDIAN_MOBILE } from "./phone";

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
  .pipe(
    z.union([
      z.literal(""),
      z.string().regex(INDIAN_MOBILE, "Enter a 10-digit mobile number, or leave it empty"),
    ]),
  )
  .default("");

/** When the order happened, in café time; not in the future (a minute's slack for clocks). */
const when = z
  .string()
  .transform((v, ctx) => {
    const d = fromCafeInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Pick the date and time of the order" });
      return z.NEVER;
    }
    return d;
  })
  .refine((d) => d.getTime() <= Date.now() + 60_000, "The date and time can't be in the future");

/** Item lines, each with an optional price the owner typed (₹ each, add-ons included) → paise. */
const EditLinesSchema = z
  .array(
    z.object({
      itemId: z.string().min(1).max(40),
      addOnIds: z.array(z.string().min(1).max(40)).max(10).default([]),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      unitPrice: z
        .number({ error: "Prices must be numbers" })
        .min(0, "Prices can't be negative")
        .max(100_000, "That price looks too high")
        .optional(),
    }),
  )
  .max(40)
  .transform((lines) =>
    lines.map(({ unitPrice, ...l }) => ({
      ...l,
      ...(unitPrice !== undefined && { unitPricePaise: Math.round(unitPrice * 100) }),
    })),
  );

const fields = {
  when,
  takeaway: z.boolean(),
  name: z.string().trim().min(2, "Enter the guest's name").max(60, "Keep the name under 60 characters"),
  phone: optionalPhone,
  note: z.string().trim().max(200, "Keep the note under 200 characters").default(""),
  items: EditLinesSchema,
  /** "Other item" lines the owner typed in; a minus price is a discount */
  others: CustomLinesSchema,
};

/** An order that already happened and was paid, added from Order history. */
export const PastOrderSchema = z.object({
  ...fields,
  method: z.enum(PAY_CHOICES, { error: "Pick how the guest paid" }),
});

/** Deleting an order from Order history: it stays visible, but leaves the money book. */
export const DeleteOrderSchema = z.object({
  orderId: z.string().min(1).max(40),
  reason: z
    .string()
    .trim()
    .min(3, "Say why the order is deleted")
    .max(200, "Keep the reason under 200 characters"),
});

/** Fixing an order in Order history. `method` only applies when its bill is paid. */
export const EditOrderSchema = z.object({
  ...fields,
  orderId: z.string().min(1).max(40),
  method: z.enum(PAY_CHOICES).optional(),
});

export type PastOrderInput = z.input<typeof PastOrderSchema>;
export type EditOrderInput = z.input<typeof EditOrderSchema>;

/** Adding a customer or fixing their details (Customers, when the owner switches it on). */
export const CustomerDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter the name").max(60, "Keep the name under 60 characters"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Enter a 10-digit mobile number")),
  email: z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.email("Check the email address").max(120, "Keep the email shorter")])),
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters").optional(),
});
