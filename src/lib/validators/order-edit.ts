import { z } from "zod";
import { fromCafeInput } from "@/lib/order-edit";
import { PAY_CHOICES } from "@/lib/payments";
import { INDIAN_MOBILE } from "./phone";
import { SelectionLinesSchema } from "./selection";

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

const fields = {
  when,
  takeaway: z.boolean(),
  name: z.string().trim().min(2, "Enter the guest's name").max(60, "Keep the name under 60 characters"),
  phone: optionalPhone,
  note: z.string().trim().max(200, "Keep the note under 200 characters").default(""),
  items: SelectionLinesSchema.min(1, "Add at least one item"),
};

/** An order that already happened and was paid, added from Order history. */
export const PastOrderSchema = z.object({
  ...fields,
  method: z.enum(PAY_CHOICES, { error: "Pick how the guest paid" }),
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
