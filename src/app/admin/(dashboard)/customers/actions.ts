"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { db } from "@/lib/db";
import { fieldErrors, type FormState } from "@/lib/validators/menu";
import { CustomerDetailsSchema } from "@/lib/validators/order-edit";

async function owner(): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const CustomerId = z.string().min(1).max(40);
const NotesSchema = z.object({
  id: CustomerId,
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters"),
});

/** Private staff notes on a guest ("allergic to peanuts", "likes extra chutney"). */
export async function saveCustomerNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = NotesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, fieldErrors: { notes: parsed.error.issues[0].message } };
  const updated = await db.customer.updateMany({
    where: { id: parsed.data.id },
    data: { notes: parsed.data.notes || null },
  });
  if (updated.count === 0) return { error: "Customer not found." };
  revalidatePath(`/admin/customers/${parsed.data.id}`);
  return { ok: true };
}

/** The guest asked to stop offers. Only the guest can give consent, so there's no way to switch it back on here. */
export async function withdrawConsent(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CustomerId.safeParse(id);
  if (!parsed.success) return { error: "Customer not found." };
  const updated = await db.customer.updateMany({
    where: { id: parsed.data },
    data: { marketingConsent: false, consentAt: null },
  });
  if (updated.count === 0) return { error: "Customer not found." };
  revalidatePath(`/admin/customers/${parsed.data}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}

/** Shown on old orders and bills after a guest's data is deleted. */
const DELETED_NAME = "Deleted on request";

/**
 * Delete a guest's personal data on request (DPDP Act). The customer record goes; old orders and
 * bills keep their amounts for the accounts but lose the name and phone.
 */
export async function deleteCustomer(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CustomerId.safeParse(id);
  if (!parsed.success) return { error: "Customer not found." };
  const customer = await db.customer.findUnique({
    where: { id: parsed.data },
    select: { id: true, phone: true },
  });
  if (!customer) return { error: "Customer not found." };

  // bills first: they're found through the orders, which are unlinked next
  await db.$transaction([
    db.bill.updateMany({
      where: { OR: [{ customerPhone: customer.phone }, { orders: { some: { customerId: customer.id } } }] },
      data: { customerName: DELETED_NAME, customerPhone: null },
    }),
    db.order.updateMany({
      where: { OR: [{ customerId: customer.id }, { customerPhone: customer.phone }] },
      data: { customerName: DELETED_NAME, customerPhone: null, customerId: null },
    }),
    db.rateLimit.deleteMany({ where: { key: `order-phone:${customer.phone}` } }),
    db.customer.delete({ where: { id: customer.id } }),
  ]);
  revalidatePath("/admin/customers");
  return { ok: true };
}

/* ----------------------- add and edit (owner switch) ----------------------- */

async function customerEditor(): Promise<CurrentUser | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  if (!(await getEditSwitches()).customers)
    return { error: "Customer editing is off. Turn it on in Settings → Editing." };
  return me;
}

const phoneTaken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export type CustomerFormState = (FormState & { id?: string }) | undefined;

/** A guest who hasn't ordered online yet – a regular, say, so their visits can be tracked. */
export async function addCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const me = await customerEditor();
  if ("error" in me) return me;
  const parsed = CustomerDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { name, phone, email, notes } = parsed.data;
  try {
    const made = await db.customer.create({
      data: { name, phone, email: email || null, notes: notes || null, orderCount: 0 },
      select: { id: true },
    });
    revalidatePath("/admin/customers");
    return { ok: true, id: made.id };
  } catch (e) {
    if (phoneTaken(e))
      return {
        error: "There's already a customer with this number.",
        fieldErrors: { phone: "Already a customer" },
      };
    throw e;
  }
}

/**
 * Fix a guest's name, phone or email. Their past orders and bills show the new name and number,
 * so searching Order history by the new number finds them.
 */
export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const me = await customerEditor();
  if ("error" in me) return me;
  const id = CustomerId.safeParse(formData.get("id"));
  const parsed = CustomerDetailsSchema.omit({ notes: true }).safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Customer not found." };
  if (!parsed.success) return fieldErrors(parsed.error);
  const { name, phone, email } = parsed.data;
  const before = await db.customer.findUnique({ where: { id: id.data }, select: { phone: true } });
  if (!before) return { error: "Customer not found." };
  try {
    await db.$transaction([
      db.customer.update({ where: { id: id.data }, data: { name, phone, email: email || null } }),
      // bills first: they're matched on the old number
      db.bill.updateMany({
        where: { customerPhone: before.phone, orders: { some: { customerId: id.data } } },
        data: { customerName: name, customerPhone: phone },
      }),
      db.order.updateMany({
        where: { customerId: id.data },
        data: { customerName: name, customerPhone: phone },
      }),
    ]);
  } catch (e) {
    if (phoneTaken(e))
      return {
        error: "Another customer already has this number.",
        fieldErrors: { phone: "Another customer has it" },
      };
    throw e;
  }
  revalidatePath(`/admin/customers/${id.data}`);
  revalidatePath("/admin/customers");
  return { ok: true, id: id.data };
}
