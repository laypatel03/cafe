import { CircleAlert, Printer, Search } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { ORDER_STATUS, OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  AddOrderButton,
  DeleteOrderButton,
  EditOrderButton,
} from "@/components/admin/orders/order-record-dialog";
import { ChangePaymentButton, RecordPaymentButton } from "@/components/admin/orders/record-payment-button";
import { Pager } from "@/components/admin/pager";
import { TextReceiptButton } from "@/components/admin/receipt-sms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/dal";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { getPublicMenu } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { toCafeInput } from "@/lib/order-edit";
import { maskPhone } from "@/lib/phone-mask";
import { clampPage, resolvePerPage } from "@/lib/paging";
import { RECEIPT_SMS_ENABLED } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import { PAYMENT_SHORT } from "@/lib/payments";

export const metadata = { title: "Order history" };

const PAY_FILTERS = [
  "PENDING",
  "PENDING_EARLIER",
  "PAY_LATER",
  "PAID",
  "CASH",
  "UPI",
  "CREDIT_CARD",
  "DEBIT_CARD",
] as const;
type PayFilter = (typeof PAY_FILTERS)[number];

const paidBy = (...methods: PaymentMethod[]): Prisma.OrderWhereInput => ({
  bill: {
    is: { paidAt: { not: null }, voidedAt: null, ...(methods.length && { paymentMethod: { in: methods } }) },
  },
});
// not paid yet and still owed: no bill made, or a bill waiting for payment
const PENDING: Prisma.OrderWhereInput = {
  deletedAt: null,
  status: { not: "CANCELLED" },
  OR: [{ billId: null }, { bill: { is: { paidAt: null, voidedAt: null } } }],
};
/** Midnight today, server local time (the café runs in IST). */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const payWhere = (pay: PayFilter): Prisma.OrderWhereInput =>
  pay === "PENDING_EARLIER" ? { ...PENDING, createdAt: { lt: startOfToday() } } : PAY_WHERE[pay];
const PAY_WHERE: Record<Exclude<PayFilter, "PENDING_EARLIER">, Prisma.OrderWhereInput> = {
  PENDING,
  PAY_LATER: { bill: { is: { payLaterAt: { not: null }, paidAt: null, voidedAt: null } } },
  PAID: paidBy(),
  CASH: paidBy("CASH"),
  UPI: paidBy("UPI"),
  // old bills say CARD and count as credit card
  CREDIT_CARD: paidBy("CREDIT_CARD", "CARD"),
  DEBIT_CARD: paidBy("DEBIT_CARD"),
};
const PAY_FILTER_LABEL: Record<PayFilter, string> = {
  PENDING: "Payment pending",
  PENDING_EARLIER: "Payment pending – earlier days",
  PAY_LATER: "Pay later",
  PAID: "Paid – any way",
  CASH: "Paid by cash",
  UPI: "Paid by Google Pay",
  CREDIT_CARD: "Paid by credit card",
  DEBIT_CARD: "Paid by debit card",
};
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Filters = z.object({
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  type: z.enum(["DINE_IN", "PARCEL"]).optional().catch(undefined),
  status: z
    .enum(["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"])
    .optional()
    .catch(undefined),
  pay: z.enum(PAY_FILTERS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  per: z.string().optional().catch(undefined),
});

/** yyyy-mm-dd in the server's local time (the café runs in IST). */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function OrderHistoryPage({ searchParams }: PageProps<"/admin/orders">) {
  const user = await requireUser();
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined]),
  );
  // old links said ?status=PAY_LATER
  if (params.status === "PAY_LATER") {
    params.pay ??= "PAY_LATER";
    delete params.status;
  }
  const f = Filters.parse(params);
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

  const owedOnly = f.pay === "PENDING" || f.pay === "PENDING_EARLIER" || f.pay === "PAY_LATER";
  const where: Prisma.OrderWhereInput = {
    // a number or phone search, or a "still owed" filter, looks across all dates
    ...((q && /^\d+$/.test(q)) || owedOnly ? {} : { createdAt: { gte: start, lt: end } }),
    ...(f.type && { type: f.type }),
    ...(f.status && { status: f.status }),
    AND: [search ?? {}, f.pay ? payWhere(f.pay) : {}],
  };

  // owner only, while Settings → Editing → "Add and edit orders" is on
  const canEdit = user.role === "OWNER" && (await getEditSwitches()).orders;
  const menu = canEdit ? await getPublicMenu() : null;

  const perPage = resolvePerPage(f.per, 10);
  const [total, earlierOwed] = await Promise.all([
    db.order.count({ where }),
    // orders from before today still waiting for payment, shown as a reminder above the filters
    db.order.aggregate({
      where: payWhere("PENDING_EARLIER"),
      _count: true,
      _sum: { totalPaise: true },
    }),
  ]);
  const { page, pages } = clampPage(f.page, total, perPage);
  const [orders] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
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
  const pageHref = (to: { page: number; perPage: number }) => {
    const params = new URLSearchParams({
      ...(f.from && { from }),
      ...(f.to && { to: f.to }),
      ...(f.q && { q: f.q }),
      ...(f.type && { type: f.type }),
      ...(f.status && { status: f.status }),
      ...(f.pay && { pay: f.pay }),
      ...(to.perPage !== 10 && { per: String(to.perPage) }),
      ...(to.page > 1 && { page: String(to.page) }),
    });
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
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
            Find any order or bill. Searching an order number or phone, or payment pending, looks across all
            dates.
          </p>
        </div>
        {menu && <AddOrderButton menu={menu} />}
      </div>

      {earlierOwed._count > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border border-hh-orange/40 bg-hh-orange/10 px-4 py-3"
        >
          <CircleAlert className="size-5 shrink-0 text-brand-text" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-semibold">
              {earlierOwed._count} {earlierOwed._count === 1 ? "order" : "orders"} from earlier days still
              need payment
            </span>{" "}
            · <span className="tabular">{formatINR(toRupees(earlierOwed._sum.totalPaise ?? 0))}</span>
          </p>
          {f.pay !== "PENDING_EARLIER" && (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/admin/orders?pay=PENDING_EARLIER">Show these orders</Link>
            </Button>
          )}
        </div>
      )}

      <form
        method="get"
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[1.6fr_1fr_1fr_8rem_9rem_11rem_auto]"
      >
        {perPage !== 10 && <input type="hidden" name="per" value={perPage} />}
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
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Payment
          <NativeSelect name="pay" defaultValue={f.pay ?? ""} className="h-10 text-foreground">
            <option value="">All</option>
            {PAY_FILTERS.map((k) => (
              <option key={k} value={k}>
                {PAY_FILTER_LABEL[k]}
              </option>
            ))}
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

      {total === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          No orders match.
        </p>
      )}

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
                {!o.bill && !o.deletedAt && o.status !== "CANCELLED" && " · not billed yet"}
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
            {o.note && <p className="mt-2 text-sm font-medium text-destructive">Note: {o.note}</p>}
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
              {menu && o.bill?.paidAt && !o.bill.voidedAt && !o.deletedAt && (
                <ChangePaymentButton
                  bill={{
                    id: o.bill.id,
                    number: o.bill.number,
                    totalPaise: o.bill.totalPaise,
                    method: o.bill.paymentMethod,
                  }}
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
                      custom: i.custom,
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

      {total > 0 && (
        <Pager
          page={page}
          pages={pages}
          total={total}
          perPage={perPage}
          noun="orders"
          href={pageHref}
          sizes
        />
      )}
    </div>
  );
}
