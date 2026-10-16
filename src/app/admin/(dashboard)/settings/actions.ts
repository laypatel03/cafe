"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { SETTINGS_TAG } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { fieldErrors, type FormState } from "@/lib/validators/menu";
import {
  CafeDetailsSchema,
  hoursFromForm,
  PasswordChangeSchema,
  StaffSchema,
} from "@/lib/validators/settings";

type Result = { ok: true } | { error: string };

async function owner(): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const newPassword = () => randomBytes(9).toString("base64url");

/* ------------------------------- café ------------------------------- */

export async function saveCafeDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CafeDetailsSchema.safeParse({
    ...Object.fromEntries(formData),
    hours: hoursFromForm(formData),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { todaysPickId, ...data } = parsed.data;

  if (
    todaysPickId &&
    !(await db.menuItem.findFirst({ where: { id: todaysPickId, visible: true }, select: { id: true } }))
  ) {
    return {
      error: "That item is hidden or was deleted.",
      fieldErrors: { todaysPickId: "Pick a visible item" },
    };
  }
  await db.cafeSettings.update({ where: { id: 1 }, data: { ...data, todaysPickId: todaysPickId || null } });
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/settings");
  return { ok: true };
}

/* ------------------------------ editing ------------------------------ */

/** Settings → Editing: guests can pick and order on the QR menu (off = view-only menu). */
export async function setOrderingEnabled(enabled: boolean): Promise<Result> {
  const me = await owner();
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { orderingEnabled: enabled === true } });
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Settings → Editing: show the Blog pages and links to guests. */
export async function setBlogEnabled(enabled: boolean): Promise<Result> {
  const me = await owner();
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { blogEnabled: enabled === true } });
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Settings → Editing: allow adding and changing orders in Order history. */
export async function setOrderEdits(enabled: boolean): Promise<Result> {
  const me = await owner();
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { orderEditsEnabled: enabled === true } });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Settings → Editing: allow adding customers and changing their name, phone and email. */
export async function setCustomerEdits(enabled: boolean): Promise<Result> {
  const me = await owner();
  if ("error" in me) return me;
  await db.cafeSettings.update({ where: { id: 1 }, data: { customerEditsEnabled: enabled === true } });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/customers", "layout");
  return { ok: true };
}

/* ------------------------------- staff ------------------------------- */

export type StaffFormState = (FormState & { password?: string; username?: string }) | undefined;

export async function createStaff(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = StaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { name, username, phone, role } = parsed.data;
  const password = newPassword();
  try {
    await db.staffUser.create({
      data: { name, username, phone: phone || null, role, passwordHash: await hashPassword(password) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        error: "That username or phone number is already used.",
        fieldErrors: { username: "Already used" },
      };
    }
    throw e;
  }
  revalidatePath("/admin/settings");
  return { ok: true, password, username };
}

/** New random password; bumping sessionVersion logs them out everywhere. */
export async function resetStaffPassword(id: string): Promise<{ password: string } | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  if (id === me.id) return { error: "Change your own password under “My password”." };
  const password = newPassword();
  await db.staffUser.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
  });
  revalidatePath("/admin/settings");
  return { password };
}

export async function setStaffActive(id: string, active: boolean): Promise<Result> {
  const me = await owner();
  if ("error" in me) return me;
  if (id === me.id) return { error: "You can't switch off your own login." };
  if (!active) {
    const target = await db.staffUser.findUnique({ where: { id }, select: { role: true } });
    const owners = await db.staffUser.count({ where: { role: "OWNER", active: true } });
    if (target?.role === "OWNER" && owners <= 1) return { error: "Keep at least one active owner." };
  }
  await db.staffUser.update({ where: { id }, data: { active, sessionVersion: { increment: 1 } } });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/* ---------------------------- my password ---------------------------- */

export async function changeMyPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = PasswordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const user = await db.staffUser.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) {
    return { error: "Your current password is wrong.", fieldErrors: { current: "Wrong password" } };
  }
  const updated = await db.staffUser.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.next), sessionVersion: { increment: 1 } },
  });
  // other devices are logged out; this one gets a fresh session
  await createSession({ userId: updated.id, role: updated.role, version: updated.sessionVersion });
  return { ok: true };
}
