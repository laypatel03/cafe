"use server";

import { revalidatePath } from "next/cache";
import { AuthError, assertUser, type CurrentUser, type Access } from "@/lib/auth/dal";
import { today } from "@/lib/data/cash";
import { activePassFor, COUNTED_USES } from "@/lib/data/meal-passes";
import { getCafeDetails } from "@/lib/data/menu";
import { retotal } from "@/lib/data/order-totals";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import {
  checkPicks,
  type DishLine,
  type MealOption,
  type MealPart,
  type MealsLeft,
  mealOptions,
  passEndsOn,
  passLineName,
  readParts,
  type SwapRule,
} from "@/lib/meal-pass";
import { toRupees } from "@/lib/money";
import { publish } from "@/lib/realtime";
import {
  MealPicksSchema,
  MealPlanSchema,
  RefundPassSchema,
  SellPassSchema,
} from "@/lib/validators/meal-pass";
import { fieldErrors, type FormState } from "@/lib/validators/menu";

type Fail = { ok: false; error: string };

async function signedIn(access: Access): Promise<CurrentUser | Fail> {
  try {
    return await assertUser(access);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

const rupees = (paise: number) => formatINR(toRupees(paise));

const refresh = (customerId?: string | null) => {
  revalidatePath("/admin/passes");
  revalidatePath("/admin/money");
  revalidatePath("/admin/cash");
  if (customerId) revalidatePath(`/admin/customers/${customerId}`);
};

/* ------------------------------- plans (owner) ------------------------------- */

export async function saveMealPlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return { error: me.error };
  // the form sends its meal types as JSON: [{ name, meals, categoryIds, cap }]
  let parts: unknown = [];
  try {
    parts = JSON.parse(String(formData.get("parts") ?? "[]"));
  } catch {}
  const parsed = MealPlanSchema.safeParse({ ...Object.fromEntries(formData), parts });
  if (!parsed.success) {
    // errors inside a meal type are keyed "parts.<i>.<field>", so the form can show them in place
    const out: Record<string, string> = {};
    for (const issue of parsed.error.issues) out[issue.path.join(".") || "form"] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: out };
  }
  const p = parsed.data;
  const data = {
    name: p.name,
    pricePaise: p.price,
    parts: p.parts.map((x) => ({
      name: x.name,
      meals: x.meals,
      categoryIds: [...new Set(x.categoryIds)],
      capPaise: x.cap,
    })) satisfies MealPart[],
    days: p.days,
  };
  if (p.id) await db.mealPlan.update({ where: { id: p.id }, data });
  else await db.mealPlan.create({ data });
  refresh();
  return { ok: true };
}

/** Plans are never deleted (passes point at them); switched-off plans just can't be sold. */
export async function setMealPlanActive(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { error: string }> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return { error: me.error };
  await db.mealPlan.updateMany({ where: { id }, data: { active } });
  refresh();
  return { ok: true };
}

/* --------------------------- selling and refunds (owner) --------------------------- */

/** Owner sells a pass at the counter. The money is a sale today (money book + cash drawer). */
export async function sellMealPass(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return { error: me.error };
  const parsed = SellPassSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { customerId, planId, method, startsOn } = parsed.data;
  const day = today();
  if (startsOn < day)
    return { error: "Please fix the highlighted fields.", fieldErrors: { startsOn: "Pick today or later" } };
  if (startsOn > passEndsOn(day, 31))
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { startsOn: "Start within the next month" },
    };

  const [customer, plan] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, phone: true } }),
    db.mealPlan.findUnique({ where: { id: planId } }),
  ]);
  if (!customer) return { error: "Customer not found." };
  if (!plan || !plan.active || readParts(plan.parts).length === 0)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { planId: "This plan isn't on sale" },
    };

  await db.$transaction(async (tx) => {
    const pass = await tx.mealPass.create({
      data: {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        planId: plan.id,
        planName: plan.name,
        pricePaise: plan.pricePaise,
        parts: readParts(plan.parts),
        startsOn,
        endsOn: passEndsOn(startsOn, plan.days),
        method,
        soldById: me.id,
      },
      select: { id: true, number: true },
    });
    const sale = await tx.extraSale.create({
      data: {
        soldAt: new Date(),
        method,
        amountPaise: plan.pricePaise,
        note: `Meal pass #${pass.number} – ${plan.name}`,
        createdById: me.id,
      },
      select: { id: true },
    });
    await tx.mealPass.update({ where: { id: pass.id }, data: { saleId: sale.id } });
  });
  refresh(customer.id);
  return { ok: true };
}

/** Owner only, while Settings → Editing → "Meal pass refunds" is on. The pass stops working. */
export async function refundMealPass(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn("OWNER");
  if ("ok" in me) return { error: me.error };
  const settings = await db.cafeSettings.findUnique({
    where: { id: 1 },
    select: { mealPassRefundsEnabled: true },
  });
  if (!settings?.mealPassRefundsEnabled)
    return { error: "Meal pass refunds are off. Turn them on in Settings → Editing." };
  const parsed = RefundPassSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { passId, amount, method, note } = parsed.data;

  const pass = await db.mealPass.findUnique({ where: { id: passId } });
  if (!pass) return { error: "Pass not found." };
  if (pass.refundedAt) return { error: `Pass #${pass.number} was already refunded.` };
  if (amount > pass.pricePaise)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: { amount: `Up to ${rupees(pass.pricePaise)}, what was paid` },
    };

  await db.$transaction(async (tx) => {
    // a minus sale today: takes the money off sales (and the drawer, if paid back in cash)
    const sale = await tx.extraSale.create({
      data: {
        soldAt: new Date(),
        method,
        amountPaise: -amount,
        note: `Refund of meal pass #${pass.number}${note ? ` – ${note}` : ""}`,
        createdById: me.id,
      },
      select: { id: true },
    });
    await tx.mealPass.update({
      where: { id: pass.id },
      data: {
        refundedAt: new Date(),
        refundPaise: amount,
        refundMethod: method,
        refundNote: note || null,
        refundSaleId: sale.id,
      },
    });
  });
  refresh(pass.customerId);
  return { ok: true };
}

/* ------------------------------ using meals (staff) ------------------------------ */

export type MealPassChoice = {
  ok: true;
  pass: { number: number; planName: string; endsOn: string; parts: string[]; left: MealsLeft };
  options: (MealOption & { orderNumber: number })[];
};

/** The unbilled orders of one guest, their pass, and what the pass could cover. */
/** Owners may swap any dish (guest pays above the cap); staff only dishes the pass covers in full. */
async function load(orderIds: string[], swaps: SwapRule) {
  const ids = [...new Set(orderIds)].slice(0, 20);
  const orders = await db.order.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      number: true,
      status: true,
      billId: true,
      customerId: true,
      items: {
        where: { custom: false, menuItemId: { not: null } },
        select: {
          menuItemId: true,
          itemName: true,
          quantity: true,
          unitPricePaise: true,
          addOns: true,
          menuItem: { select: { categoryId: true } },
        },
      },
    },
  });
  if (orders.length !== ids.length || orders.length === 0)
    return { ok: false as const, error: "Some of these orders changed – refresh the screen." };
  if (orders.some((o) => o.billId)) return { ok: false as const, error: "These orders are already billed." };
  if (orders.some((o) => o.status === "CANCELLED" || o.status === "PAID"))
    return { ok: false as const, error: "These orders are finished – refresh the screen." };
  const customerId = orders[0].customerId;
  if (!customerId || orders.some((o) => o.customerId !== customerId))
    return { ok: false as const, error: "A meal pass needs the guest's phone number on the order." };
  const pass = await activePassFor(customerId);
  if (!pass) return { ok: false as const, error: "This guest has no meal pass with meals left today." };

  const lines: DishLine[] = orders.flatMap((o) =>
    o.items
      .filter((i) => i.menuItem)
      .map((i) => ({
        orderId: o.id,
        menuItemId: i.menuItemId!,
        categoryId: i.menuItem!.categoryId,
        name: i.itemName,
        quantity: i.quantity,
        dishPaise:
          i.unitPricePaise -
          ((i.addOns ?? []) as { pricePaise?: number }[]).reduce((s, a) => s + (a.pricePaise ?? 0), 0),
      })),
  );
  const existing = await db.mealPassUse.findMany({
    where: { orderId: { in: ids } },
    select: { orderId: true, menuItemId: true },
  });
  const covered = new Map<string, number>();
  for (const u of existing) {
    const key = `${u.orderId}:${u.menuItemId}`;
    covered.set(key, (covered.get(key) ?? 0) + 1);
  }
  return { ok: true as const, orders, pass, options: mealOptions(pass, pass.left, lines, covered, swaps) };
}

export async function mealPassChoices(orderIds: string[]): Promise<MealPassChoice | Fail> {
  const me = await signedIn("team");
  if ("ok" in me) return me;
  const res = await load(orderIds, me.role === "OWNER" ? "any" : "within cap");
  if (!res.ok) return res;
  const number = new Map(res.orders.map((o) => [o.id, o.number]));
  return {
    ok: true,
    pass: {
      number: res.pass.number,
      planName: res.pass.planName,
      endsOn: res.pass.endsOn,
      parts: res.pass.parts.map((p) => p.name),
      left: res.pass.left,
    },
    options: res.options.map((o) => ({ ...o, orderNumber: number.get(o.orderId)! })),
  };
}

/** Covers the picked dishes with the guest's pass: one discount line per meal, meals left go down. */
export async function applyMealPass(
  orderIds: string[],
  picks: { orderId: string; menuItemId: string; count: number }[],
): Promise<{ ok: true; meals: number; paise: number } | Fail> {
  const me = await signedIn("team");
  if ("ok" in me) return me;
  const parsedPicks = MealPicksSchema.safeParse(picks);
  if (!parsedPicks.success) return { ok: false, error: "Check the dishes you picked." };
  const res = await load(orderIds, me.role === "OWNER" ? "any" : "within cap");
  if (!res.ok) return res;
  const checked = checkPicks(parsedPicks.data, res.options, res.pass.left);
  if (!checked.ok) return checked;
  const { taxBasisPoints } = await getCafeDetails();
  const pass = res.pass;

  const changed = await db
    .$transaction(async (tx) => {
      // re-count inside the transaction, so two tills can't spend the same meals
      const used = await tx.mealPassUse.groupBy({
        by: ["part"],
        where: { passId: pass.id, ...COUNTED_USES },
        _count: true,
      });
      const n = (i: number) => used.find((u) => u.part === i)?._count ?? 0;
      const wanted = (i: number) => checked.uses.filter((u) => u.part === i).length;
      if (pass.parts.some((p, i) => n(i) + wanted(i) > p.meals)) throw new Error("PASS_CHANGED");
      for (const u of checked.uses) {
        const use = await tx.mealPassUse.create({
          data: {
            passId: pass.id,
            orderId: u.orderId,
            part: u.part,
            partName: u.partName,
            menuItemId: u.menuItemId,
            coveredPaise: u.coverPaise,
            swap: u.swap,
            usedById: me.id,
          },
          select: { id: true },
        });
        await tx.orderItem.create({
          data: {
            orderId: u.orderId,
            itemName: passLineName(u.partName, u.name, pass.number, u.swap),
            unitPricePaise: -u.coverPaise,
            quantity: 1,
            lineTotalPaise: -u.coverPaise,
            custom: true,
            mealPassUseId: use.id,
          },
        });
      }
      const orderIdsTouched = [...new Set(checked.uses.map((u) => u.orderId))];
      const out = [];
      for (const id of orderIdsTouched) out.push(await retotal(tx, id, taxBasisPoints));
      return out;
    })
    .catch((e: Error) => (e.message === "PASS_CHANGED" ? null : Promise.reject(e)));
  if (!changed)
    return { ok: false, error: "The pass was just used at another till – refresh and try again." };

  for (const o of changed)
    await publish({ type: "order", orderId: o.id, number: o.number, status: o.status });
  if (pass.customerId) revalidatePath(`/admin/customers/${pass.customerId}`);
  revalidatePath("/admin/passes");
  return { ok: true, meals: checked.uses.length, paise: checked.uses.reduce((s, u) => s + u.coverPaise, 0) };
}

/** Takes the pass off these unbilled orders: discount lines go, the meals go back on the pass. */
export async function undoMealPass(orderIds: string[]): Promise<{ ok: true; meals: number } | Fail> {
  const me = await signedIn("team");
  if ("ok" in me) return me;
  const ids = [...new Set(orderIds)].slice(0, 20);
  const orders = await db.order.findMany({ where: { id: { in: ids } }, select: { id: true, billId: true } });
  if (orders.some((o) => o.billId))
    return { ok: false, error: "The bill is already made – void it first to change the meal pass." };
  const { taxBasisPoints } = await getCafeDetails();

  const res = await db.$transaction(async (tx) => {
    const uses = await tx.mealPassUse.findMany({
      where: { orderId: { in: ids } },
      select: { orderId: true, pass: { select: { customerId: true } } },
    });
    // the discount lines go with the uses (OrderItem.mealPassUseId cascades)
    await tx.mealPassUse.deleteMany({ where: { orderId: { in: ids } } });
    const touched = [...new Set(uses.map((u) => u.orderId))];
    const changed = [];
    for (const id of touched) changed.push(await retotal(tx, id, taxBasisPoints));
    return { changed, meals: uses.length, customerId: uses[0]?.pass.customerId };
  });
  for (const o of res.changed)
    await publish({ type: "order", orderId: o.id, number: o.number, status: o.status });
  if (res.customerId) revalidatePath(`/admin/customers/${res.customerId}`);
  revalidatePath("/admin/passes");
  return { ok: true, meals: res.meals };
}
