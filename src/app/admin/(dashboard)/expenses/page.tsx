import { Pencil } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { DeleteExpenseButton, ExpenseForm } from "@/components/admin/cash/cash-forms";
import { SortButtons } from "@/components/admin/sort-buttons";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { today } from "@/lib/data/cash";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORY, EXPENSE_PAYMENT } from "@/lib/expenses";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { isoDay, RANGE_PRESETS, resolveRange } from "@/lib/reports";

export const metadata = { title: "Expenses" };

const rupees = (paise: number) => formatINR(toRupees(paise));

const SORTS = {
  new: { label: "Newest", orderBy: [{ paidAt: "desc" }] },
  old: { label: "Oldest", orderBy: [{ paidAt: "asc" }] },
  amount: { label: "Highest amount", orderBy: [{ amountPaise: "desc" }, { paidAt: "desc" }] },
  category: { label: "Category", orderBy: [{ category: "asc" }, { paidAt: "desc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ExpenseOrderByWithRelationInput[] }>;
type Sort = keyof typeof SORTS;
const SortParam = z.enum(["new", "old", "amount", "category"]).catch("new");
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const when = (d: Date) =>
  d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Money the café spent. Staff add today's; the owner sees any period and can edit or delete. */
export default async function ExpensesPage({ searchParams }: PageProps<"/admin/expenses">) {
  const user = await requireUser();
  const owner = user.role === "OWNER";
  const p = await searchParams;
  // staff only ever see today
  const range = owner
    ? resolveRange({ range: first(p.range), from: first(p.from), to: first(p.to) })
    : resolveRange({});
  const sort = SortParam.parse(first(p.sort));
  // the period as it's in the URL, so a sort or period change keeps the other
  const period: Record<string, string> =
    !owner || range.preset === "today"
      ? {}
      : range.preset
        ? { range: range.preset }
        : { from: range.from, to: range.to };
  const href = (to: { sort?: Sort; period?: Record<string, string> }) => {
    const q = new URLSearchParams({ ...(to.period ?? period) });
    const sortTo = to.sort ?? sort;
    if (sortTo !== "new") q.set("sort", sortTo);
    const qs = q.toString();
    return qs ? `/admin/expenses?${qs}` : "/admin/expenses";
  };
  const expenses = await db.expense.findMany({
    where: { paidAt: { gte: range.start, lt: range.end } },
    orderBy: SORTS[sort].orderBy,
    include: { createdBy: { select: { name: true } } },
  });
  const total = expenses.reduce((s, e) => s + e.amountPaise, 0);
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>(
      (acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + e.amountPaise }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const cashOut = expenses.filter((e) => e.paidWith === "CASH").reduce((s, e) => s + e.amountPaise, 0);
  const todayKey = today();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Supplies, bills, salaries – anything the café pays for. Cash paid from the drawer is taken off the
          cash counter automatically.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5" aria-labelledby="add-h">
        <h2 id="add-h" className="mb-3 text-lg font-bold">
          Add an expense
        </h2>
        <ExpenseForm owner={owner} today={todayKey} />
        {!owner && (
          <p className="mt-3 text-xs text-muted-foreground">
            Made a mistake? Ask the owner to change or delete it.
          </p>
        )}
      </section>

      {owner && (
        <div className="flex flex-wrap items-end gap-2 rounded-3xl border border-border bg-card p-3">
          {Object.entries(RANGE_PRESETS).map(([key, label]) => (
            <Button
              key={key}
              asChild
              size="sm"
              variant={range.preset === key ? "default" : "outline"}
              className="rounded-full"
            >
              <Link href={href({ period: key === "today" ? {} : { range: key } })}>{label}</Link>
            </Button>
          ))}
          <form method="get" className="ml-auto flex flex-wrap items-end gap-2">
            {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              From
              <input
                type="date"
                name="from"
                defaultValue={range.from}
                max={isoDay(new Date())}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              To
              <input
                type="date"
                name="to"
                defaultValue={range.to}
                max={isoDay(new Date())}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
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
      )}

      <section className="space-y-3" aria-labelledby="list-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="list-h" className="text-lg font-bold">
            {owner && range.preset !== "today"
              ? range.preset
                ? RANGE_PRESETS[range.preset]
                : `${range.from} – ${range.to}`
              : "Today"}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {expenses.length} expense{expenses.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="tabular text-sm">
            Total <span className="text-lg font-bold">{rupees(total)}</span>
            <span className="text-muted-foreground"> · from the drawer {rupees(cashOut)}</span>
          </p>
        </div>

        {owner && byCategory.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {byCategory.map(([cat, paise]) => (
              <li key={cat} className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                {EXPENSE_CATEGORY[cat as keyof typeof EXPENSE_CATEGORY]}{" "}
                <span className="tabular font-semibold">{rupees(paise)}</span>
              </li>
            ))}
          </ul>
        )}

        {expenses.length > 1 && (
          <SortButtons
            current={sort}
            options={(Object.keys(SORTS) as Sort[]).map((k) => ({
              key: k,
              label: SORTS[k].label,
              href: href({ sort: k }),
            }))}
          />
        )}

        {expenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No expenses in this period.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {expenses.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-semibold">{EXPENSE_CATEGORY[e.category]}</span>
                  <span className="min-w-0 flex-1 text-muted-foreground">
                    {[e.paidTo, e.note].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {when(e.paidAt)} · {EXPENSE_PAYMENT[e.paidWith]}
                    {e.createdBy && ` · added by ${e.createdBy.name}`}
                  </span>
                  <span className="tabular font-semibold">{rupees(e.amountPaise)}</span>
                  {owner && (
                    <DeleteExpenseButton
                      id={e.id}
                      label={`${EXPENSE_CATEGORY[e.category]} ${rupees(e.amountPaise)}`}
                    />
                  )}
                </div>
                {owner && (
                  <details className="mt-2">
                    <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                      <Pencil className="size-3" aria-hidden /> Edit
                    </summary>
                    <div className="mt-3 rounded-2xl bg-muted/50 p-3">
                      <ExpenseForm
                        owner
                        today={todayKey}
                        expense={{
                          id: e.id,
                          day: isoDay(e.paidAt),
                          amountPaise: e.amountPaise,
                          category: e.category,
                          paidWith: e.paidWith,
                          paidTo: e.paidTo,
                          note: e.note,
                        }}
                      />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
