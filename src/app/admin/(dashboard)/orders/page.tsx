import { ChevronLeft, ChevronRight, Printer, Search } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { ORDER_STATUS, OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  AddOrderButton,
  DeleteOrderButton,
  EditOrderButton,
} from "@/components/admin/orders/order-record-dialog";
import { RecordPaymentButton } from "@/components/admin/orders/record-payment-button";
import { TextReceiptButton } from "@/components/admin/receipt-sms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { getPublicMenu } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { toCafeInput } from "@/lib/order-edit";
import { maskPhone } from "@/lib/phone-mask";
import { RECEIPT_SMS_ENABLED } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import { PAYMENT_SHORT } from "@/lib/payments";

export const metadata = { title: "Order history" };

const PAGE_SIZE = 50;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Filters = z.object({
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  type: z.enum(["DINE_IN", "PARCEL"]).optional().catch(undefined),
  status: z
    .enum(["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED", "PAY_LATER"])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

/** yyyy-mm-dd in the server's local time (the café runs in IST). */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function OrderHistoryPage({ searchParams }: PageProps<"/admin/orders">) {
  const user = await requireUser();
  const raw = await searchParams;
  const f = Filters.parse({
    ...Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  });
  const today = isoDay(new Date());
  const from = f.from ?? today;
  const to = f.to ?? from;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);

  // one search box: "12" or "#12" = order or bill number, 10 digits = phone, otherwise name
  const q = f.q?.replace(/^#/, "");
  const search: Prisma.OrderWhereInput | undefined = !q
    ? undefined
    : /^\d{10}$/.test(q)
      ? { customerPhone: q }
      : /^\d{1,7}$/.test(q)
        ? { OR: [{ number: Number(q) }, { bill: { number: Number(q) } }] }
        : { customerName: { contains: q, mode: "insensitive" } };

  const where: Prisma.OrderWhereInput = {
    // a number or phone search, or "Pay later – not paid", looks across all dates
    ...((q && /^\d+$/.test(q)) || f.status === "PAY_LATER" ? {} : { createdAt: { gte: start, lt: end } }),
    ...(f.type && { type: f.type }),
    ...(f.status === "PAY_LATER"
      ? { bill: { is: { payLaterAt: { not: null }, paidAt: null, voidedAt: null } } }
      : f.status && { status: f.status }),
    ...search,
  };

  // owner only, while Settings → Editing → "Add and edit orders" is on
  const canEdit = user.role === "OWNER" && (await getEditSwitches()).orders;
  const menu = canEdit ? await getPublicMenu() : null;

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: true,
        bill: {
          select: {
            id: true,
            number: true,
            paymentMethod: true,
            paidAt: true,
            totalPaise: true,
            customerPhone: true,
            voidedAt: true,
            payLaterAt: true,
            _count: { select: { orders: { where: { deletedAt: null } } } },
          },
        },
        statusLogs: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (page: number) => {
    const params = new URLSearchParams({
      ...(f.from && { from }),
      ...(f.to && { to }),
      ...(f.q && { q: f.q }),
      ...(f.type && { type: f.type }),
      ...(f.status && { status: f.status }),
      page: String(page),
    });
    return `/admin/orders?${params}`;
  };
  const showPhone = (p: string | null) => (p ? (user.role === "OWNER" ? p : maskPhone(p)) : null);
  const time = (d: Date) =>
    d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Order history</h1>
          <p className="text-sm text-muted-foreground">
            Find any order or bill. Searching an order number or phone looks across all dates.
          </p>
        </div>
        {menu && <AddOrderButton menu={menu} />}
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[1.6fr_1fr_1fr_8rem_11rem_auto]"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <span className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={f.q}
              placeholder="#12, phone or name"
              className="h-10 pl-8 text-foreground"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          From
          <Input type="date" name="from" defaultValue={from} max={today} className="h-10 text-foreground" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          To
          <Input type="date" name="to" defaultValue={to} max={today} className="h-10 text-foreground" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type
          <NativeSelect name="type" defaultValue={f.type ?? ""} className="h-10 text-foreground">
            <option value="">All</option>
            <option value="DINE_IN">Dine-in</option>
            <option value="PARCEL">Takeaway</option>
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <NativeSelect name="status" defaultValue={f.status ?? ""} className="h-10 text-foreground">
            <option value="">All</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
            <option value="PAY_LATER">Pay later – not paid</option>
          </NativeSelect>
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 rounded-full px-5">
            Find
          </Button>
          <Button asChild variant="ghost" className="h-10 rounded-full">
            <Link href="/admin/orders">Today</Link>
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground" role="status">
        {total === 0 ? "No orders match." : `${total} order${total === 1 ? "" : "s"}`}
        {total > PAGE_SIZE && ` · page ${f.page} of ${pages}`}
      </p>

      <ul className="space-y-3">
        {orders.map((o) => (
          <li
            key={o.id}
            className={cn(
              "rounded-3xl border p-4",
              // deleted: kept for the record, tinted light red, left out of the money book
              o.deletedAt ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
              <p className="text-lg font-bold">
                #{o.number} · {o.type === "PARCEL" ? "Takeaway" : "Dine-in"}
              </p>
              {o.deletedAt ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  Deleted
                </span>
              ) : (
                <OrderStatusBadge status={o.status} className="mt-1" />
              )}
              <p
                className={cn(
                  "ml-auto tabular text-lg font-semibold",
                  o.deletedAt && "text-muted-foreground line-through",
                )}
              >
                {formatINR(toRupees(o.totalPaise))}
              </p>
              <p className="w-full text-xs text-muted-foreground">
                {o.customerName}
                {o.customerPhone && ` · ${showPhone(o.customerPhone)}`} · {time(o.createdAt)}
                {o.bill && (
                  <>
                    {" "}
                    · Bill #{o.bill.number}
                    {o.bill.voidedAt
                      ? " · bill voided"
                      : o.bill.paidAt
                        ? ` · paid by ${o.bill.paymentMethod ? PAYMENT_SHORT[o.bill.paymentMethod] : "–"}`
                        : o.bill.payLaterAt
                          ? " · pay later – not paid yet"
                          : " · not paid yet"}
                  </>
                )}
              </p>
            </div>

            <ul className="mt-2 space-y-0.5 text-sm">
              {o.items.map((i) => {
                const addOns = (i.addOns as { name: string }[]).map((a) => a.name);
                return (
                  <li key={i.id} className="flex gap-2">
                    <span className="w-7 shrink-0 tabular font-bold text-brand-text">{i.quantity}×</span>
                    <span className="flex-1">
                      {i.itemName}
                      {addOns.length > 0 && (
                        <span className="text-xs text-muted-foreground"> + {addOns.join(", ")}</span>
                      )}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {formatINR(toRupees(i.lineTotalPaise))}
                    </span>
                  </li>
                );
              })}
            </ul>
            {o.note && <p className="mt-2 text-sm">Note: {o.note}</p>}
            {o.deletedAt ? (
              <p className="mt-2 text-sm text-destructive">
                Deleted {time(o.deletedAt)} – {o.cancelReason?.replace(/^Deleted: /, "")}. Not counted in the
                money book or reports.
              </p>
            ) : (
              o.cancelReason && <p className="mt-2 text-sm text-destructive">Cancelled: {o.cancelReason}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <details className="flex-1 text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  History ({o.statusLogs.length} steps)
                </summary>
                <ol className="mt-2 space-y-1 border-l-2 border-border pl-3">
                  {o.statusLogs.map((l) => (
                    <li key={l.id}>
                      <span className="tabular text-muted-foreground">{time(l.createdAt)}</span> ·{" "}
                      <span className="font-medium">{ORDER_STATUS[l.toStatus].label}</span>
                      {l.note && ` – ${l.note}`}
                      {l.changedBy && !l.note?.includes(l.changedBy.name) && ` (${l.changedBy.name})`}
                    </li>
                  ))}
                </ol>
              </details>
              {o.bill && (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={`/admin/print/bill/${o.bill.id}`} target="_blank">
                    <Printer data-icon="inline-start" /> {o.bill.paidAt ? "Reprint" : "Print"} bill #
                    {o.bill.number}
                  </Link>
                </Button>
              )}
              {o.bill && !o.bill.paidAt && !o.bill.voidedAt && !o.deletedAt && (
                <RecordPaymentButton
                  bill={{ id: o.bill.id, number: o.bill.number, totalPaise: o.bill.totalPaise }}
                />
              )}
              {RECEIPT_SMS_ENABLED && o.bill?.paidAt && o.bill.customerPhone && (
                <TextReceiptButton bill={{ id: o.bill.id, number: o.bill.number }} />
              )}
              {menu && !o.deletedAt && (
                <EditOrderButton
                  menu={menu}
                  order={{
                    id: o.id,
                    number: o.number,
                    when: toCafeInput(o.createdAt),
                    takeaway: o.type === "PARCEL",
                    name: o.customerName,
                    phone: o.customerPhone ?? "",
                    note: o.note ?? "",
                    items: o.items.map((i) => ({
                      itemId: i.menuItemId,
                      name: i.itemName,
                      quantity: i.quantity,
                      addOns: (i.addOns as { id: string; name: string }[]).map((a) => ({
                        id: a.id,
                        name: a.name,
                      })),
                      unitPrice: toRupees(i.unitPricePaise),
                    })),
                    paidBy: o.bill?.paidAt && !o.bill.voidedAt ? (o.bill.paymentMethod ?? null) : null,
                    billNumber: o.bill?.number ?? null,
                    sharedBill: (o.bill?._count.orders ?? 0) > 1,
                  }}
                />
              )}
              {menu && !o.deletedAt && (
                <DeleteOrderButton
                  order={{ id: o.id, number: o.number, billNumber: o.bill?.number ?? null }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Pages">
          <Button asChild variant="outline" size="sm" className="rounded-full" aria-disabled={f.page <= 1}>
            <Link href={pageHref(Math.max(1, f.page - 1))}>
              <ChevronLeft data-icon="inline-start" /> Newer
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {f.page} / {pages}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-disabled={f.page >= pages}
          >
            <Link href={pageHref(Math.min(pages, f.page + 1))}>
              Older <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
