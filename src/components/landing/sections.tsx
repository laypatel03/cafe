"use client";

import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Clock,
  Egg,
  Flame,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
  Waves,
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
    icon: Waves,
    title: "Zero Seed Oils",
    body: "No inflammatory refined palm, sunflower, or soybean oils. We roast, sauté, and air-fry exclusively with pure cold-pressed oils and A2 Vedic ghee.",
    tag: "Gut & Heart Friendly",
  },
  {
    icon: Egg,
    title: "Real Plant Protein",
    body: "No artificial chemical powders or fake fillers. 20g to 38g protein verified from non-GMO paneer, organic tofu, sprouted moong, edamame & soya nuggets.",
    tag: "Lab-Tested Density",
  },
  {
    icon: UtensilsCrossed,
    title: "100% Made to Order",
    body: "Vegetables are sliced upon ticket trigger, sourdoughs are toasted hot, and dressings are emulsified freshly without preservatives or stabilizers.",
    tag: "Maximum Crunch",
  },
  {
    icon: ShieldCheck,
    title: "Transparent Macros",
    body: "Log with zero guesswork. We display exact grams of protein, complex carbs, healthy fats, and net active calories directly on receipt & menu.",
    tag: "MyFitnessPal Friendly",
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
          eyebrow="The Clean Fuel Protocol"
          title="How we redefine Vegetarian Street & Comfort Food"
          subtitle="Healthy food shouldn't feel like a clinical chore. Every recipe is calibrated for intense taste, whole-food bio-availability, and sustained athletic energy."
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
  ).slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeading
        eyebrow="Trending in Kitchen Today"
        title="Chef's High-Protein Favorites"
        subtitle="Guest-voted bestsellers engineered with real-food macros, zero trans fats, and maximum taste."
      />

      {/* Filter Tabs */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {[
          { id: "all", label: "All Signatures" },
          { id: "high-protein", label: "High Protein (>20g)" },
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
          <span className="text-xl font-black tracking-tight text-white sm:text-2xl">
            Discover all 40+ Macro-Calibrated Delights
          </span>
          <span className="mt-1 text-sm font-medium text-white/85">
            Keto salads, stone-ground sourdough wraps, botanical smoothies & sugar-free chia bowls.
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

export function MacronutrientsAndCommunity() {
  return (
    <section className="border-t border-[#d7eadb] bg-[#f2faf3] py-20 sm:py-28 dark:border-[#24392b] dark:bg-[#0a1a0f]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Macronutrient Profile"
          title="The Healthy Hunger Standard"
          subtitle="Calibrated for athletic bioavailability, sustained energy, and zero post-meal fatigue."
        />

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-12">
          {/* Left: Macro Standard Breakdown */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#cde5d3] bg-white p-6 shadow-sm sm:p-8 lg:col-span-7 dark:border-[#24392b] dark:bg-[#16251b]">
            <div>
              <span className="text-xs font-black tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
                Balanced Nutrition Blueprint
              </span>
              <h3 className="mt-1 text-2xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
                Precision Whole-Food Fuel
              </h3>
              <p className="mt-2 text-sm leading-relaxed font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                Every recipe is formulated so you never have to trade culinary pleasure for fitness goals.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">
                      Clean Protein (Paneer, Tofu, Soya, Sprouts)
                    </span>
                    <span className="text-[#055c1b] dark:text-[#7ddc78]">28.4g (34%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8f1ea] dark:bg-[#24392b]">
                    <div className="h-full w-[34%] rounded-full bg-[#055c1b]" />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">
                      Slow-Burn Complex Carbs (Quinoa, Sourdough, Oats)
                    </span>
                    <span className="text-[#ea580c]">42.1g (46%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8f1ea] dark:bg-[#24392b]">
                    <div className="h-full w-[46%] rounded-full bg-[#ea580c]" />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">
                      Heart-Healthy Fats (Avocado, Cold-Pressed, Flax)
                    </span>
                    <span className="text-amber-500">12.5g (20%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8f1ea] dark:bg-[#24392b]">
                    <div className="h-full w-[20%] rounded-full bg-amber-500" />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">
                      Active Prebiotic Fiber (Gut Health)
                    </span>
                    <span className="text-[#55a90d]">11.2g (100% Daily Target)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8f1ea] dark:bg-[#24392b]">
                    <div className="h-full w-[100%] rounded-full bg-[#55a90d]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[#e8f1ea] pt-4 text-xs font-semibold text-[#334b3c] dark:border-[#24392b] dark:text-[#a7b8ac]">
              QR codes on every dine-in table display precise glycemic load, sodium levels, and allergen flags
              in real time.
            </div>
          </div>

          {/* Right: Nutrition Transparency & Standards (No static reviews) */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#cde5d3] bg-white p-6 shadow-sm sm:p-8 lg:col-span-5 dark:border-[#24392b] dark:bg-[#16251b]">
            <div>
              <span className="text-xs font-black tracking-wider text-[#ea580c] uppercase">
                Our Kitchen Integrity
              </span>
              <h3 className="mt-1 text-xl font-black text-[#0f1f15] sm:text-2xl dark:text-[#eef5ef]">
                Zero Compromise Vegetarian
              </h3>
              <p className="mt-2 text-sm leading-relaxed font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                We believe what we leave out of our food is just as important as what we put in.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#055c1b]/10 text-[#055c1b] dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                      Zero Seed Oils Ever
                    </h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#334b3c] dark:text-[#a7b8ac]">
                      Only pure wood-pressed cold mustard oil, peanut oil, and traditional A2 Vedic ghee.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#ea580c]/10 text-[#ea580c]">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                      100% Unprocessed Dairy
                    </h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#334b3c] dark:text-[#a7b8ac]">
                      Fresh malai paneer sourced daily with zero synthetic starch fillers or chemical
                      preservatives.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#55a90d]/10 text-[#55a90d]">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                      Authentic Macro Counts
                    </h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#334b3c] dark:text-[#a7b8ac]">
                      Every single dish has certified protein, calories, and fiber verified by nutritionists.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[#e8f1ea] pt-4 dark:border-[#24392b]">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 text-xs font-black text-[#055c1b] hover:underline dark:text-[#7ddc78]"
              >
                <span>Explore all macro-calibrated dishes</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
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
  const links = [
    cafe.phone && { icon: Phone, label: cafe.phone, href: `tel:${cafe.phone.replace(/\s/g, "")}` },
    cafe.whatsapp && { icon: MessageCircle, label: "WhatsApp Order", href: `https://wa.me/${cafe.whatsapp}` },
    cafe.instagram && {
      icon: AtSign,
      label: `@${cafe.instagram}`,
      href: `https://instagram.com/${cafe.instagram}`,
    },
  ].filter((l) => !!l);

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

                {/* Subtitle (No Wi-Fi, No work tables) */}
                <p className="mt-3.5 max-w-xl text-sm leading-relaxed font-medium text-[#334b3c] sm:text-base dark:text-[#a7b8ac]">
                  Step into our open-kitchen dining space. Featuring fresh wholesome meals prepared fresh to
                  order, zero refined seed oils, and certified clean macros.
                </p>

                {/* Two Sub-Blocks: Opening Hours & Café Location */}
                <div className="mt-8 grid grid-cols-1 gap-5 border-t border-[#e8f1ea] pt-6 sm:grid-cols-2 dark:border-[#24392b]">
                  {/* Opening Hours */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#055c1b]/10 text-[#055c1b] dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
                      <Clock className="size-5.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-black tracking-wider text-[#0f1f15] uppercase dark:text-[#eef5ef]">
                        Opening Hours
                      </span>
                      <div className="mt-1 space-y-1 text-xs font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                        {cafe.hours.map((h) => (
                          <div key={h.days}>
                            <span className="font-bold text-[#0f1f15] dark:text-[#eef5ef]">{h.days}</span>
                            <p className="tabular font-semibold text-[#055c1b] dark:text-[#7ddc78]">
                              {h.time}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Café Location */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-[#ea580c] dark:bg-orange-500/25">
                      <MapPin className="size-5.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-black tracking-wider text-[#0f1f15] uppercase dark:text-[#eef5ef]">
                        Café Location
                      </span>
                      <p className="mt-1 text-xs leading-relaxed font-medium text-[#334b3c] dark:text-[#a7b8ac]">
                        {cafe.address && cafe.address !== "Address to be confirmed"
                          ? cafe.address
                          : "Chocolate Heaven Building Chikli, 301–310, Bilimora – Chikhli Rd, opp Olive Hospital Chikhli, Nandarkha, Bilimora, Gujarat 396325"}
                      </p>
                    </div>
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

              {/* Social / Contact Badges */}
              {links.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-bold text-[#5c7263] dark:text-[#a7b8ac]">Connect:</span>
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e3d9] bg-[#f1f5f2] px-3 py-1.5 text-[11px] font-bold text-[#1c2e23] transition-colors hover:bg-[#055c1b] hover:text-white dark:border-[#2b4334] dark:bg-[#1d3325] dark:text-[#eef5ef] dark:hover:bg-[#7ddc78] dark:hover:text-[#0e1a12]"
                    >
                      <l.icon className="size-3" />
                      <span>{l.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Ambiance Image Showcase */}
            <div className="relative lg:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#cde5d3] bg-[#e2efe5] shadow-lg sm:aspect-[16/11] lg:aspect-[4/3] dark:border-[#24392b] dark:bg-[#1f3325]">
                <Image
                  src="/brand/cafe-ambiance.jpg"
                  alt="Healthy Hunger Café Ambiance"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                {/* Bottom Floating Badge */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-[#055c1b]/20 bg-white/95 px-3.5 py-1.5 shadow-md backdrop-blur-md dark:bg-[#0e1a12]/95">
                  <VegMark className="size-4" />
                  <span className="text-xs font-extrabold tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
                    100% Pure Veg · Clean Dining
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
