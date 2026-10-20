"use client";

import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Clock,
  Dumbbell,
  Egg,
  Flame,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NutritionLabel } from "@/components/brand/nutrition-label";
import { Reveal } from "@/components/brand/reveal";
import { TiltCard } from "@/components/brand/tilt-card";
import { VegMark } from "@/components/brand/veg-mark";
import { ItemImage } from "@/components/menu/item-art";
import { Button } from "@/components/ui/button";
import type { CafeDetails } from "@/lib/data/menu";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10 text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#055c1b]/10 dark:bg-[#055c1b]/25 border border-[#055c1b]/20 dark:border-[#7ddc78]/30 text-[#055c1b] dark:text-[#7ddc78] font-bold text-xs uppercase tracking-wider mb-3">
        <Sparkles className="size-3.5" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f1f15] dark:text-[#eef5ef] tracking-tight text-balance leading-[1.15]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base sm:text-lg text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function TodaysPick({ item }: { item: MenuItem }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[#b0c4b2]/50 dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 sm:p-10 lg:p-12 shadow-xl">
          {/* Subtle gradient corner */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-200/40 dark:from-orange-500/10 to-transparent rounded-bl-full pointer-events-none" />

          <div className="relative grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ea580c]/10 text-[#ea580c] font-black text-xs uppercase tracking-wider">
                <Flame className="size-3.5 fill-current" />
                <span>Today&apos;s Highlight</span>
              </div>

              <h2 className="flex items-center gap-3 text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f1f15] dark:text-[#eef5ef] tracking-tight">
                <VegMark className="size-5 shrink-0" />
                <span>{item.name}</span>
              </h2>

              <p className="text-base sm:text-lg text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed max-w-xl">
                {item.description}
              </p>

              {item.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {[...new Set(item.ingredients)].slice(0, 6).map((ing) => (
                    <span
                      key={ing}
                      className="rounded-full bg-[#f1f5f2] dark:bg-[#1d3325] border border-[#d6e3d9] dark:border-[#2b4334] px-3 py-1 text-xs font-bold text-[#1c2e23] dark:text-[#eef5ef]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 pt-2">
                <span className="text-3xl font-black text-[#0f1f15] dark:text-[#eef5ef] tabular">
                  {formatINR(item.price)}
                </span>
                <Link
                  href={`/menu?item=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white px-6 py-3 font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <span>Order This Now</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-6">
              <div className="w-full max-w-xs overflow-hidden rounded-2xl shadow-lg border border-[#cde5d3] dark:border-[#24392b]">
                <ItemImage item={item} sizes="(min-width: 640px) 320px, 80vw" className="aspect-[4/3] w-full" />
              </div>
              <NutritionLabel
                protein={item.protein}
                kcal={item.kcal}
                className="w-full max-w-xs bg-white dark:bg-[#16251b] border-[#cde5d3] dark:border-[#24392b]"
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
    <section id="promise" className="bg-[#f2faf3] dark:bg-[#0a1a0f] py-20 sm:py-28 border-y border-[#d7eadb] dark:border-[#24392b]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Clean Fuel Protocol"
          title="How we redefine Vegetarian Street & Comfort Food"
          subtitle="Healthy food shouldn't feel like a clinical chore. Every recipe is calibrated for intense taste, whole-food bio-availability, and sustained athletic energy."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-12">
          {PROTOCOL_PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="group h-full flex flex-col justify-between rounded-3xl border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div>
                  <div className="mb-5 inline-flex size-13 items-center justify-center rounded-2xl bg-[#055c1b] text-white shadow-md shadow-emerald-950/15 group-hover:bg-[#ea580c] transition-colors duration-300">
                    <p.icon className="size-6 text-white" aria-hidden />
                  </div>
                  <h3 className="text-xl font-black text-[#0f1f15] dark:text-[#eef5ef] tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-[#334b3c] dark:text-[#a7b8ac]">
                    {p.body}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e8f1ea] dark:border-[#24392b] flex items-center gap-1.5 text-xs font-black text-[#055c1b] dark:text-[#7ddc78]">
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

export function Bestsellers({ items, orderingEnabled = true }: { items: MenuItem[]; orderingEnabled?: boolean }) {
  const [activeTab, setActiveTab] = useState<"all" | "high-protein" | "sourdough" | "bowls">("all");

  const filteredItems = items.filter((item) => {
    if (!item.available || item.price <= 0) return false;
    if (activeTab === "high-protein") return item.protein >= 20;
    if (activeTab === "sourdough") return item.category.includes("toast") || item.category.includes("sandwich");
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

  const displayList = (filteredItems.length > 0 ? filteredItems : items.filter((i) => i.available && i.price > 0)).slice(0, 3);

  return (
    <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Trending in Kitchen Today"
        title="Chef's High-Protein Favorites"
        subtitle="Guest-voted bestsellers engineered with real-food macros, zero trans fats, and maximum taste."
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
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
              "px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer",
              activeTab === tab.id
                ? "bg-[#055c1b] text-white shadow-sm"
                : "bg-[#e8f4ec] dark:bg-[#16251b] text-[#283c2e] dark:text-[#cde5d3] hover:bg-[#055c1b] hover:text-white dark:hover:bg-[#055c1b] dark:hover:text-white"
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
            <div className="group h-full flex flex-col justify-between rounded-3xl border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div>
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#e2efe5] dark:bg-[#1f3325]">
                  <ItemImage
                    item={item}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 90vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <VegMark className="size-4 shadow-xs" />
                    {item.protein >= 20 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#055c1b] text-white text-[10px] font-black uppercase tracking-wider shadow">
                        {item.protein}g Protein
                      </span>
                    )}
                  </div>
                  {item.kcal > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 bg-[#0f1f15]/85 text-white font-extrabold text-[11px] backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Flame className="size-3.5 text-amber-400 fill-amber-400" />
                      <span>{item.kcal} kcal</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="pt-4 px-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#055c1b] dark:text-[#7ddc78] uppercase tracking-wider">
                    <span>{item.tags.includes("bestseller") ? "Bestseller" : "Signature"}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-black text-[#0f1f15] dark:text-[#eef5ef] leading-snug group-hover:text-[#055c1b] dark:group-hover:text-[#7ddc78] transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#334b3c] dark:text-[#a7b8ac] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Price & Add */}
              <div className="mt-4 pt-3 border-t border-[#e8f1ea] dark:border-[#24392b] flex items-center justify-between px-1">
                <span className="text-xl font-black text-[#0f1f15] dark:text-[#eef5ef] tabular">
                  {formatINR(item.price)}
                </span>
                <Link
                  href={`/menu?item=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs shadow-sm hover:shadow transition-all active:scale-95"
                >
                  <span>{orderingEnabled ? "+ Add" : "View"}</span>
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Bottom CTA Banner */}
      <div className="mt-12 rounded-3xl bg-gradient-to-r from-[#055c1b] via-[#0c6b25] to-[#0e5518] p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col text-center sm:text-left">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Discover all 40+ Macro-Calibrated Delights
          </span>
          <span className="text-sm font-medium text-white/85 mt-1">
            Keto salads, stone-ground sourdough wraps, botanical smoothies & sugar-free chia bowls.
          </span>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[#055c1b] hover:bg-[#e7f4eb] font-extrabold text-sm shadow-md transition-colors shrink-0"
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
    <section className="py-20 sm:py-28 bg-[#f2faf3] dark:bg-[#0a1a0f] border-t border-[#d7eadb] dark:border-[#24392b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Macronutrient Profile"
          title="The Healthy Hunger Standard"
          subtitle="Calibrated for athletic bioavailability, sustained energy, and zero post-meal fatigue."
        />

        <div className="grid gap-8 lg:grid-cols-12 items-stretch mt-12">
          {/* Left: Macro Standard Breakdown */}
          <div className="lg:col-span-7 rounded-3xl border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#055c1b] dark:text-[#7ddc78]">
                Balanced Nutrition Blueprint
              </span>
              <h3 className="text-2xl font-black text-[#0f1f15] dark:text-[#eef5ef] mt-1">
                Precision Whole-Food Fuel
              </h3>
              <p className="mt-2 text-sm text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed">
                Every recipe is formulated so you never have to trade culinary pleasure for fitness goals.
              </p>

              <div className="space-y-4 mt-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">Clean Protein (Paneer, Tofu, Soya, Sprouts)</span>
                    <span className="text-[#055c1b] dark:text-[#7ddc78]">28.4g (34%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#e8f1ea] dark:bg-[#24392b] overflow-hidden">
                    <div className="h-full bg-[#055c1b] rounded-full w-[34%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">Slow-Burn Complex Carbs (Quinoa, Sourdough, Oats)</span>
                    <span className="text-[#ea580c]">42.1g (46%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#e8f1ea] dark:bg-[#24392b] overflow-hidden">
                    <div className="h-full bg-[#ea580c] rounded-full w-[46%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">Heart-Healthy Fats (Avocado, Cold-Pressed, Flax)</span>
                    <span className="text-amber-500">12.5g (20%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#e8f1ea] dark:bg-[#24392b] overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[20%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-[#0f1f15] dark:text-[#eef5ef]">Active Prebiotic Fiber (Gut Health)</span>
                    <span className="text-[#55a90d]">11.2g (100% Daily Target)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#e8f1ea] dark:bg-[#24392b] overflow-hidden">
                    <div className="h-full bg-[#55a90d] rounded-full w-[100%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#e8f1ea] dark:border-[#24392b] text-xs font-semibold text-[#334b3c] dark:text-[#a7b8ac]">
              QR codes on every dine-in table display precise glycemic load, sodium levels, and allergen flags in real time.
            </div>
          </div>

          {/* Right: Nutrition Transparency & Standards (No static reviews) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 sm:p-8 shadow-sm">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#ea580c]">
                Our Kitchen Integrity
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0f1f15] dark:text-[#eef5ef] mt-1">
                Zero Compromise Vegetarian
              </h3>
              <p className="mt-2 text-sm text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed">
                We believe what we leave out of our food is just as important as what we put in.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-[#055c1b]/10 dark:bg-[#055c1b]/25 text-[#055c1b] dark:text-[#7ddc78] flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">Zero Seed Oils Ever</h4>
                    <p className="text-xs text-[#334b3c] dark:text-[#a7b8ac] mt-0.5 leading-relaxed">
                      Only pure wood-pressed cold mustard oil, peanut oil, and traditional A2 Vedic ghee.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-[#ea580c]/10 text-[#ea580c] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">100% Unprocessed Dairy</h4>
                    <p className="text-xs text-[#334b3c] dark:text-[#a7b8ac] mt-0.5 leading-relaxed">
                      Fresh malai paneer sourced daily with zero synthetic starch fillers or chemical preservatives.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-[#55a90d]/10 text-[#55a90d] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0f1f15] dark:text-[#eef5ef]">Authentic Macro Counts</h4>
                    <p className="text-xs text-[#334b3c] dark:text-[#a7b8ac] mt-0.5 leading-relaxed">
                      Every single dish has certified protein, calories, and fiber verified by nutritionists.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#e8f1ea] dark:border-[#24392b]">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 text-xs font-black text-[#055c1b] dark:text-[#7ddc78] hover:underline"
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

export function VisitUs({ cafe }: { cafe: CafeDetails }) {
  const links = [
    cafe.phone && { icon: Phone, label: cafe.phone, href: `tel:${cafe.phone.replace(/\s/g, "")}` },
    cafe.whatsapp && { icon: MessageCircle, label: "WhatsApp Order", href: `https://wa.me/${cafe.whatsapp}` },
    cafe.instagram && { icon: AtSign, label: `@${cafe.instagram}`, href: `https://instagram.com/${cafe.instagram}` },
  ].filter((l) => !!l);

  return (
    <section id="visit" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <Reveal>
        <div className="rounded-[36px] border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 sm:p-10 lg:p-12 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Info & Details */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                {/* Pill Tag */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#055c1b]/10 dark:bg-[#055c1b]/25 border border-[#055c1b]/20 dark:border-[#7ddc78]/30 text-[#055c1b] dark:text-[#7ddc78] text-[11px] font-black uppercase tracking-wider mb-4">
                  <Store className="size-3.5" />
                  <span>Dine-In • Takeaway</span>
                </div>

                {/* Heading */}
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0f1f15] dark:text-[#eef5ef] tracking-tight leading-[1.15]">
                  Experience Healthy Hunger Café
                </h2>

                {/* Subtitle (No Wi-Fi, No work tables) */}
                <p className="mt-3.5 text-sm sm:text-base text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed max-w-xl">
                  Step into our open-kitchen dining space. Featuring fresh wholesome meals prepared fresh to order, zero refined seed oils, and certified clean macros.
                </p>

                {/* Two Sub-Blocks: Opening Hours & Café Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8 pt-6 border-t border-[#e8f1ea] dark:border-[#24392b]">
                  {/* Opening Hours */}
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-2xl bg-[#055c1b]/10 dark:bg-[#055c1b]/25 text-[#055c1b] dark:text-[#7ddc78] flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="size-5.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider text-[#0f1f15] dark:text-[#eef5ef]">
                        Opening Hours
                      </span>
                      <div className="mt-1 space-y-1 text-xs text-[#334b3c] dark:text-[#a7b8ac] font-medium">
                        {cafe.hours.map((h) => (
                          <div key={h.days}>
                            <span className="font-bold text-[#0f1f15] dark:text-[#eef5ef]">{h.days}</span>
                            <p className="tabular font-semibold text-[#055c1b] dark:text-[#7ddc78]">{h.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Café Location */}
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-2xl bg-orange-500/10 dark:bg-orange-500/25 text-[#ea580c] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="size-5.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider text-[#0f1f15] dark:text-[#eef5ef]">
                        Café Location
                      </span>
                      <p className="mt-1 text-xs text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed">
                        {cafe.address && cafe.address !== "Address to be confirmed"
                          ? cafe.address
                          : "Chocolate Heaven Building Chikli, 301–310, Bilimora – Chikhli Rd, opp Olive Hospital Chikhli, Nandarkha, Bilimora, Gujarat 396325"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-[#e8f1ea] dark:border-[#24392b] flex flex-wrap items-center gap-3.5">
                {cafe.mapUrl && (
                  <a
                    href={cafe.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#055c1b] hover:bg-[#044c16] text-white font-extrabold text-sm shadow-md transition-all active:scale-95"
                  >
                    <MapPin className="size-4" />
                    <span>Get Directions</span>
                  </a>
                )}
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-[#16251b] border-2 border-[#d2e2d6] dark:border-[#2b4334] text-[#0f1f15] dark:text-[#eef5ef] hover:border-[#055c1b] dark:hover:border-[#7ddc78] hover:text-[#055c1b] dark:hover:text-[#7ddc78] font-extrabold text-sm shadow-xs transition-all active:scale-95"
                >
                  <Store className="size-4" />
                  <span>Order for Pickup</span>
                </Link>
              </div>

              {/* Social / Contact Badges */}
              {links.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#5c7263] dark:text-[#a7b8ac] mr-1">Connect:</span>
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f5f2] dark:bg-[#1d3325] border border-[#d6e3d9] dark:border-[#2b4334] text-[11px] font-bold text-[#1c2e23] dark:text-[#eef5ef] hover:bg-[#055c1b] hover:text-white dark:hover:bg-[#7ddc78] dark:hover:text-[#0e1a12] transition-colors"
                    >
                      <l.icon className="size-3" />
                      <span>{l.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Ambiance Image Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg border border-[#cde5d3] dark:border-[#24392b] bg-[#e2efe5] dark:bg-[#1f3325]">
                <img
                  src="/brand/cafe-ambiance.jpg"
                  alt="Healthy Hunger Café Ambiance"
                  className="w-full h-full object-cover"
                />
                {/* Bottom Floating Badge */}
                <div className="absolute bottom-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#0e1a12]/95 backdrop-blur-md border border-[#055c1b]/20 shadow-md flex items-center gap-2">
                  <VegMark className="size-4" />
                  <span className="font-extrabold text-xs text-[#055c1b] dark:text-[#7ddc78] tracking-wider uppercase">
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
