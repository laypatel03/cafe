"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError, assertUser } from "@/lib/auth/dal";
import { MENU_TAG } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { toPaise } from "@/lib/money";
import { deleteUpload, saveMenuPhoto } from "@/lib/uploads";
import {
  AddOnSchema,
  CategorySchema,
  fieldErrors,
  type FormState,
  MenuItemSchema,
  slugify,
} from "@/lib/validators/menu";

/** Refresh the public menu at once (read-your-own-writes) and the dashboard view. */
function menuChanged() {
  updateTag(MENU_TAG);
  revalidatePath("/admin/menu");
}

async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

/* ---------------------------- staff + owner ---------------------------- */

export async function setItemAvailable(id: string, available: boolean) {
  return guard(async () => {
    await assertUser();
    await db.menuItem.update({ where: { id }, data: { available } });
    menuChanged();
    return { ok: true as const };
  });
}

export async function setAddOnAvailable(id: string, available: boolean) {
  return guard(async () => {
    await assertUser();
    await db.addOn.update({ where: { id }, data: { available } });
    menuChanged();
    return { ok: true as const };
  });
}

/* ------------------------------ owner only ------------------------------ */

export async function saveMenuItem(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const parsed = MenuItemSchema.safeParse({
    ...Object.fromEntries(formData),
    addOnIds: formData.getAll("addOnIds"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, addOnIds, removePhoto, price, protein, ...data } = parsed.data;

  const existing = id ? await db.menuItem.findUnique({ where: { id }, select: { photo: true } }) : null;
  if (id && !existing) return { error: "This item no longer exists." };

  let photo: string | null | undefined;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    try {
      photo = await saveMenuPhoto(file);
    } catch (e) {
      return { error: (e as Error).message, fieldErrors: { photo: (e as Error).message } };
    }
  } else if (removePhoto) {
    photo = null;
  }

  const fields = {
    ...data,
    pricePaise: toPaise(price),
    proteinG: protein,
    ...(photo !== undefined && { photo }),
  };

  if (id) {
    await db.menuItem.update({
      where: { id },
      data: { ...fields, addOns: { set: addOnIds.map((a) => ({ id: a })) } },
    });
    if (photo !== undefined) await deleteUpload(existing?.photo);
  } else {
    const last = await db.menuItem.aggregate({
      where: { categoryId: data.categoryId },
      _max: { sortOrder: true },
    });
    await db.menuItem.create({
      data: {
        ...fields,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        addOns: { connect: addOnIds.map((a) => ({ id: a })) },
      },
    });
  }
  menuChanged();
  redirect("/admin/menu");
}

export async function deleteMenuItem(id: string) {
  return guard(async () => {
    await assertUser("OWNER");
    // past orders keep their copied name and price (OrderItem.menuItemId is set to null)
    const item = await db.menuItem.delete({ where: { id }, select: { photo: true } });
    await deleteUpload(item.photo);
    menuChanged();
    return { ok: true as const };
  });
}

type Direction = "up" | "down";

/** Swap with the neighbour, after normalising sort orders to 0..n-1. */
async function reorder(
  ids: string[],
  id: string,
  dir: Direction,
  write: (id: string, order: number) => Promise<unknown>,
) {
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((x, n) => write(x, n)));
}

export async function moveMenuItem(id: string, dir: Direction) {
  return guard(async () => {
    await assertUser("OWNER");
    const item = await db.menuItem.findUniqueOrThrow({ where: { id }, select: { categoryId: true } });
    const siblings = await db.menuItem.findMany({
      where: { categoryId: item.categoryId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await db.$transaction(async (tx) => {
      await reorder(
        siblings.map((s) => s.id),
        id,
        dir,
        (x, n) => tx.menuItem.update({ where: { id: x }, data: { sortOrder: n } }),
      );
    });
    menuChanged();
    return { ok: true as const };
  });
}

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, name } = parsed.data;

  if (id) {
    await db.category.update({ where: { id }, data: { name } });
  } else {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; await db.category.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    const last = await db.category.aggregate({ _max: { sortOrder: true } });
    await db.category.create({ data: { name, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  menuChanged();
  return { ok: true };
}

export async function setCategoryVisible(id: string, visible: boolean) {
  return guard(async () => {
    await assertUser("OWNER");
    await db.category.update({ where: { id }, data: { visible } });
    menuChanged();
    return { ok: true as const };
  });
}

export async function moveCategory(id: string, dir: Direction) {
  return guard(async () => {
    await assertUser("OWNER");
    const all = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await db.$transaction(async (tx) => {
      await reorder(
        all.map((c) => c.id),
        id,
        dir,
        (x, n) => tx.category.update({ where: { id: x }, data: { sortOrder: n } }),
      );
    });
    menuChanged();
    return { ok: true as const };
  });
}

export async function deleteCategory(id: string) {
  return guard(async () => {
    await assertUser("OWNER");
    const count = await db.menuItem.count({ where: { categoryId: id } });
    if (count > 0) return { error: `Move or delete its ${count} item${count > 1 ? "s" : ""} first.` };
    await db.category.delete({ where: { id } });
    menuChanged();
    return { ok: true as const };
  });
}

export async function saveAddOn(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const parsed = AddOnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, name, price, protein, kcal } = parsed.data;
  const data = { name, pricePaise: toPaise(price), proteinG: protein, kcal };
  if (id) {
    await db.addOn.update({ where: { id }, data });
  } else {
    const last = await db.addOn.aggregate({ _max: { sortOrder: true } });
    await db.addOn.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  menuChanged();
  return { ok: true };
}

export async function deleteAddOn(id: string) {
  return guard(async () => {
    await assertUser("OWNER");
    await db.addOn.delete({ where: { id } });
    menuChanged();
    return { ok: true as const };
  });
}
