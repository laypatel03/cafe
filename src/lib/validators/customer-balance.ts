import { z } from "zod";
import { MANUAL_KINDS } from "@/lib/customer-balance";
import { PAY_CHOICES } from "@/lib/payments";
import { rupeesToPaise } from "@/lib/validators/cash";

export const BalanceEntrySchema = z
  .object({
    customerId: z.string().min(1).max(40),
    kind: z.enum(MANUAL_KINDS, { error: "Choose what happened" }),
    amount: rupeesToPaise("Amount"),
    method: z.enum(PAY_CHOICES, { error: "Choose how the money changed hands" }).optional(),
    note: z.string().trim().max(200).default(""),
  })
  // "paid less" is only a debt – no money changed hands, so no method
  .transform((d) => (d.kind === "PAID_LESS" ? { ...d, method: undefined } : d))
  .refine((d) => d.kind === "PAID_LESS" || d.method, {
    path: ["method"],
    error: "Choose how the money changed hands",
  });

export const BalanceOrderIds = z.array(z.string().min(1).max(40)).min(1).max(20);

export const BalanceEntryId = z.string().min(1).max(40);
