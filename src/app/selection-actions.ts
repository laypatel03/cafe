"use server";

import { z } from "zod";
import { isWithinWorkingHours } from "@/lib/cafe-hours";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { db } from "@/lib/db";
import { billTotals, priceLines } from "@/lib/pricing";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publish } from "@/lib/realtime";
import { clientIp } from "@/lib/request-ip";
import { type PlaceOrderInput, PlaceOrderSchema } from "@/lib/validators/place-order";
import {
  type GuestSelectionInput,
  GuestSelectionSchema,
  type SelectionLine,
} from "@/lib/validators/selection";

/** Selections untouched this long are removed (a guest who left without ordering). */
const SELECTION_TTL_MS = 12 * 60 * 60 * 1000;

export type SyncResult = { ok: true; code: number } | { ok: false; error: string };

/**
 * The guest's list, mirrored live to the dashboard while they pick.
 * Names come from the database, never from the browser.
 */
export async function syncSelection(input: GuestSelectionInput): Promise<SyncResult> {
  const parsed = GuestSelectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { clientId, takeaway, items } = parsed.data;

  if (!(await consumeRateLimit(`selection:${await clientIp()}`, 400, 10 * 60))) {
    return { ok: false, error: "Too many updates. Please wait a minute." };
  }
  await db.selection.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - SELECTION_TTL_MS) } } });

  const existing = await db.selection.findUnique({ where: { id: clientId } });

  if (items.length === 0) {
    // an emptied list disappears from the dashboard (a confirmed one stays for the guest's phone)
    if (existing && existing.status !== "CONFIRMED") {
      await db.selection.delete({ where: { id: clientId } });
      await publish({ type: "selection", selectionId: clientId });
    }
    return { ok: true, code: existing?.code ?? 0 };
  }

  const menuItems = await db.menuItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, visible: true, category: { visible: true } },
    select: { id: true, name: true, addOns: { select: { id: true, name: true } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  const lines: SelectionLine[] = [];
  for (const i of items) {
    const m = byId.get(i.itemId);
    if (!m) continue; // removed from the menu since the guest picked it
    const allowed = new Map(m.addOns.map((a) => [a.id, a.name]));
    lines.push({
      itemId: m.id,
      name: m.name,
      quantity: i.quantity,
      addOns: i.addOnIds.filter((id) => allowed.has(id)).map((id) => ({ id, name: allowed.get(id)! })),
    });
  }

  // a new list after a placed order starts a fresh round
  const fresh = !existing || existing.status === "CONFIRMED";
  const row = await db.selection.upsert({
    where: { id: clientId },
    create: { id: clientId, takeaway, code: randomCode(), items: lines },
    update: { takeaway, items: lines, ...(fresh && { status: "SELECTING", orderId: null }) },
    select: { code: true },
  });
  await publish({ type: "selection", selectionId: clientId });
  return { ok: true, code: row.code };
}

export type PlaceOrderResult =
  { ok: true; id: string; number: number } | { ok: false; error: string; problems?: string[] };

/**
 * The guest places their own order with their name and phone. Prices come from the menu now;
 * the order starts as NEW and staff accept it before it goes to the kitchen.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { clientId, takeaway, name, phone, note, marketingConsent, items } = parsed.data;

  const cafe = await getCafeDetails();
  const isWithinHours = isWithinWorkingHours(cafe.hours);
  if (!cafe.orderingEnabled || !isWithinHours) {
    return {
      ok: false,
      error: !isWithinHours
        ? "The café is closed outside working hours. Ordering is currently disabled."
        : "Ordering is paused right now. Please ask staff.",
    };
  }
  // guard rails against fake orders: per device/network and per phone number
  if (
    !(await consumeRateLimit(`order-ip:${await clientIp()}`, 10, 60 * 60)) ||
    !(await consumeRateLimit(`order-phone:${phone}`, 5, 60 * 60))
  ) {
    return { ok: false, error: "Too many orders in a short time. Please ask staff." };
  }

  const priced = priceLines(items, await loadMenuPrices(items.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Please update your list:", problems: priced.problems };
  const totals = billTotals(priced.subtotalPaise, cafe.taxBasisPoints);

  const order = await db.$transaction(async (tx) => {
    const now = new Date();
    const customer = await tx.customer.upsert({
      where: { phone },
      create: { name, phone, marketingConsent, consentAt: marketingConsent ? now : null },
      // a later order never withdraws consent on its own – that happens on request
      update: { name, lastVisitAt: now, ...(marketingConsent && { marketingConsent: true, consentAt: now }) },
      select: { id: true },
    });
    const created = await tx.order.create({
      data: {
        type: takeaway ? "PARCEL" : "DINE_IN",
        status: "NEW",
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        items: {
          create: priced.lines.map((l) => ({
            menuItemId: l.menuItemId,
            itemName: l.itemName,
            unitPricePaise: l.unitPricePaise,
            quantity: l.quantity,
            addOns: l.addOns,
            lineTotalPaise: l.lineTotalPaise,
          })),
        },
        statusLogs: { create: { toStatus: "NEW", note: "Placed by the guest on the QR menu" } },
      },
      select: { id: true, number: true },
    });
    // the live list becomes this order (kept briefly so the phone can catch up if it goes offline)
    await tx.selection.updateMany({
      where: { id: clientId },
      data: { status: "CONFIRMED", orderId: created.id },
    });
    return created;
  });

  await publish({
    type: "order",
    orderId: order.id,
    number: order.number,
    status: "NEW",
    selectionId: clientId,
  });
  return { ok: true, id: order.id, number: order.number };
}

function randomCode() {
  return 1000 + Math.floor(Math.random() * 9000);
}

export type GuestOrder = {
  id: string;
  number: number;
  type: "DINE_IN" | "PARCEL";
  status: "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
  cancelReason: string | null;
  items: { name: string; quantity: number; addOns: string[] }[];
};

const GuestOrderIds = z.array(z.string().regex(/^[a-z0-9]{20,32}$/)).max(10);

/** The guest's own orders for the status tracker. Order ids are the key; no prices are returned. */
export async function getGuestOrders(ids: string[]): Promise<GuestOrder[]> {
  const parsed = GuestOrderIds.safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return [];
  const orders = await db.order.findMany({
    where: { id: { in: parsed.data } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      cancelReason: true,
      items: { select: { itemName: true, quantity: true, addOns: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    type: o.type,
    status: o.status,
    cancelReason: o.cancelReason,
    items: o.items.map((i) => ({
      name: i.itemName,
      quantity: i.quantity,
      addOns: (i.addOns as { name: string }[]).map((a) => a.name),
    })),
  }));
}
