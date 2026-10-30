import { DeleteOfferButton, OfferForm } from "@/components/admin/offers/offer-form";
import { requireUser } from "@/lib/auth/dal";
import { today as todayKey } from "@/lib/data/cash";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { offerEndsLabel } from "@/lib/offers";

export const metadata = { title: "Today's offer" };

const rupees = (paise: number) => formatINR(toRupees(paise));
const date = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

/** Owner and developer: put a lower price on a dish for a day or a few days. */
export default async function OffersPage() {
  await requireUser("website");
  const today = todayKey();
  const [offers, dishes] = await Promise.all([
    db.offer.findMany({
      where: { endsOn: { gte: today } },
      orderBy: [{ startsOn: "asc" }, { createdAt: "asc" }],
      include: { menuItem: { select: { name: true, pricePaise: true, visible: true } } },
    }),
    db.menuItem.findMany({
      where: { visible: true, category: { visible: true } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, pricePaise: true, category: { select: { name: true } } },
    }),
  ]);
  const running = offers.filter((o) => o.startsOn <= today);
  const coming = offers.filter((o) => o.startsOn > today);

  const list = (rows: typeof offers, empty: string) =>
    rows.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {empty}
      </p>
    ) : (
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map((o) => {
          const notLower = o.pricePaise >= o.menuItem.pricePaise;
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {o.menuItem.name}
                  {o.title && <span className="font-normal text-muted-foreground"> · {o.title}</span>}
                </p>
                <p className="text-sm">
                  <span className="font-bold text-[#C2410C] dark:text-[#FF8A00]">{rupees(o.pricePaise)}</span>{" "}
                  <s className="text-muted-foreground">{rupees(o.menuItem.pricePaise)}</s>
                  <span className="text-muted-foreground">
                    {" · "}
                    {o.startsOn === o.endsOn ? date(o.startsOn) : `${date(o.startsOn)} – ${date(o.endsOn)}`}
                    {o.startsOn <= today && ` · ${offerEndsLabel(o.endsOn, today)}`}
                  </span>
                </p>
                {(notLower || !o.menuItem.visible) && (
                  <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Not shown:{" "}
                    {!o.menuItem.visible
                      ? "the dish is hidden on the menu."
                      : "the menu price is now the same or lower than the offer."}
                  </p>
                )}
              </div>
              <DeleteOfferButton id={o.id} name={o.menuItem.name} />
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Today&apos;s offer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Put a lower price on a dish for a day or a few days. The website and QR menu show the offer price
          with the regular price struck through, and orders on those days are charged the offer price. With no
          offer, nothing extra shows.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Running now</h2>
        {list(running, "No offer today.")}
      </section>

      {coming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Coming up</h2>
          {list(coming, "")}
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold">Add an offer</h2>
        <OfferForm
          today={today}
          dishes={dishes.map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category.name,
            price: toRupees(d.pricePaise),
          }))}
        />
      </section>
    </div>
  );
}
