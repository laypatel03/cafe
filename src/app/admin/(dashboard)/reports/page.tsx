import Link from "next/link";
import { SalesBars, TopItems } from "@/components/admin/reports/bar-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/dal";
import { getReport } from "@/lib/data/reports";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { isoDay, RANGE_PRESETS, resolveRange } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const rupees = (paise: number) => formatINR(toRupees(paise));
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Owner only: sales from paid bills (void bills left out) + meal passes, by type, hour, day, month and dish. */
export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireUser("OWNER");
  const p = await searchParams;
  const range = resolveRange({ range: first(p.range), from: first(p.from), to: first(p.to) });
  const r = await getReport(range);
  const billSales = r.salesPaise - r.passes.paise;
  const average = r.bills > 0 ? Math.round(billSales / r.bills) : 0;
  const period =
    range.preset !== null
      ? RANGE_PRESETS[range.preset]
      : range.from === range.to
        ? new Date(range.start).toLocaleDateString("en-IN", { dateStyle: "medium" })
        : `${new Date(range.start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(range.end.getTime() - 1).toLocaleDateString("en-IN", { dateStyle: "medium" })}`;

  const tiles: [string, string, string?][] = [
    ["Sales", rupees(r.salesPaise)],
    ["Bills", String(r.bills)],
    ["Average bill", rupees(average)],
    [
      "Guests",
      String(r.guests.total),
      `${r.guests.returning} regular${r.guests.returning === 1 ? "" : "s"} (2+ visits)`,
    ],
    ...r.byType.map((t): [string, string, string] => [
      t.type === "PARCEL" ? "Takeaway" : "Dine-in",
      rupees(t.paise),
      `${t.bills} bill${t.bills === 1 ? "" : "s"}`,
    ]),
    [
      "Meal passes",
      rupees(r.passes.paise),
      `${r.passes.sold} sold${r.passes.refunded > 0 ? ` · ${r.passes.refunded} refunded` : ""}`,
    ],
    ["Cancelled orders", String(r.cancelledOrders)],
    ["Expenses", rupees(r.expensesPaise), "supplies, bills, salaries…"],
    [
      r.salesPaise >= r.expensesPaise ? "Sales minus expenses" : "Spent more than sales",
      rupees(Math.abs(r.salesPaise - r.expensesPaise)),
      "before tax, for this period",
    ],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales from paid bills, counted when they were paid, plus meal passes on the day they were sold
          (refunds taken off). Void bills are left out.
        </p>
      </div>

      {/* filters: one row above the charts */}
      <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-border bg-card p-3">
        {Object.entries(RANGE_PRESETS).map(([key, label]) => (
          <Button
            key={key}
            asChild
            size="sm"
            variant={range.preset === key ? "default" : "outline"}
            className="rounded-full"
          >
            <Link href={key === "today" ? "/admin/reports" : `/admin/reports?range=${key}`}>{label}</Link>
          </Button>
        ))}
        <form method="get" className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              name="from"
              defaultValue={range.from}
              max={isoDay(new Date())}
              className="h-9 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              name="to"
              defaultValue={range.to}
              max={isoDay(new Date())}
              className="h-9 text-foreground"
            />
          </label>
          <Button
            type="submit"
            size="sm"
            variant={range.preset === null ? "default" : "outline"}
            className="h-9 rounded-full"
          >
            Show
          </Button>
        </form>
      </div>

      <h2 className="text-lg font-bold">{period}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={cn("tabular font-bold", k === "Sales" ? "text-2xl" : "text-xl")}>{v}</dd>
            {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
          </div>
        ))}
      </dl>

      {r.expensesByCategory.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="spend-h">
          <h3 id="spend-h" className="mb-2 font-bold">
            Where the money went
          </h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {r.expensesByCategory.map((e) => (
              <li key={e.category} className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                {EXPENSE_CATEGORY[e.category]}{" "}
                <span className="tabular font-semibold">{rupees(e.paise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesBars title="Sales by hour" buckets={r.hours} labelEvery={3} />
        <TopItems items={r.topItems} />
      </div>
      {range.days > 1 && (
        <SalesBars
          title="Sales by day"
          buckets={r.days}
          labelEvery={range.days <= 10 ? 1 : range.days <= 31 ? 5 : 30}
        />
      )}
      <SalesBars title="Sales by month · last 12 months" buckets={r.months} labelEvery={2} />
    </div>
  );
}
