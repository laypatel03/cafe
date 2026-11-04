import { Printer, Search } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { RecordPaymentButton } from "@/components/admin/orders/record-payment-button";
import { Pager } from "@/components/admin/pager";
import { PaidDifference } from "@/components/admin/paid-difference";
import { SortButtons } from "@/components/admin/sort-buttons";
import { SendBillButton } from "@/components/admin/whatsapp/wa-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { shortBillsDue } from "@/lib/data/customer-balance";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { clampPage, resolvePerPage } from "@/lib/paging";
import { PAY_CHOICES, PAYMENT_LABEL, PAYMENT_SHORT } from "@/lib/payments";
import { maskPhone } from "@/lib/phone-mask";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bills" };

const rupees = (paise: number) => formatINR(toRupees(paise));

// always with a word, never colour alone
const STATE = {
  paid: { label: "Paid", className: "bg-hh-green/15 text-hh-green dark:text-hh-green-light" },
  part: { label: "Part paid", className: "bg-hh-orange/20 text-brand-text" },
  later: { label: "Pay later", className: "bg-hh-orange/20 text-brand-text" },
  unpaid: { label: "Not paid", className: "bg-secondary text-secondary-foreground" },
  void: { label: "Void", className: "bg-destructive/10 text-destructive" },
};
type State = keyof typeof STATE;

const SORTS = {
  new: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  old: { label: "Oldest", orderBy: [{ createdAt: "asc" }] },
  amount: { label: "Highest amount", orderBy: [{ totalPaise: "desc" }, { createdAt: "desc" }] },
  number: { label: "Bill number", orderBy: [{ number: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.BillOrderByWithRelationInput[] }>;
type Sort = keyof typeof SORTS;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Filters = z.object({
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  state: z.enum(["paid", "part", "later", "unpaid", "void"]).optional().catch(undefined),
  method: z.enum(PAY_CHOICES).optional().catch(undefined),
  type: z.enum(["DINE_IN", "PARCEL"]).optional().catch(undefined),
  sort: z.enum(["new", "old", "amount", "number"]).catch("new"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  per: z.string().optional().catch(undefined),
});

/** yyyy-mm-dd in the server's local time (the café runs in IST). */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const when = (d: Date) =>
  d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Every bill: paid, part paid, on pay later, not paid yet or void – with what came in and what's owed. */
export default async function BillsPage({ searchParams }: PageProps<"/admin/bills">) {
  const user = await requireUser();
  const raw = await searchParams;
  const f = Filters.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const today = isoDay(new Date());
  const from = f.from ?? today;
  const to = f.to ?? from;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);

  // paid short and still owed (from the guest's balance, oldest bills cleared first)
  const dueBills = await shortBillsDue();
  const STATE_WHERE: Record<State, Prisma.BillWhereInput> = {
    paid: { paidAt: { not: null }, voidedAt: null },
    part: { id: { in: [...dueBills.keys()] } },
    later: { paidAt: null, voidedAt: null, payLaterAt: { not: null } },
    unpaid: { paidAt: null, voidedAt: null, payLaterAt: null },
    void: { voidedAt: { not: null } },
  };

  // "12" or "#12" = bill number, 10 digits = phone, otherwise name
  const q = f.q?.replace(/^#/, "");
  const search: Prisma.BillWhereInput | undefined = !q
    ? undefined
    : /^\d{10}$/.test(q)
      ? { customerPhone: q }
      : /^\d{1,7}$/.test(q)
        ? { number: Number(q) }
        : { customerName: { contains: q, mode: "insensitive" } };
  // a number or phone search, or a "still owed" state, looks across all dates
  const allDates =
    (q && /^\d+$/.test(q)) || f.state === "part" || f.state === "later" || f.state === "unpaid";
  const where: Prisma.BillWhereInput = {
    ...(!allDates && { createdAt: { gte: start, lt: end } }),
    ...(f.type && { type: f.type }),
    ...(f.method && {
      paymentMethod: f.method === "CREDIT_CARD" ? { in: ["CREDIT_CARD", "CARD"] } : f.method,
    }),
    AND: [search ?? {}, f.state ? STATE_WHERE[f.state] : {}],
  };

  const perPage = resolvePerPage(f.per, 25);
  const [total, sums, received] = await Promise.all([
    db.bill.count({ where }),
    db.bill.aggregate({ where: { AND: [where, { voidedAt: null }] }, _sum: { totalPaise: true } }),
    db.bill.aggregate({
      where: { AND: [where, { voidedAt: null, paidAt: { not: null } }] },
      _sum: { totalPaise: true, differencePaise: true },
    }),
  ]);
  const { page, pages } = clampPage(f.page, total, perPage);
  const bills = await db.bill.findMany({
    where,
    orderBy: SORTS[f.sort].orderBy,
    skip: (page - 1) * perPage,
    take: perPage,
    include: {
      orders: { where: { deletedAt: null }, orderBy: { number: "asc" }, select: { number: true } },
      createdBy: { select: { name: true } },
    },
  });

  const stateOf = (b: (typeof bills)[number]): State =>
    b.voidedAt ? "void" : dueBills.has(b.id) ? "part" : b.paidAt ? "paid" : b.payLaterAt ? "later" : "unpaid";
  const showPhone = (p: string | null) => (p ? (user.role === "OWNER" ? p : maskPhone(p)) : null);
  const href = (to: { page: number; perPage: number; sort?: Sort }) => {
    const sort = to.sort ?? f.sort;
    const p = new URLSearchParams({
      ...(f.from && { from }),
      ...(f.to && { to: f.to }),
      ...(f.q && { q: f.q }),
      ...(f.state && { state: f.state }),
      ...(f.method && { method: f.method }),
      ...(f.type && { type: f.type }),
      ...(sort !== "new" && { sort }),
      ...(to.perPage !== 25 && { per: String(to.perPage) }),
      ...(to.page > 1 && { page: String(to.page) }),
    });
    const qs = p.toString();
    return qs ? `/admin/bills?${qs}` : "/admin/bills";
  };
  const billed = sums._sum.totalPaise ?? 0;
  const came = (received._sum.totalPaise ?? 0) + (received._sum.differencePaise ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Bills</h1>
        <p className="text-sm text-muted-foreground">
          Every bill – paid, part paid, on pay later, not paid yet or void. Searching a bill number or phone,
          or a still-owed state, looks across all dates.
        </p>
      </div>

      <form
        method="get"
        className="grid grid-cols-6 gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-3 sm:items-end lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_auto]"
      >
        {perPage !== 25 && <input type="hidden" name="per" value={perPage} />}
        {f.sort !== "new" && <input type="hidden" name="sort" value={f.sort} />}
        <label className="col-span-6 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          Search
          <span className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={f.q}
              placeholder="Bill #, phone or name"
              className="h-10 pl-8 text-foreground"
            />
          </span>
        </label>
        <label className="col-span-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          From
          <Input type="date" name="from" defaultValue={from} max={today} className="h-10 text-foreground" />
        </label>
        <label className="col-span-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          To
          <Input type="date" name="to" defaultValue={to} max={today} className="h-10 text-foreground" />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          Status
          <NativeSelect name="state" defaultValue={f.state ?? ""} className="h-10 text-foreground">
            <option value="">All</option>
            {(Object.keys(STATE) as State[]).map((k) => (
              <option key={k} value={k}>
                {STATE[k].label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          Paid with
          <NativeSelect name="method" defaultValue={f.method ?? ""} className="h-10 text-foreground">
            <option value="">Any</option>
            {PAY_CHOICES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
          Type
          <NativeSelect name="type" defaultValue={f.type ?? ""} className="h-10 text-foreground">
            <option value="">All</option>
            <option value="DINE_IN">Dine-in</option>
            <option value="PARCEL">Takeaway</option>
          </NativeSelect>
        </label>
        <div className="col-span-6 flex gap-2 sm:col-span-3 lg:col-span-1">
          <Button type="submit" className="h-10 rounded-full px-5">
            Find
          </Button>
          <Button asChild variant="ghost" className="h-10 rounded-full">
            <Link href="/admin/bills">Today</Link>
          </Button>
        </div>
      </form>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Bills", String(total)],
          ["Billed", rupees(billed)],
          ["Received", rupees(came)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="tabular text-xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {total > 1 && (
        <SortButtons
          current={f.sort}
          options={(Object.keys(SORTS) as Sort[]).map((k) => ({
            key: k,
            label: SORTS[k].label,
            href: href({ page: 1, perPage, sort: k }),
          }))}
        />
      )}

      {bills.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No bills match.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {bills.map((b) => {
            const state = stateOf(b);
            return (
              <li key={b.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">Bill #{b.number}</span>
                    <span className="text-sm text-muted-foreground">
                      {b.type === "PARCEL" ? "Takeaway" : "Dine-in"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        STATE[state].className,
                      )}
                    >
                      {STATE[state].label}
                    </span>
                  </p>
                  <p className="text-sm">
                    {b.customerName}
                    {b.customerPhone && (
                      <span className="tabular text-muted-foreground"> · {showPhone(b.customerPhone)}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {when(b.createdAt)}
                    {(b.voidedAt ? b.voidedOrderNumbers : b.orders.map((o) => o.number)).length > 0 &&
                      ` · orders ${(b.voidedAt ? b.voidedOrderNumbers : b.orders.map((o) => o.number))
                        .map((n) => `#${n}`)
                        .join(", ")}`}
                    {b.paidAt &&
                      ` · paid by ${b.paymentMethod ? PAYMENT_SHORT[b.paymentMethod] : "–"} at ${b.paidAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}`}
                    {b.createdBy && ` · by ${b.createdBy.name}`}
                    {b.voidedAt && b.voidReason && ` · void: ${b.voidReason}`}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p
                    className={cn(
                      "tabular text-lg font-semibold",
                      b.voidedAt && "text-muted-foreground line-through",
                    )}
                  >
                    {rupees(b.totalPaise)}
                  </p>
                  <PaidDifference bill={{ ...b, orders: 1 }} duePaise={dueBills.get(b.id)} />
                  {(state === "later" || state === "unpaid") && b.totalPaise > 0 && (
                    <p className="text-sm font-semibold text-brand-text">
                      Owes <span className="tabular">{rupees(b.totalPaise)}</span>
                    </p>
                  )}
                </div>
                <div className="flex w-full flex-wrap justify-end gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href={`/admin/print/bill/${b.id}`} target="_blank">
                      <Printer data-icon="inline-start" /> {b.paidAt ? "Reprint" : "Print"}
                    </Link>
                  </Button>
                  {!b.voidedAt && b.customerPhone && <SendBillButton bill={{ id: b.id, number: b.number }} />}
                  {(state === "later" || state === "unpaid") && (
                    <RecordPaymentButton bill={{ id: b.id, number: b.number, totalPaise: b.totalPaise }} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pager page={page} pages={pages} total={total} perPage={perPage} noun="bills" href={href} sizes />
    </div>
  );
}
