"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { NutritionLabel } from "@/components/brand/nutrition-label";
import { Reveal } from "@/components/brand/reveal";
import { VegMark } from "@/components/brand/veg-mark";
import { ArticleCard } from "@/components/blog/article-card";
import { ItemImage } from "@/components/menu/item-art";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/articles";
import type { CafeDetails } from "@/lib/data/menu";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#055c1b]/20 bg-[#055c1b]/10 px-3 py-1 text-xs font-bold tracking-wider text-[#055c1b] uppercase dark:border-[#7ddc78]/30 dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
        <Sparkles className="size-3.5" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-3xl leading-[1.15] font-black tracking-tight text-balance text-[#0f1f15] sm:text-4xl lg:text-5xl dark:text-[#eef5ef]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base leading-relaxed font-medium text-[#334b3c] sm:text-lg dark:text-[#a7b8ac]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function TodaysPick({ item }: { item: MenuItem }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[#b0c4b2]/50 bg-white p-6 shadow-xl sm:p-10 lg:p-12 dark:border-[#24392b] dark:bg-[#16251b]">
          {/* Subtle gradient corner */}
          <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-bl-full bg-gradient-to-bl from-orange-200/40 to-transparent dark:from-orange-500/10" />

          <div className="relative grid items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-start gap-4 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ea580c]/10 px-3.5 py-1 text-xs font-black tracking-wider text-[#ea580c] uppercase">
                <Flame className="size-3.5 fill-current" />
                <span>Today&apos;s Highlight</span>
              </div>

              <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-[#0f1f15] sm:text-4xl lg:text-5xl dark:text-[#eef5ef]">
                <VegMark className="size-5 shrink-0" />
                <span>{item.name}</span>
              </h2>

              <p className="max-w-xl text-base leading-relaxed font-medium text-[#334b3c] sm:text-lg dark:text-[#a7b8ac]">
                {item.description}
              </p>

              {item.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {[...new Set(item.ingredients)].slice(0, 6).map((ing) => (
                    <span
                      key={ing}
                      className="rounded-full border border-[#d6e3d9] bg-[#f1f5f2] px-3 py-1 text-xs font-bold text-[#1c2e23] dark:border-[#2b4334] dark:bg-[#1d3325] dark:text-[#eef5ef]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 pt-2">
                <span className="tabular text-3xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
                  {formatINR(item.price)}
                </span>
                <Link
                  href={`/menu?item=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#c2410c] hover:shadow-lg active:scale-95"
                >
                  <span>Order This Now</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row lg:col-span-5 lg:flex-col">
              <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-[#cde5d3] shadow-lg dark:border-[#24392b]">
                <ItemImage
                  item={item}
                  sizes="(min-width: 640px) 320px, 80vw"
                  className="aspect-[4/3] w-full"
                />
              </div>
              <NutritionLabel
                protein={item.protein}
                kcal={item.kcal}
                className="w-full max-w-xs border-[#cde5d3] bg-white dark:border-[#24392b] dark:bg-[#16251b]"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const PROTOCOL_PILLARS = [
  {
    icon: Leaf,
    title: "100% vegetarian",
    body: "No meat, no eggs, ever. One kitchen, one promise.",
    tag: "Veg only",
  },
  {
    icon: Dumbbell,
    title: "Protein from real food",
    body: "Paneer, yoghurt, chana, sprouts, nuts – not just powder.",
    tag: "Everyday ingredients",
  },
  {
    icon: UtensilsCrossed,
    title: "Made in our kitchen",
    body: "Bowls and salads are made every morning in small batches.",
    tag: "Small batches",
  },
  {
    icon: ShieldCheck,
    title: "Numbers you can see",
    body: "Every dish shows our estimate of its protein and calories, worked out from the ingredients in the recipe.",
    tag: "Our own estimates",
  },
];

export function OurPromise() {
  return (
    <section
      id="promise"
      className="border-y border-[#d7eadb] bg-[#f2faf3] py-20 sm:py-28 dark:border-[#24392b] dark:bg-[#0a1a0f]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Our promise"
          title="Vegetarian street and comfort food, made simply"
          subtitle="Ingredients you know, cooked in our own kitchen – and the protein and calories of each dish shown on the menu."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROTOCOL_PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="group flex h-full flex-col justify-between rounded-3xl border border-[#cde5d3] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-[#24392b] dark:bg-[#16251b]">
                <div>
                  <div className="mb-5 inline-flex size-13 items-center justify-center rounded-2xl bg-[#055c1b] text-white shadow-md shadow-emerald-950/15 transition-colors duration-300 group-hover:bg-[#ea580c]">
                    <p.icon className="size-6 text-white" aria-hidden />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-[#0f1f15] dark:text-[#eef5ef]">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                    {p.body}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 border-t border-[#e8f1ea] pt-4 text-xs font-black text-[#055c1b] dark:border-[#24392b] dark:text-[#7ddc78]">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{p.tag}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Bestsellers({
  items,
  orderingEnabled = true,
}: {
  items: MenuItem[];
  orderingEnabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "high-protein" | "sourdough" | "bowls">("all");

  const filteredItems = items.filter((item) => {
    if (!item.available || item.price <= 0) return false;
    if (activeTab === "high-protein") return item.protein >= 20;
    if (activeTab === "sourdough")
      return item.category.includes("toast") || item.category.includes("sandwich");
    if (activeTab === "bowls") {
      return (
        item.category.includes("bowl") ||
        item.category.includes("salad") ||
        item.category.includes("oat") ||
        item.category.includes("smoothie")
      );
    }
    // "all": select bestsellers or high-protein or diverse categories
    return item.tags.includes("bestseller") || item.protein >= 15 || item.photo;
  });

  const displayList = (
    filteredItems.length > 0 ? filteredItems : items.filter((i) => i.available && i.price > 0)
  ).slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeading
        eyebrow="Bestsellers"
        title="What everyone orders"
        subtitle="The dishes our guests order most."
      />

      {/* Filter Tabs */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {[
          { id: "all", label: "All Signatures" },
          { id: "high-protein", label: "20 g+ protein" },
          { id: "sourdough", label: "Sourdough Melts" },
          { id: "bowls", label: "Super Bowls" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 sm:text-sm",
              activeTab === tab.id
                ? "bg-[#055c1b] text-white shadow-sm"
                : "bg-[#e8f4ec] text-[#283c2e] hover:bg-[#055c1b] hover:text-white dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:bg-[#055c1b] dark:hover:text-white",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dish Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayList.map((item, i) => (
          <Reveal key={item.id} delay={i * 0.05}>
            <div className="group flex h-full flex-col justify-between rounded-3xl border border-[#cde5d3] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-[#24392b] dark:bg-[#16251b]">
              <div>
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#e2efe5] dark:bg-[#1f3325]">
                  <ItemImage
                    item={item}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 90vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <VegMark className="size-4 shadow-xs" />
                    {item.protein >= 20 && (
                      <span className="rounded-full bg-[#055c1b] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow">
                        {item.protein}g Protein
                      </span>
                    )}
                  </div>
                  {item.kcal > 0 && (
                    <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-[#0f1f15]/85 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm backdrop-blur-md">
                      <Flame className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>{item.kcal} kcal</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="px-1 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
                    <span>{item.tags.includes("bestseller") ? "Bestseller" : "Signature"}</span>
                  </div>
                  <h3 className="mt-1 text-lg leading-snug font-black text-[#0f1f15] transition-colors group-hover:text-[#055c1b] dark:text-[#eef5ef] dark:group-hover:text-[#7ddc78]">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed font-medium text-[#334b3c] sm:text-sm dark:text-[#a7b8ac]">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Price & Add */}
              <div className="mt-4 flex items-center justify-between border-t border-[#e8f1ea] px-1 pt-3 dark:border-[#24392b]">
                <span className="tabular text-xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
                  {formatINR(item.price)}
                </span>
                <Link
                  href={`/menu?item=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ea580c] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#c2410c] hover:shadow active:scale-95"
                >
                  <span>{orderingEnabled ? "+ Add" : "View"}</span>
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Bottom CTA Banner */}
      <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-[#055c1b] via-[#0c6b25] to-[#0e5518] p-6 text-white shadow-xl sm:flex-row sm:p-8">
        <div className="flex flex-col text-center sm:text-left">
          <span className="text-xl font-black tracking-tight text-white sm:text-2xl">See the full menu</span>
          <span className="mt-1 text-sm font-medium text-white/85">
            Salads and bowls, chaat, toasts, sandwiches, oats, smoothies, tea and coffee.
          </span>
        </div>
        <Link
          href="/menu"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#055c1b] shadow-md transition-colors hover:bg-[#e7f4eb]"
        >
          <span>View Complete Menu</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

const COUNT_STEPS = [
  {
    title: "We write down each recipe",
    body: "Every ingredient that goes into one serving, and how much of it.",
  },
  {
    title: "We add up the ingredients",
    body: "Using the protein and calories of each ingredient, we total them for the dish.",
  },
  {
    title: "We show the result on the menu",
    body: "Next to every dish, so you can choose what suits you.",
  },
];

/** How the café works out its protein and calorie numbers – they're estimates, not certified values. */
export function HowWeCount() {
  return (
    <section className="border-t border-[#d7eadb] bg-[#f2faf3] py-20 sm:py-28 dark:border-[#24392b] dark:bg-[#0a1a0f]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How we count"
          title="Where our protein and calorie numbers come from"
          subtitle="We worked them out ourselves, dish by dish."
        />

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {COUNT_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-3xl border border-[#cde5d3] bg-white p-6 shadow-sm dark:border-[#24392b] dark:bg-[#16251b]"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#055c1b] text-sm font-black text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-black text-[#0f1f15] dark:text-[#eef5ef]">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-[#ea580c]/30 bg-[#ea580c]/5 p-5 sm:p-6">
          <Info className="mt-0.5 size-5 shrink-0 text-[#c2410c]" aria-hidden />
          <p className="text-sm leading-relaxed font-medium text-[#334b3c] dark:text-[#cde5d3]">
            <strong className="text-[#0f1f15] dark:text-[#eef5ef]">These are our own estimates.</strong> They
            are not lab-tested, and no nutritionist or dietitian has checked them. Portions and ingredients
            vary a little, so the real numbers can be a bit higher or lower. If you have a medical condition,
            follow a special diet or have a food allergy, please ask our staff before you order.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FromOurKitchen({ articles }: { articles: Article[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="From our kitchen" title="Eat well, knowing why." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.06}>
            <ArticleCard article={a} />
          </Reveal>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline" className="h-11 rounded-full px-5 font-bold">
          <Link href="/blog">
            All articles <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function VisitUs({ cafe }: { cafe: CafeDetails }) {
  return (
    <section id="visit" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal>
        <div className="overflow-hidden rounded-[36px] border border-[#cde5d3] bg-white p-6 shadow-xl sm:p-10 lg:p-12 dark:border-[#24392b] dark:bg-[#16251b]">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Info & Details */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                {/* Pill Tag */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#055c1b]/20 bg-[#055c1b]/10 px-3.5 py-1.5 text-[11px] font-black tracking-wider text-[#055c1b] uppercase dark:border-[#7ddc78]/30 dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
                  <Store className="size-3.5" />
                  <span>Dine-In • Takeaway</span>
                </div>

                {/* Heading */}
                <h2 className="text-3xl leading-[1.15] font-extrabold tracking-tight text-[#0f1f15] sm:text-4xl lg:text-[40px] dark:text-[#eef5ef]">
                  Experience Healthy Hunger Café
                </h2>

                {/* Subtitle */}
                <p className="mt-3.5 max-w-xl text-sm leading-relaxed font-medium text-[#334b3c] sm:text-base dark:text-[#a7b8ac]">
                  Sit down for a bowl, grab a chaat on the go, or order takeaway from the menu on your phone.
                </p>

                {/* Opening Hours Block */}
                <div className="mt-8 border-t border-[#e8f1ea] pt-6 dark:border-[#24392b]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#055c1b]/10 text-[#055c1b] dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
                        <Clock className="size-4.5" />
                      </div>
                      <span className="text-xs font-black tracking-wider text-[#0f1f15] uppercase dark:text-[#eef5ef]">
                        Weekly Opening Hours
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {cafe.hours.map((h) => (
                      <div
                        key={h.days}
                        className="rounded-2xl border border-[#d6ebd9] bg-[#f4faf5] p-4 transition-colors hover:border-[#055c1b]/30 dark:border-[#24392b] dark:bg-[#132218]"
                      >
                        <span className="block text-[11px] font-black tracking-wider text-[#334b3c] uppercase dark:text-[#a7b8ac]">
                          {h.days}
                        </span>
                        <p className="mt-1 text-base font-extrabold tracking-tight text-[#055c1b] tabular sm:text-lg dark:text-[#7ddc78]">
                          {h.time}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5 border-t border-[#e8f1ea] pt-6 dark:border-[#24392b]">
                {cafe.mapUrl && (
                  <a
                    href={cafe.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#055c1b] px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-[#044c16] active:scale-95"
                  >
                    <MapPin className="size-4" />
                    <span>Get Directions</span>
                  </a>
                )}
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[#d2e2d6] bg-white px-6 py-3.5 text-sm font-extrabold text-[#0f1f15] shadow-xs transition-all hover:border-[#055c1b] hover:text-[#055c1b] active:scale-95 dark:border-[#2b4334] dark:bg-[#16251b] dark:text-[#eef5ef] dark:hover:border-[#7ddc78] dark:hover:text-[#7ddc78]"
                >
                  <Store className="size-4" />
                  <span>Order for Pickup</span>
                </Link>
              </div>
            </div>

            {/* Right column: a real photo of the café */}
            <div className="relative lg:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#cde5d3] bg-[#e2efe5] shadow-lg sm:aspect-[16/11] lg:aspect-[4/3] dark:border-[#24392b] dark:bg-[#1f3325]">
                <Image
                  src="/brand/cafe-interior.jpg"
                  alt="Inside Healthy Hunger: wooden tables, green chairs and framed food posters on a grey wall"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
