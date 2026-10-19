import { CircleAlert, Download, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { AddCustomerButton } from "@/components/admin/customer-edit-dialog";
import { Pager } from "@/components/admin/pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { owedByCustomer } from "@/lib/data/owed";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { clampPage, resolvePerPage } from "@/lib/paging";
import { cn } from "@/lib/utils";

export const metadata = { title: "Customers" };

const SORTS = {
  recent: { label: "Last visit", orderBy: { lastVisitAt: "desc" } },
  visits: { label: "Most visits", orderBy: { orderCount: "desc" } },
  spend: { label: "Top spend", orderBy: { totalSpendPaise: "desc" } },
  new: { label: "Newest", orderBy: { firstVisitAt: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.CustomerOrderByWithRelationInput }>;

const Filters = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  sort: z.enum(["recent", "visits", "spend", "new"]).catch("recent"),
  offers: z.literal("1").optional().catch(undefined),
  owes: z.literal("1").optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  per: z.string().optional().catch(undefined),
});

const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Owner only: everyone who has ordered, built from their orders. Full phone numbers live here. */
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireUser("OWNER");
  const raw = await searchParams;
  const f = Filters.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );

  // who still owes money (earlier days' unpaid orders and pay-later bills)
  const owed = await owedByCustomer();
  const owedTotal = [...owed.values()].reduce((sum, o) => sum + o.paise, 0);

  // digits search the phone number, anything else the name
  const digits = f.q?.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const where: Prisma.CustomerWhereInput = {
    ...(f.q &&
      (digits && digits.length >= 3 && /^[\d\s+-]+$/.test(f.q)
        ? { phone: { contains: digits } }
        : { name: { contains: f.q, mode: "insensitive" } })),
    ...(f.offers && { marketingConsent: true }),
    ...(f.owes && { id: { in: [...owed.keys()] } }),
  };

  const perPage = resolvePerPage(f.per, 25);
  const total = await db.customer.count({ where });
  const { page, pages } = clampPage(f.page, total, perPage);
  const [customers, all] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: [SORTS[f.sort].orderBy, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.customer.aggregate({ _count: true, _sum: { totalSpendPaise: true } }),
  ]);
  const consenting = await db.customer.count({ where: { marketingConsent: true } });
  const canEdit = (await getEditSwitches()).customers;

  const pageHref = (to: { page: number; perPage: number }) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.sort !== "recent") p.set("sort", f.sort);
    if (f.offers) p.set("offers", "1");
    if (f.owes) p.set("owes", "1");
    if (to.perPage !== 25) p.set("per", String(to.perPage));
    if (to.page > 1) p.set("page", String(to.page));
    const s = p.toString();
    return s ? `/admin/customers?${s}` : "/admin/customers";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who has ordered, built from their orders. Only the owner sees this page and full phone
            numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <AddCustomerButton />}
          <Button asChild variant="outline" className="rounded-full">
            {/* a plain link: the browser downloads the file */}
            <a href={f.offers ? "/api/customers/export?offers=1" : "/api/customers/export"} download>
              <Download data-icon="inline-start" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Customers", String(all._count)],
          ["Said yes to offers", String(consenting)],
          ["Total spend", formatINR(toRupees(all._sum.totalSpendPaise ?? 0))],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="tabular text-xl font-bold">{v}</dd>
          </div>
        ))}
        <div
          className={cn(
            "relative rounded-2xl border px-4 py-3",
            owed.size > 0 ? "border-hh-orange/40 bg-hh-orange/10" : "border-border bg-card",
          )}
        >
          <dt className="text-xs text-muted-foreground">Still to pay</dt>
          <dd className="tabular text-xl font-bold">{formatINR(toRupees(owedTotal))}</dd>
          <dd className="text-xs">
            {owed.size === 0 ? (
              "Nobody owes anything"
            ) : (
              // the whole card opens the list of who owes
              <Link href="/admin/customers?owes=1" className="font-semibold after:absolute after:inset-0">
                {owed.size} {owed.size === 1 ? "customer" : "customers"} – show them
              </Link>
            )}
          </dd>
        </div>
      </dl>

      <form
        method="get"
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-[1.6fr_1fr_auto_auto_auto] sm:items-end"
      >
        {perPage !== 25 && <input type="hidden" name="per" value={perPage} />}
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
              placeholder="Name or phone"
              className="h-10 pl-8 text-foreground"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Sort by
          <NativeSelect name="sort" defaultValue={f.sort} className="h-10 text-foreground">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="offers" value="1" defaultChecked={!!f.offers} className="size-4" />
          Offers only
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="owes" value="1" defaultChecked={!!f.owes} className="size-4" />
          Owes money
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 rounded-full px-5">
            Find
          </Button>
          <Button asChild variant="ghost" className="h-10 rounded-full">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        </div>
      </form>

      {total === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {f.owes ? "Nobody owes anything." : "No customers match."}
        </p>
      )}

      <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
        {customers.map((c) => {
          const owes = owed.get(c.id);
          return (
            <li
              key={c.id}
              className={cn(
                "flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3",
                // highlighted, always with the amount in words beside it
                owes &&
                  "border-l-4 border-l-hh-orange bg-hh-orange/10 first:rounded-t-3xl last:rounded-b-3xl",
              )}
            >
              <div className="min-w-48 flex-1">
                <Link href={`/admin/customers/${c.id}`} className="font-semibold hover:underline">
                  {c.name}
                </Link>
                <p className="tabular text-sm text-muted-foreground">
                  <a href={`tel:+91${c.phone}`} className="hover:underline">
                    {c.phone}
                  </a>
                  {c.marketingConsent && (
                    <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      Offers OK
                    </span>
                  )}
                </p>
                {owes && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                    <CircleAlert className="size-4 shrink-0" aria-hidden />
                    Owes <span className="tabular">{formatINR(toRupees(owes.paise))}</span> · {owes.orders}{" "}
                    unpaid {owes.orders === 1 ? "order" : "orders"}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-[repeat(3,minmax(5.5rem,auto))] gap-x-6 text-sm">
                <dt className="text-xs text-muted-foreground">Visits</dt>
                <dt className="text-xs text-muted-foreground">Spend</dt>
                <dt className="text-xs text-muted-foreground">Last visit</dt>
                <dd className="tabular font-semibold">{c.orderCount}</dd>
                <dd className="tabular font-semibold">{formatINR(toRupees(c.totalSpendPaise))}</dd>
                <dd title={`First visit ${date(c.firstVisitAt)}`}>{date(c.lastVisitAt)}</dd>
              </dl>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href={owes ? `/admin/orders?q=${c.phone}&pay=PENDING` : `/admin/orders?q=${c.phone}`}>
                  <ReceiptText data-icon="inline-start" /> {owes ? "Unpaid orders" : "Orders"}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>

      {total > 0 && (
        <Pager
          page={page}
          pages={pages}
          total={total}
          perPage={perPage}
          noun="customers"
          href={pageHref}
          sizes
        />
      )}
    </div>
  );
}
