import { ArrowRight, Clock, Tag } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/brand/reveal";
import { VegMark } from "@/components/brand/veg-mark";
import { ItemImage } from "@/components/menu/item-art";
import { Price } from "@/components/menu/price";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { offerEndsLabel } from "@/lib/offers";
import { cn } from "@/lib/utils";

// the band behind the tickets; the ticket notches are cut out in the same colour
const BAND = "bg-[#fff1df] dark:bg-[#07160c]";

/** A coupon: photo and dish, a perforated tear line, then a stub with the % off. */
function OfferTicket({
  item,
  today,
  large,
  orderingEnabled,
}: {
  item: MenuItem;
  today: string;
  large: boolean;
  orderingEnabled: boolean;
}) {
  const was = item.wasPrice!;
  const percentOff = Math.round((1 - item.price / was) * 100);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#FF8A00]/30 bg-white shadow-xl shadow-[#C2410C]/10 sm:flex-row dark:border-transparent dark:bg-[#16251b] dark:shadow-2xl dark:shadow-black/30">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[#e2efe5] dark:bg-[#1f3325]",
          large ? "aspect-[16/10] sm:aspect-auto sm:w-64" : "aspect-[16/10] sm:aspect-auto sm:w-40",
        )}
      >
        <ItemImage
          item={item}
          sizes={large ? "(min-width: 640px) 256px, 100vw" : "(min-width: 640px) 160px, 100vw"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <h3
          className={cn(
            "flex items-center gap-2 font-black tracking-tight text-[#0f1f15] dark:text-[#eef5ef]",
            large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
          )}
        >
          <VegMark className="size-4 shrink-0" />
          <span className="min-w-0">{item.name}</span>
        </h3>
        {item.offer!.title && (
          <p className="mt-1 text-sm font-bold text-[#055c1b] dark:text-[#7ddc78]">{item.offer!.title}</p>
        )}
        {large && item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#334b3c] dark:text-[#a7b8ac]">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex flex-col">
            <Price item={item} className={large ? "text-3xl" : "text-2xl"} />
            <span className="text-xs font-bold text-[#055c1b] dark:text-[#7ddc78]">
              You save {formatINR(was - item.price)}
            </span>
          </div>
          <Link
            href={`/menu?item=${encodeURIComponent(item.id)}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#0f2e1a] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#055c1b] active:scale-95 dark:bg-[#7ddc78] dark:text-[#0f1f15] dark:hover:bg-[#98f992]"
          >
            {orderingEnabled ? "Grab it" : "See on the menu"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* tear line with notches cut into the ticket */}
      <div
        aria-hidden
        className="relative h-0 border-t-2 border-dashed border-[#FF8A00]/50 sm:h-auto sm:w-0 sm:border-t-0 sm:border-l-2"
      >
        <span className={cn("absolute -top-3 -left-3 size-6 rounded-full sm:-top-3 sm:-left-3", BAND)} />
        <span
          className={cn(
            "absolute -top-3 -right-3 size-6 rounded-full sm:top-auto sm:right-auto sm:-bottom-3 sm:-left-3",
            BAND,
          )}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 bg-[#FF8A00] px-5 py-4 text-[#1a1206] sm:w-36 sm:flex-col sm:justify-center sm:px-3 sm:text-center">
        <p className="leading-none">
          <span className={cn("tabular font-black tracking-tighter", large ? "text-5xl" : "text-4xl")}>
            {percentOff}%
          </span>
          <span className="ml-1 text-sm font-black tracking-widest uppercase sm:ml-0 sm:block sm:pt-1">
            off
          </span>
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#1a1206]/10 px-2.5 py-1 text-[11px] font-bold">
          <Clock className="size-3" aria-hidden />
          {offerEndsLabel(item.offer!.endsOn, today)}
        </span>
      </div>
    </article>
  );
}

/** Dishes on offer today, as coupons on a dark band under the hero. Renders nothing when there's no offer. */
export function TodaysOffers({
  items,
  today,
  orderingEnabled,
}: {
  items: MenuItem[];
  today: string;
  orderingEnabled: boolean;
}) {
  const offers = items.filter((i) => i.wasPrice !== undefined && i.available);
  if (!offers.length) return null;
  const single = offers.length === 1;

  return (
    <section
      id="offers"
      aria-labelledby="offers-title"
      className={cn(
        "relative overflow-hidden border-y border-[#FF8A00]/25 py-14 text-[#0f1f15] sm:py-16 dark:border-transparent dark:text-white",
        BAND,
      )}
    >
      {/* faint diagonal stripes, like a sale sticker */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(135deg,#FF8A00_0_2px,transparent_2px_22px)] opacity-[0.08] dark:[background-image:repeating-linear-gradient(135deg,#fff_0_2px,transparent_2px_22px)] dark:opacity-[0.06]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-md bg-[#FF8A00] px-3 py-1 text-xs font-black tracking-widest text-[#1a1206] uppercase">
            <Tag className="size-3.5" aria-hidden />
            {single ? "Today's offer" : "Today's offers"}
          </span>
          <h2 id="offers-title" className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">
            {single ? "Special price, for a short time" : "Special prices, for a short time"}
          </h2>
        </div>

        <div className={cn("grid gap-6", single ? "mx-auto max-w-4xl" : "lg:grid-cols-2")}>
          {offers.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.05} className="h-full">
              <OfferTicket item={item} today={today} large={single} orderingEnabled={orderingEnabled} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
