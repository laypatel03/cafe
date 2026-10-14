"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { today } from "@/lib/data/cash";
import { db } from "@/lib/db";
import { CardFeesSchema, ExtraSaleSchema } from "@/lib/validators/money-book";
import { fieldErrors, type FormState } from "@/lib/validators/menu";

async function owner(): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const refresh = () => {
  revalidatePath("/admin/money");
  revalidatePath("/admin/cash");
};

/** A sale that didn't go through a bill. Cash ones also count toward that day's drawer. */
export async function addExtraSale(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = ExtraSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { day, method, amount, note } = parsed.data;
  if (day > today())
    return { error: "That date is in the future.", fieldErrors: { day: "Pick today or earlier" } };

  await db.extraSale.create({
    data: {
      // noon of that day, like back-dated expenses, so it always falls inside the café day
      soldAt: new Date(`${day}T12:00:00`),
      method,
      amountPaise: amount,
      note: note || null,
      createdById: me.id,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteExtraSale(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await owner();
  if ("error" in me) return { error: me.error };
  const parsed = z.string().min(1).max(40).safeParse(id);
  if (!parsed.success) return { error: "Sale not found." };
  const gone = await db.extraSale.deleteMany({ where: { id: parsed.data } });
  if (gone.count === 0) return { error: "That sale was already removed." };
  refresh();
  return { ok: true };
}

/** What the card machine provider keeps, as a percentage of each card payment. */
export async function saveCardFees(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CardFeesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db.cafeSettings.update({
    where: { id: 1 },
    data: { creditCardFeeBps: parsed.data.credit, debitCardFeeBps: parsed.data.debit },
  });
  refresh();
  return { ok: true };
}
