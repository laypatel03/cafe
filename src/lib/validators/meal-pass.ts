import { z } from "zod";
import { PAY_CHOICES } from "@/lib/payments";
import { rupeesToPaise } from "@/lib/validators/cash";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const count = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`)
    .max(200, `${label} looks too high`);
const categoryIds = z.array(z.string().min(1).max(40)).max(30);

/** One meal type, as the plan form sends it (rupees as typed). */
const MealPartSchema = z.object({
  name: z.string().trim().min(1, "Name this meal type").max(30, "Keep it under 30 characters"),
  meals: count("Meals").refine((n) => n > 0, "At least 1 meal"),
  categoryIds: categoryIds.min(1, "Tick at least one category"),
  cap: rupeesToPaise("Price limit"),
});

export const MealPlanSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Name the plan").max(60, "Keep the name under 60 characters"),
  price: rupeesToPaise("Price"),
  parts: z
    .array(MealPartSchema)
    .min(1, "Add at least one meal type")
    .max(6, "Up to 6 meal types")
    .refine(
      (parts) => new Set(parts.map((p) => p.name.toLowerCase())).size === parts.length,
      "Give each meal type its own name",
    ),
  days: z.coerce.number().int().min(1, "At least 1 day").max(90, "Up to 90 days"),
});

export const SellPassSchema = z.object({
  customerId: z.string().min(1).max(40),
  planId: z.string().min(1, "Choose a plan").max(40),
  method: z.enum(PAY_CHOICES, { error: "Choose how they paid" }),
  startsOn: day,
});

export const RefundPassSchema = z.object({
  passId: z.string().min(1).max(40),
  amount: rupeesToPaise("Refund"),
  method: z.enum(PAY_CHOICES, { error: "Choose how the money went back" }),
  note: z.string().trim().max(200).default(""),
});

export const MealPicksSchema = z
  .array(
    z.object({
      orderId: z.string().min(1).max(40),
      menuItemId: z.string().min(1).max(40),
      count: z.number().int().min(0).max(20),
    }),
  )
  .max(40);
