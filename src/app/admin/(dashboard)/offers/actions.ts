"use server";

import { revalidatePath, updateTag } from "next/cache";
import { AuthError, assertUser } from "@/lib/auth/dal";
import { today } from "@/lib/data/cash";
import { MENU_TAG } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { fieldErrors, type FormState } from "@/lib/validators/menu";
import { OfferSchema } from "@/lib/validators/offers";

async function allowed(): Promise<{ error: string } | null> {
  try {
    await assertUser("website");
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const changed = () => {
  updateTag(MENU_TAG);
  revalidatePath("/admin/offers");
};

/** New offer: a lower price on one dish for the chosen days. Orders on those days are charged it. */
export async function saveOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await allowed();
  if (denied) return denied;
  const parsed = OfferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const o = parsed.data;
  if (o.endsOn < today())
    return { error: "Please fix the highlighted fields.", fieldErrors: { endsOn: "This day has passed" } };
  const item = await db.menuItem.findUnique({
    where: { id: o.menuItemId },
    select: { pricePaise: true, visible: true },
  });
  if (!item || !item.visible)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { menuItemId: "Choose a dish on the menu" },
    };
  if (o.price >= item.pricePaise)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { price: `Must be less than the menu price (${formatINR(toRupees(item.pricePaise))})` },
    };
  await db.offer.create({
    data: {
      menuItemId: o.menuItemId,
      pricePaise: o.price,
      title: o.title,
      startsOn: o.startsOn,
      endsOn: o.endsOn,
    },
  });
  changed();
  return { ok: true };
}

/** Ends the offer straight away; orders already placed keep the price they were charged. */
export async function deleteOffer(id: string): Promise<{ ok: true } | { error: string }> {
  const denied = await allowed();
  if (denied) return denied;
  await db.offer.deleteMany({ where: { id } });
  changed();
  return { ok: true };
}
