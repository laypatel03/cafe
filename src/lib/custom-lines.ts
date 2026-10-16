// "Other item" lines the owner types in instead of picking a dish – a negative price is a discount.
// Pure, so it's unit-tested. All money in paise.

import { z } from "zod";
import { MAX_LINE_QUANTITY, type PricedLine } from "@/lib/pricing";

const MAX_RUPEES = 100_000;

/** Other items as the browser sends them: ₹ each, plus or minus. */
export const CustomLinesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(2, "Name the other item").max(60, "Keep the item name under 60 characters"),
      unitPrice: z
        .number({ error: "Prices must be numbers" })
        .min(-MAX_RUPEES, "That discount looks too big")
        .max(MAX_RUPEES, "That price looks too high")
        .refine((n) => n !== 0, "Give the other item a price – use a minus for a discount"),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }),
  )
  .max(10, "Up to 10 other items on one order")
  .default([]);

export type CustomLineInput = NonNullable<z.input<typeof CustomLinesSchema>>[number];

/** An OrderItem row as it is saved. */
export type OrderItemRow = Omit<PricedLine, "menuItemId"> & { menuItemId: string | null; custom: boolean };

export const customRows = (lines: z.output<typeof CustomLinesSchema>): OrderItemRow[] =>
  lines.map((l) => {
    const unitPricePaise = Math.round(l.unitPrice * 100);
    return {
      menuItemId: null,
      itemName: l.name,
      addOns: [],
      unitPricePaise,
      quantity: l.quantity,
      lineTotalPaise: unitPricePaise * l.quantity,
      custom: true,
    };
  });

/** Dishes then other items, with their subtotal – which a discount can't take below ₹0. */
export function orderRows(
  dishes: PricedLine[],
  others: OrderItemRow[],
): { ok: true; rows: OrderItemRow[]; subtotalPaise: number } | { ok: false; error: string } {
  const rows = [...dishes.map((d) => ({ ...d, custom: false })), ...others];
  if (rows.length === 0) return { ok: false, error: "Add at least one item." };
  const subtotalPaise = rows.reduce((s, r) => s + r.lineTotalPaise, 0);
  if (subtotalPaise < 0)
    return { ok: false, error: "The discount is bigger than the order – the total can't go below ₹0." };
  return { ok: true, rows, subtotalPaise };
}
