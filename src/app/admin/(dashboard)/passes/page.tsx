import Link from "next/link";
import { SortButtons } from "@/components/admin/sort-buttons";
import {
  EditPlanButton,
  PlanForm,
  PlanOnSaleSwitch,
  RefundPassButton,
} from "@/components/admin/passes/pass-forms";
import { requireUser } from "@/lib/auth/dal";
import { today as todayKey } from "@/lib/data/cash";
import { COUNTED_USES, getPasses } from "@/lib/data/meal-passes";
import { db } from "@/lib/db";
import { type MealPart, mealsSummary, readParts } from "@/lib/meal-pass";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payments";
import { cn } from "@/lib/utils";

export const metadata = { title: "Meal passes" };

const rupees = (paise: number) => formatINR(toRupees(paise));
const day = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};
const STATUS_STYLE: Record<string, string> = {
  active: "bg-hh-green/15 text-hh-green dark:text-hh-green-light",
  upcoming: "bg-secondary text-secondary-foreground",
  "used up": "bg-muted text-muted-foreground",
  lapsed: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/10 text-destructive",
};
const planMeals = (parts: MealPart[]) =>
  mealsSummary(
    parts,
    parts.map((p) => p.meals),
  );

const PASS_SORTS = { new: "Newest", ends: "Ends soonest", left: "Most meals left" };
type PassSort = keyof typeof PASS_SORTS;

/** Owner: the pass plans on sale, every pass sold, and what's still owed to guests. */
export default async function PassesPage({ searchParams }: PageProps<"/admin/passes">) {
  await requireUser("OWNER");
  const { show, sort: sortParam } = await searchParams;
  const all = show === "all";
  const sort: PassSort = sortParam === "ends" || sortParam === "left" ? sortParam : "new";
  const passesHref = (to: { all?: boolean; sort?: PassSort }) => {
    const q = new URLSearchParams();
    if (to.all ?? all) q.set("show", "all");
    const sortTo = to.sort ?? sort;
    if (sortTo !== "new") q.set("sort", sortTo);
    const qs = q.toString();
    return qs ? `/admin/passes?${qs}` : "/admin/passes";
  };
  const today = todayKey();
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00`);

  const [planRows, categories, passes, settings, usedThisMonth] = await Promise.all([
    db.mealPlan.findMany({ orderBy: [{ active: "desc" }, { pricePaise: "asc" }] }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getPasses(all ? {} : { refundedAt: null, endsOn: { gte: today } }, today),
    db.cafeSettings.findUnique({ where: { id: 1 }, select: { mealPassRefundsEnabled: true } }),
    db.mealPassUse.count({ where: { ...COUNTED_USES, createdAt: { gte: monthStart } } }),
  ]);
  const soldThisMonth = await db.mealPass.aggregate({
    where: { createdAt: { gte: monthStart } },
    _count: true,
    _sum: { pricePaise: true },
  });
  const plans = planRows.map((p) => ({ ...p, parts: readParts(p.parts) }));
  const mealsLeft = (p: (typeof passes)[number]) => p.left.reduce((n, l) => n + l, 0);
  if (sort === "ends") passes.sort((a, b) => a.endsOn.localeCompare(b.endsOn) || b.number - a.number);
  if (sort === "left") passes.sort((a, b) => mealsLeft(b) - mealsLeft(a) || b.number - a.number);
  const running = passes.filter((p) => p.status === "active" || p.status === "upcoming");
  // meals still owed, added up by meal type name across passes
  const owed = new Map<string, number>();
  for (const p of running)
    p.parts.forEach((part, i) => owed.set(part.name, (owed.get(part.name) ?? 0) + p.left[i]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const names = (ids: string[]) =>
    ids
      .map((id) => categoryName.get(id))
      .filter(Boolean)
      .join(", ") || "no category";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Meal passes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guests pay up front for a number of meals to use within the plan&apos;s days. Sell a pass from the
          customer&apos;s page; staff use it when making the bill. Unused meals lapse at the end.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Running passes", String(running.length)],
          [
            "Meals still owed",
            mealsSummary(
              [...owed.keys()].map((name) => ({ name })),
              [...owed.values()],
            ),
          ],
          ["Sold this month", `${soldThisMonth._count} · ${rupees(soldThisMonth._sum.pricePaise ?? 0)}`],
          ["Meals used this month", String(usedThisMonth)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="tabular text-lg font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="passes-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="passes-h" className="text-lg font-bold">
            {all ? "All passes" : "Running and coming up"}{" "}
            <span className="text-sm font-normal text-muted-foreground">{passes.length}</span>
          </h2>
          <Link href={passesHref({ all: !all })} className="text-sm font-semibold hover:underline">
            {all ? "Show running only" : "Show all, including lapsed and refunded"}
          </Link>
        </div>
        {passes.length > 1 && (
          <SortButtons
            current={sort}
            options={(Object.keys(PASS_SORTS) as PassSort[]).map((k) => ({
              key: k,
              label: PASS_SORTS[k],
              href: passesHref({ sort: k }),
            }))}
          />
        )}
        {passes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No passes yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {passes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-semibold">#{p.number}</span>
                {p.customerId ? (
                  <Link href={`/admin/customers/${p.customerId}`} className="font-semibold hover:underline">
                    {p.customerName}
                  </Link>
                ) : (
                  <span className="font-semibold">{p.customerName}</span>
                )}
                <span className="text-muted-foreground">{p.planName}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                    STATUS_STYLE[p.status],
                  )}
                >
                  {p.status}
                </span>
                <span className="min-w-0 basis-full text-muted-foreground sm:flex-1 sm:basis-0">
                  {mealsSummary(p.parts, p.left)} left of {planMeals(p.parts)} · {day(p.startsOn)} –{" "}
                  {day(p.endsOn)}
                  {p.refundedAt && p.refundPaise !== null && ` · refunded ${rupees(p.refundPaise)}`}
                </span>
                <span className="tabular font-semibold">{rupees(p.pricePaise)}</span>
                <span className="text-xs text-muted-foreground">{PAYMENT_LABEL[p.method]}</span>
                {settings?.mealPassRefundsEnabled && !p.refundedAt && (
                  <RefundPassButton
                    pass={{
                      id: p.id,
                      number: p.number,
                      pricePaise: p.pricePaise,
                      customerName: p.customerName,
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {!settings?.mealPassRefundsEnabled && (
          <p className="text-xs text-muted-foreground">
            To refund a pass, turn on Settings → Editing → &ldquo;Refund meal passes&rdquo;.
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="plans-h">
        <h2 id="plans-h" className="text-lg font-bold">
          Plans
        </h2>
        {plans.length > 0 && (
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <p className={cn("font-semibold", !p.active && "text-muted-foreground line-through")}>
                    {p.name} · {rupees(p.pricePaise)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {planMeals(p.parts)} in {p.days} days
                    {p.parts.map(
                      (x) =>
                        ` · ${x.name.toLowerCase()}: ${names(x.categoryIds)} up to ${rupees(x.capPaise)}`,
                    )}
                  </p>
                </div>
                <EditPlanButton plan={p} categories={categories} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.active ? "On sale" : "Off"}</span>
                  <PlanOnSaleSwitch id={p.id} name={p.name} active={p.active} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-3xl border border-dashed border-border p-5">
          <p className="mb-3 text-sm font-semibold">Add a plan</p>
          <PlanForm categories={categories} />
        </div>
      </section>
    </div>
  );
}
