import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CloseDayForm, OpeningForm, ReopenDayButton } from "@/components/admin/cash/cash-forms";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { compareCount } from "@/lib/cash";
import { dayBounds, getDrawerDay, getDrawerHistory, today } from "@/lib/data/cash";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cash counter" };

const rupees = (paise: number) => formatINR(toRupees(paise));
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** The counter cash drawer: opening cash, cash in and out today, and the count at closing. */
export default async function CashPage() {
  const user = await requireUser();
  const owner = user.role === "OWNER";
  const day = today();
  const { start, end } = dayBounds(day);
  const [d, history, cashExpenses] = await Promise.all([
    getDrawerDay(day),
    owner ? getDrawerHistory(14) : Promise.resolve([]),
    db.expense.findMany({
      where: { paidAt: { gte: start, lt: end }, paidWith: "CASH" },
      orderBy: { paidAt: "asc" },
    }),
  ]);
  const result = d.closed ? compareCount(d.closed.countedPaise, d.expectedPaise) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cash counter</h1>
        <p className="text-sm text-muted-foreground">
          Count the drawer in the morning and at closing. In between, the app adds cash sales and takes off
          expenses paid from the drawer.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5" aria-labelledby="today-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-h" className="text-xl font-bold">
            Today · {dayLabel(day)}
          </h2>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              d.closed ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground",
            )}
          >
            {d.closed ? `Closed at ${time(d.closed.at)}${d.closed.by ? ` by ${d.closed.by}` : ""}` : "Open"}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[1fr_auto]">
          <dt>
            Opening cash
            <span className="block text-xs text-muted-foreground">
              {d.openingSource === "ENTERED"
                ? `Counted${d.openedBy ? ` by ${d.openedBy}` : ""}`
                : "Not entered – carried from the last closing"}
            </span>
          </dt>
          <dd className="tabular font-semibold sm:text-right">{rupees(d.openingPaise)}</dd>
          <dt>+ Cash sales</dt>
          <dd className="tabular font-semibold sm:text-right">{rupees(d.cashSalesPaise)}</dd>
          <dt>− Expenses paid from the drawer</dt>
          <dd className="tabular font-semibold sm:text-right">{rupees(d.cashExpensesPaise)}</dd>
          <dt className="border-t border-border pt-2 text-base font-bold">Should be in the drawer</dt>
          <dd className="border-t border-border pt-2 tabular text-2xl font-bold sm:text-right">
            {rupees(d.expectedPaise)}
          </dd>
          {d.closed && result && (
            <>
              <dt className="font-semibold">Counted at closing</dt>
              <dd className="tabular text-xl font-bold sm:text-right">{rupees(d.closed.countedPaise)}</dd>
              <dt className="sr-only">Difference</dt>
              <dd
                className={cn(
                  "rounded-xl px-3 py-2 font-semibold sm:col-span-2",
                  result.kind === "match" && "bg-secondary text-secondary-foreground",
                  result.kind === "short" && "bg-destructive/10 text-destructive",
                  result.kind === "extra" && "bg-accent text-accent-foreground",
                )}
              >
                {result.kind === "match"
                  ? "Matches – the drawer was right."
                  : result.kind === "short"
                    ? `Short by ${rupees(result.paise)}`
                    : `Extra ${rupees(result.paise)} in the drawer`}
                {d.closed.note && <span className="block text-sm font-normal">Note: {d.closed.note}</span>}
              </dd>
            </>
          )}
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          Not in the drawer: Google Pay {rupees(d.upiSalesPaise)} · Card {rupees(d.cardSalesPaise)} · {d.bills} paid
          bill
          {d.bills === 1 ? "" : "s"} today
        </p>

        {!d.closed && (
          <div className="mt-5 grid gap-6 border-t border-border pt-5 md:grid-cols-2">
            <OpeningForm currentPaise={d.openingPaise} entered={d.openingSource === "ENTERED"} />
            <CloseDayForm expectedPaise={d.expectedPaise} />
          </div>
        )}
        {d.closed && owner && (
          <div className="mt-4 flex justify-end">
            <ReopenDayButton day={day} />
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="out-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="out-h" className="text-lg font-bold">
            Paid from the drawer today{" "}
            <span className="text-sm font-normal text-muted-foreground">{cashExpenses.length}</span>
          </h2>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href="/admin/expenses">
              Add an expense <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {cashExpenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Nothing paid in cash from the drawer today.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {cashExpenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-semibold">{EXPENSE_CATEGORY[e.category]}</span>
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {[e.paidTo, e.note].filter(Boolean).join(" · ")}
                </span>
                <span className="text-xs text-muted-foreground">{time(e.paidAt.toISOString())}</span>
                <span className="tabular font-semibold">{rupees(e.amountPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {owner && (
        <section className="space-y-3" aria-labelledby="hist-h">
          <h2 id="hist-h" className="text-lg font-bold">
            Recent days
          </h2>
          <div className="overflow-x-auto rounded-3xl border border-border bg-card">
            <table className="w-full min-w-[640px] tabular text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Day</th>
                  <th className="px-2 py-2 text-right font-medium">Opening</th>
                  <th className="px-2 py-2 text-right font-medium">+ Cash sales</th>
                  <th className="px-2 py-2 text-right font-medium">− Cash out</th>
                  <th className="px-2 py-2 text-right font-medium">Expected</th>
                  <th className="px-2 py-2 text-right font-medium">Counted</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const r = h.closed ? compareCount(h.closed.countedPaise, h.expectedPaise) : null;
                  return (
                    <tr key={h.day} className="border-t border-border">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {dayLabel(h.day)}
                        {h.openingSource === "CARRIED" && (
                          <span className="block text-xs text-muted-foreground">opening carried</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">{rupees(h.openingPaise)}</td>
                      <td className="px-2 py-2 text-right">{rupees(h.cashSalesPaise)}</td>
                      <td className="px-2 py-2 text-right">{rupees(h.cashExpensesPaise)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{rupees(h.expectedPaise)}</td>
                      <td className="px-2 py-2 text-right">
                        {h.closed ? rupees(h.closed.countedPaise) : "–"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {!r ? (
                          <span className="text-muted-foreground">Not closed</span>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold",
                              r.kind === "short" && "text-destructive",
                              r.kind === "extra" && "text-brand-text",
                            )}
                          >
                            {r.kind === "match"
                              ? "Matched"
                              : r.kind === "short"
                                ? `Short ${rupees(r.paise)}`
                                : `Extra ${rupees(r.paise)}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Closed days keep the totals saved at closing. Only today can be reopened and counted again.
          </p>
        </section>
      )}
    </div>
  );
}
