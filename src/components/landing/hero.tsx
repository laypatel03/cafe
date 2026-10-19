"use client";

import { ArrowRight, Dumbbell, Flame, Leaf, ShieldCheck, Sparkles, Star, Store } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/brand/logo";
import { VegMark } from "@/components/brand/veg-mark";
import { ItemImage } from "@/components/menu/item-art";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type HeroDish = {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  price: number;
  protein: number;
  kcal: number;
  photo?: string;
  bestseller: boolean;
};

const ADVANCE_MS = 3800;

const SLOTS = [
  { x: 0, y: 0, rotate: -1.5, scale: 1, opacity: 1, zIndex: 30 },
  { x: 42, y: 16, rotate: 6, scale: 0.94, opacity: 0.95, zIndex: 20 },
  { x: -38, y: 26, rotate: -7, scale: 0.88, opacity: 0.85, zIndex: 10 },
];
const HIDDEN = { x: 0, y: 40, rotate: 0, scale: 0.8, opacity: 0, zIndex: 0 };

function DishCard({ dish, front }: { dish: HeroDish; front: boolean }) {
  const hasNumbers = dish.protein > 0 || dish.kcal > 0;
  return (
    <Link
      href={`/menu?item=${encodeURIComponent(dish.id)}`}
      tabIndex={front ? 0 : -1}
      aria-hidden={!front}
      className={cn(
        "group block rounded-3xl border border-[#b0c4b2]/40 dark:border-[#24392b] bg-white dark:bg-[#16251b] p-3.5 text-card-foreground shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus-visible:ring-3 focus-visible:ring-[#055c1b]/50"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#e2efe5] dark:bg-[#1f3325]">
        <ItemImage
          item={dish}
          sizes="(min-width: 768px) 380px, 85vw"
          priority={front}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/95 dark:bg-[#0e1a12]/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-[#055c1b]/20">
          <span className="w-2 h-2 rounded-full bg-[#055c1b] dark:bg-[#7ddc78] inline-block" />
          <span className="font-extrabold text-[11px] text-[#055c1b] dark:text-[#7ddc78] tracking-wider uppercase">
            {dish.bestseller ? "BESTSELLER" : "CHEF SPECIAL"}
          </span>
        </div>

        {/* Calories Tag */}
        {dish.kcal > 0 && (
          <div className="absolute bottom-2.5 right-2.5 bg-[#0f1f15]/85 dark:bg-black/75 text-white font-extrabold text-[11px] backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Flame className="size-3.5 text-amber-400 fill-amber-400" aria-hidden />
            <span>{dish.kcal} kcal</span>
          </div>
        )}
      </div>

      <div className="px-1.5 pt-3.5 pb-1">
        <p className="text-[11px] font-black tracking-wider text-[#055c1b] dark:text-[#7ddc78] uppercase">
          {dish.categoryName || "Signature Dish"}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg sm:text-xl font-black text-[#0f1f15] dark:text-[#eef5ef] group-hover:text-[#055c1b] dark:group-hover:text-[#7ddc78] transition-colors">
          {dish.name}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8f1ea] dark:border-[#24392b] pt-2.5">
          <span className="text-xl font-black text-[#0f1f15] dark:text-[#eef5ef] tabular">
            {formatINR(dish.price)}
          </span>
          <div className="flex items-center gap-1.5">
            {hasNumbers && dish.protein > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#055c1b] text-white px-2.5 py-1 text-xs font-black shadow-xs">
                <Dumbbell className="size-3" aria-hidden /> {dish.protein}g Protein
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 py-1 text-xs font-extrabold shadow-sm transition-colors">
              Add
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DishStack({ dishes }: { dishes: HeroDish[] }) {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = dishes.length;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduce || paused || n < 2) return;
    const id = setInterval(() => setFront((f) => (f + 1) % n), ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, n]);

  if (!dishes.length) return null;

  return (
    <div
      className="relative mx-auto w-full max-w-[22rem] sm:max-w-[24rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Invisible clone sets proportional height */}
      <div aria-hidden className="invisible pointer-events-none">
        <DishCard dish={dishes[0]} front={false} />
      </div>

      {dishes.map((dish, i) => {
        const pos = (i - front + n) % n;
        const slot = SLOTS[pos] ?? HIDDEN;
        return (
          <motion.div
            key={dish.id}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: slot.zIndex }}
            initial={false}
            animate={{
              x: narrow ? slot.x * 0.55 : slot.x,
              y: slot.y,
              rotate: narrow ? slot.rotate * 0.7 : slot.rotate,
              scale: slot.scale,
              opacity: slot.opacity,
            }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 22 }}
          >
            <DishCard dish={dish} front={pos === 0} />
          </motion.div>
        );
      })}

      {n > 1 && (
        <div className="relative mt-12 flex justify-center gap-2" role="group" aria-label="Select dish preview">
          {dishes.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setFront(i)}
              aria-label={`View ${d.name}`}
              aria-current={i === front}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                i === front
                  ? "w-8 bg-[#055c1b] dark:bg-[#7ddc78]"
                  : "w-2.5 bg-[#b0c4b2] dark:bg-[#2b4334] hover:bg-[#055c1b]/60 dark:hover:bg-[#7ddc78]/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Hero({ dishes }: { dishes: HeroDish[] }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#eaf6ee] via-[#f2faf3] to-[#fbf9f1] dark:from-[#09150d] dark:via-[#0e1a12] dark:to-[#0e1a12] pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#d7eadb] dark:border-[#24392b]">
      {/* Ambient background glows */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-[#98f992]/20 dark:bg-[#055c1b]/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-orange-300/20 dark:bg-orange-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-6 flex flex-col items-start gap-5 z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#055c1b]/10 dark:bg-[#055c1b]/25 border border-[#055c1b]/20 dark:border-[#7ddc78]/30 text-[#055c1b] dark:text-[#7ddc78] font-bold text-[12px] uppercase tracking-wider">
            <Leaf className="size-3.5 fill-current" aria-hidden />
            <span>100% Vegetarian Café · Clean Macros</span>
          </div>

          {/* Main Brand Logo */}
          <div>
            <LogoWordmark
              priority
              className="h-auto w-[min(88vw,22rem)] sm:w-[26rem] lg:w-[30rem] select-none"
            />
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0f1f15] dark:text-[#eef5ef] leading-[1.12] tracking-tight">
            Protein from real food.
            <br />
            <span className="text-[#055c1b] dark:text-[#7ddc78]">Made fresh every single day.</span>
          </h1>

          <p className="text-[16px] sm:text-[17px] leading-relaxed text-[#273a2f] dark:text-[#cde5d3] font-medium max-w-xl">
            Wholesome salads, guilt-free street chaats, artisan sourdough melts, and high-protein oat bowls crafted
            with zero refined seed oils, artificial sweeteners, or hidden nasties.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1 w-full sm:w-auto">
            <Link
              href="/menu"
              className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <span>Explore Menu</span>
              <ArrowRight className="size-4.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#visit"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-[#16251b] text-[#0f1f15] dark:text-[#eef5ef] border-2 border-[#0f1f15]/20 dark:border-[#24392b] hover:border-[#055c1b] dark:hover:border-[#7ddc78] hover:text-[#055c1b] dark:hover:text-[#7ddc78] font-bold text-[15px] shadow-xs hover:bg-[#e7f4eb]/60 dark:hover:bg-[#1f3325] transition-all"
            >
              <Store className="size-4.5 text-[#055c1b] dark:text-[#7ddc78]" />
              <span>Visit Café</span>
            </a>
          </div>
        </div>

        {/* Right Column: Layered Interactive Showcase */}
        <div className="lg:col-span-6 relative flex justify-center items-center py-6">
          {/* Decorative backdrop cards */}
          <div className="absolute w-[290px] sm:w-[350px] h-[380px] rounded-[28px] bg-orange-200/50 dark:bg-orange-500/10 shadow-md transform rotate-6 scale-95 pointer-events-none" />
          <div className="absolute w-[290px] sm:w-[350px] h-[380px] rounded-[28px] bg-[#98f992]/40 dark:bg-[#055c1b]/20 shadow-md transform -rotate-3 scale-98 pointer-events-none" />

          {/* Floating Badge: Pure Veg */}
          <div className="absolute -top-3 right-4 sm:right-8 z-40 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#16251b] border border-[#055c1b]/30 shadow-md flex items-center gap-2">
            <VegMark className="size-4" />
            <span className="font-extrabold text-[12px] text-[#055c1b] dark:text-[#7ddc78] tracking-wider uppercase">
              100% Pure Veg
            </span>
          </div>

          {/* Floating Badge: Real Food Protein */}
          <div className="absolute -bottom-3 -left-2 sm:left-2 z-40 px-3.5 py-2 rounded-full bg-white dark:bg-[#16251b] border border-orange-200 dark:border-orange-500/30 shadow-md flex items-center gap-2">
            <Dumbbell className="size-4 text-[#ea580c]" />
            <span className="font-bold text-[13px] text-[#0f1f15] dark:text-[#eef5ef]">Protein from Real Food</span>
          </div>

          {/* Floating Badge: Daily Fresh */}
          <div className="absolute top-1/2 -right-4 sm:-right-6 z-40 px-3 py-1.5 rounded-full bg-white dark:bg-[#16251b] border border-[#055c1b]/20 dark:border-[#24392b] shadow-md flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-[#055c1b] dark:text-[#7ddc78]" />
            <span className="font-bold text-[12px] text-[#0f1f15] dark:text-[#eef5ef]">Made Fresh Daily</span>
          </div>

          {/* Foreground Dish Stack */}
          <DishStack dishes={dishes} />
        </div>
      </div>
    </section>
  );
}
