import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { CardFeesForm, DeleteExtraSaleButton, ExtraSaleForm } from "@/components/admin/money/money-forms";
import { MonthlyChart } from "@/components/admin/money/monthly-chart";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { today } from "@/lib/data/cash";
import { getMoneyBook } from "@/lib/data/money-book";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { margin, monthKey, monthLabel, type MoneyRow, resolveMonth, shiftMonth } from "@/lib/money-book";
import { PAYMENT_LABEL } from "@/lib/payments";
import { cn } from "@/lib/utils";

export const metadata = { title: "Money book" };

const rupees = (paise: number) => formatINR(toRupees(paise));
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** A money cell: dash for nothing, red for a loss. */
function Amount({ paise, strong }: { paise: number; strong?: boolean }) {
  if (paise === 0) return <span className="text-muted-foreground">–</span>;
  return (
    <span className={cn(paise < 0 && "text-destructive", strong && "font-semibold")}>
      {paise < 0 ? `−${rupees(-paise)}` : rupees(paise)}
    </span>
  );
}

const SPLIT = [
  { key: "cash", label: "Cash", className: "bg-hh-green" },
  { key: "upi", label: "Google Pay / UPI", className: "bg-hh-orange" },
  { key: "credit", label: "Credit card", className: "bg-sky-600" },
  { key: "debit", label: "Debit card", className: "bg-violet-500" },
] as const;

const DAY_COLUMNS: { key: keyof MoneyRow; label: string; strong?: boolean }[] = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "Google Pay" },
  { key: "credit", label: "Credit card" },
  { key: "debit", label: "Debit card" },
  { key: "sales", label: "Total sales", strong: true },
  { key: "cardFees", label: "Card fees" },
  { key: "expenses", label: "Expenses" },
  { key: "profit", label: "Profit", strong: true },
  { key: "cashLeft", label: "Cash left" },
];

/** Owner only: every day's sales by how guests paid, card fees, expenses and profit. */
export default async function MoneyBookPage({ searchParams }: PageProps<"/admin/money">) {
  await requireUser("OWNER");
  const month = resolveMonth(first((await searchParams).month));
  const book = await getMoneyBook(month);
  const t = book.monthTotal;
  const isCurrent = month === monthKey(new Date());
  const days = [...book.days].reverse(); // newest first
  const salesDays = book.days.filter((d) => d.sales > 0).length;

  const tiles: [string, number, string?][] = [
    ["Total sales", t.sales, `${salesDays} day${salesDays === 1 ? "" : "s"} with sales`],
    ["Card fees", t.cardFees, "kept by the card machine provider"],
    ["Expenses", t.expenses],
    [t.profit >= 0 ? "Profit" : "Loss", t.profit, t.sales > 0 ? `${pct(margin(t))} of sales` : undefined],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Money book</h1>
          <p className="text-sm text-muted-foreground">
            Sales by how guests paid, card fees, expenses and profit. Sales come from paid bills plus any sale
            you add below.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <a href={`/api/money/export?month=${month}`}>
            <Download data-icon="inline-start" /> Download {monthLabel(month)} (CSV)
          </a>
        </Button>
      </div>

      <nav className="flex items-center gap-2" aria-label="Month">
        <Button asChild size="icon-sm" variant="outline" className="rounded-full">
          <Link href={`/admin/money?month=${shiftMonth(month, -1)}`} aria-label="Previous month">
            <ChevronLeft />
          </Link>
        </Button>
        <h2 className="min-w-32 text-center text-lg font-bold">{monthLabel(month)}</h2>
        {isCurrent ? (
          <Button size="icon-sm" variant="outline" className="rounded-full" disabled aria-label="Next month">
            <ChevronRight />
          </Button>
        ) : (
          <Button asChild size="icon-sm" variant="outline" className="rounded-full">
            <Link href={`/admin/money?month=${shiftMonth(month, 1)}`} aria-label="Next month">
              <ChevronRight />
            </Link>
          </Button>
        )}
        {!isCurrent && (
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href="/admin/money">This month</Link>
          </Button>
        )}
      </nav>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={cn("tabular text-2xl font-bold", v < 0 && "text-destructive")}>
              {v < 0 ? `−${rupees(-v)}` : rupees(v)}
            </dd>
            {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
          </div>
        ))}
      </dl>

      {book.payLater.bills > 0 && (
        <p className="rounded-2xl bg-accent px-4 py-3 text-sm">
          <span className="font-semibold">Pay later: {rupees(book.payLater.paise)} not paid yet</span> on{" "}
          {book.payLater.bills} bill{book.payLater.bills === 1 ? "" : "s"}. It counts as a sale on the day the
          guest pays.{" "}
          <Link href="/admin/orders?pay=PAY_LATER" className="font-semibold underline">
            See them
          </Link>
        </p>
      )}

      <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="split-h">
        <h3 id="split-h" className="font-bold">
          How guests paid
        </h3>
        {t.sales > 0 ? (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              {SPLIT.map((s) =>
                t[s.key] > 0 ? (
                  <div
                    key={s.key}
                    className={s.className}
                    style={{ width: `${(t[s.key] / t.sales) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {SPLIT.map((s) => (
                <li key={s.key} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", s.className)} aria-hidden />
                  <span>
                    {s.label}
                    <span className="block tabular font-semibold">
                      {rupees(t[s.key])} · {pct(t[s.key] / t.sales)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No sales this month yet.</p>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="days-h">
        <h3 id="days-h" className="font-bold">
          Day by day
        </h3>
        <p className="text-xs text-muted-foreground">
          Cash left = cash sales minus expenses paid in cash: what the day added to the drawer.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-right tabular text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 text-left font-semibold">Date</th>
                {DAY_COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-2 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr
                  key={d.key}
                  className={cn("border-b border-border/60", d.key === today() && "bg-secondary/40")}
                >
                  <td className="py-2 pr-3 text-left whitespace-nowrap">{d.label}</td>
                  {DAY_COLUMNS.map((c) => (
                    <td key={c.key} className="px-2 py-2 whitespace-nowrap">
                      <Amount paise={d[c.key] as number} strong={c.strong} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-2 pr-3 text-left">Total</td>
                {DAY_COLUMNS.map((c) => (
                  <td key={c.key} className="px-2 py-2 whitespace-nowrap">
                    <Amount paise={t[c.key] as number} strong />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="extra-h">
          <h3 id="extra-h" className="font-bold">
            Sales not billed in the system
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            For a sale that never got a bill, such as one written on paper. Cash sales also count toward that
            day&apos;s drawer.
          </p>
          <ExtraSaleForm
            today={today()}
            defaultDay={isCurrent ? today() : (book.days.at(-1)?.key ?? today())}
          />
          {book.extraSales.length > 0 && (
            <ul className="mt-4 divide-y divide-border text-sm">
              {book.extraSales.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="font-medium">
                      <span className="tabular">{rupees(s.amountPaise)}</span> · {PAYMENT_LABEL[s.method]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${s.day}T12:00:00`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                      {s.note && ` · ${s.note}`}
                      {s.by && ` · added by ${s.by}`}
                    </p>
                  </div>
                  <DeleteExtraSaleButton id={s.id} label={`the ${rupees(s.amountPaise)} sale`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="spend-h">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="spend-h" className="font-bold">
                Where the money went
              </h3>
              <Link
                href="/admin/expenses"
                className="text-sm text-brand-text underline-offset-4 hover:underline"
              >
                Expenses
              </Link>
            </div>
            {book.byCategory.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {book.byCategory.map((e) => (
                  <li
                    key={e.category}
                    className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground"
                  >
                    {EXPENSE_CATEGORY[e.category]}{" "}
                    <span className="tabular font-semibold">{rupees(e.paise)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No expenses this month yet.</p>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="fees-h">
            <h3 id="fees-h" className="font-bold">
              Card machine fees
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              The % your provider (bank, Paytm, Pine Labs…) keeps on each card payment. It&apos;s taken off
              profit. Find it on the provider&apos;s rate card or monthly statement.
            </p>
            <CardFeesForm creditBps={book.fees.creditBps} debitBps={book.fees.debitBps} />
          </section>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="months-h">
        <h3 id="months-h" className="font-bold">
          Month by month · last 12 months
        </h3>
        <p className="text-sm text-muted-foreground">
          Sales, expenses and profit for each month. Tap a month to see the numbers.
        </p>
        <div className="mt-4">
          <MonthlyChart
            months={book.months.map((m) => ({
              key: m.key,
              short: new Date(`${m.key}-01T12:00:00`).toLocaleDateString("en-IN", { month: "short" }),
              label: m.label,
              sales: toRupees(m.sales),
              expenses: toRupees(m.expenses),
              profit: toRupees(m.profit),
            }))}
          />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-right tabular text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 text-left font-semibold">Month</th>
                {DAY_COLUMNS.filter((c) => c.key !== "cashLeft").map((c) => (
                  <th key={c.key} className="px-2 py-2 font-semibold">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2 font-semibold">Margin</th>
              </tr>
            </thead>
            <tbody>
              {[...book.months].reverse().map((m) => (
                <tr
                  key={m.key}
                  className={cn("border-b border-border/60", m.key === month && "bg-secondary/40")}
                >
                  <td className="py-2 pr-3 text-left whitespace-nowrap">
                    <Link href={`/admin/money?month=${m.key}`} className="underline-offset-4 hover:underline">
                      {m.label}
                    </Link>
                  </td>
                  {DAY_COLUMNS.filter((c) => c.key !== "cashLeft").map((c) => (
                    <td key={c.key} className="px-2 py-2 whitespace-nowrap">
                      <Amount paise={m[c.key] as number} strong={c.strong} />
                    </td>
                  ))}
                  <td className="px-2 py-2">{m.sales > 0 ? pct(margin(m)) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
