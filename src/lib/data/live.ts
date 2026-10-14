import "server-only";
import type { OrderStatus, OrderType, Role, SelectionStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { maskPhone } from "@/lib/phone-mask";
import type { SelectionLine } from "@/lib/validators/selection";

export type LiveSelection = {
  id: string;
  takeaway: boolean;
  /** short random number so staff can tell guests' lists apart */
  code: number;
  status: Exclude<SelectionStatus, "CONFIRMED">;
  updatedAt: string;
  items: SelectionLine[];
};

export type LiveOrderItem = {
  id: string;
  /** null if the dish was deleted from the menu since */
  itemId: string | null;
  name: string;
  quantity: number;
  addOns: { id: string; name: string }[];
  lineTotalPaise: number;
};

export type LiveOrder = {
  id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  cancelReason: string | null;
  /** bills combine one guest's dine-in orders */
  customerId: string | null;
  billId: string | null;
  /** its bill is paid (a takeaway can be paid before it is picked up) */
  paid: boolean;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  totalPaise: number;
  createdAt: string;
  /** placed before today and still not finished – left over from an earlier day */
  earlier: boolean;
  items: LiveOrderItem[];
};

export type LiveBill = {
  id: string;
  number: number;
  type: OrderType;
  customerName: string;
  totalPaise: number;
  orderNumbers: number[];
  createdAt: string;
  /** set when the order was completed without payment; the guest pays later */
  payLaterAt: string | null;
};

export type LiveBoard = {
  selections: LiveSelection[];
  orders: LiveOrder[];
  bills: LiveBill[];
  /** bills completed with "pay later", any day, still not paid */
  payLater: LiveBill[];
  serverTime: string;
};

const OPEN: OrderStatus[] = ["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED"];

/**
 * Everything the live dashboard shows: guests picking right now, today's orders, and any order
 * from an earlier day that was never finished (so it can still be moved on, billed or cancelled).
 */
export async function getLiveBoard(role: Role): Promise<LiveBoard> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [selections, orders, bills, payLater] = await Promise.all([
    db.selection.findMany({
      where: { status: { not: "CONFIRMED" }, updatedAt: { gt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "asc" },
    }),
    db.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { createdAt: { gte: startOfDay } },
          // left open on an earlier day – but not ones completed with "pay later"
          { status: { in: OPEN }, NOT: { bill: { is: { payLaterAt: { not: null } } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true, bill: { select: { paidAt: true } } },
    }),
    db.bill.findMany({
      where: { paidAt: null, voidedAt: null, payLaterAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        orders: { select: { number: true }, orderBy: { number: "asc" } },
      },
    }),
    db.bill.findMany({
      where: { paidAt: null, voidedAt: null, payLaterAt: { not: null } },
      orderBy: { payLaterAt: "asc" },
      include: {
        orders: { select: { number: true }, orderBy: { number: "asc" } },
      },
    }),
  ]);
  const toLiveBill = (b: (typeof bills)[number]): LiveBill => ({
    id: b.id,
    number: b.number,
    type: b.type,
    customerName: b.customerName,
    totalPaise: b.totalPaise,
    orderNumbers: b.orders.map((o) => o.number),
    createdAt: b.createdAt.toISOString(),
    payLaterAt: b.payLaterAt?.toISOString() ?? null,
  });
  return {
    selections: selections.map((s) => ({
      id: s.id,
      takeaway: s.takeaway,
      code: s.code,
      status: s.status as LiveSelection["status"],
      updatedAt: s.updatedAt.toISOString(),
      items: s.items as SelectionLine[],
    })),
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      type: o.type,
      status: o.status,
      cancelReason: o.cancelReason,
      customerId: o.customerId,
      billId: o.billId,
      paid: !!o.bill?.paidAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone && (role === "OWNER" ? o.customerPhone : maskPhone(o.customerPhone)),
      note: o.note,
      totalPaise: o.totalPaise,
      createdAt: o.createdAt.toISOString(),
      earlier: o.createdAt < startOfDay,
      items: o.items.map((i) => ({
        id: i.id,
        itemId: i.menuItemId,
        name: i.itemName,
        quantity: i.quantity,
        addOns: (i.addOns as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })),
        lineTotalPaise: i.lineTotalPaise,
      })),
    })),
    bills: bills.map(toLiveBill),
    payLater: payLater.map(toLiveBill),
    serverTime: new Date().toISOString(),
  };
}
