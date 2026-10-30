import { z } from "zod";
import { rupeesToPaise } from "@/lib/validators/cash";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const OfferSchema = z
  .object({
    menuItemId: z.string().min(1, "Choose a dish").max(40),
    price: rupeesToPaise("Offer price"),
    title: z.string().trim().max(60, "Keep it under 60 characters").default(""),
    startsOn: day,
    endsOn: day,
  })
  .refine((o) => o.endsOn >= o.startsOn, {
    path: ["endsOn"],
    message: "The last day can't be before the first",
  });
