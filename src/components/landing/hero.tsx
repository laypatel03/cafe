"use client";

import { ArrowRight, Dumbbell, Flame, ShieldCheck, Store } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/brand/logo";
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
        "group block rounded-3xl border border-[#b0c4b2]/40 bg-white p-3.5 text-card-foreground shadow-xl transition-all duration-300 outline-none hover:-translate-y-1 hover:shadow-2xl focus-visible:ring-3 focus-visible:ring-[#055c1b]/50 dark:border-[#24392b] dark:bg-[#16251b]",
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
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-[#055c1b]/20 bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-md dark:bg-[#0e1a12]/95">
          <span className="inline-block h-2 w-2 rounded-full bg-[#055c1b] dark:bg-[#7ddc78]" />
          <span className="text-[11px] font-extrabold tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
            {dish.bestseller ? "BESTSELLER" : "CHEF SPECIAL"}
          </span>
        </div>

        {/* Calories Tag */}
        {dish.kcal > 0 && (
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-[#0f1f15]/85 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm backdrop-blur-md dark:bg-black/75">
            <Flame className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
            <span>{dish.kcal} kcal</span>
          </div>
        )}
      </div>

      <div className="px-1.5 pt-3.5 pb-1">
        <p className="text-[11px] font-black tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
          {dish.categoryName || "Signature Dish"}
        </p>
        <h3 className="mt-1 line-clamp-1 text-lg font-black text-[#0f1f15] transition-colors group-hover:text-[#055c1b] sm:text-xl dark:text-[#eef5ef] dark:group-hover:text-[#7ddc78]">
          {dish.name}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8f1ea] pt-2.5 dark:border-[#24392b]">
          <span className="tabular text-xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
            {formatINR(dish.price)}
          </span>
          <div className="flex items-center gap-1.5">
            {hasNumbers && dish.protein > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#055c1b] px-2.5 py-1 text-xs font-black text-white shadow-xs">
                <Dumbbell className="size-3" aria-hidden /> {dish.protein}g Protein
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ea580c] px-3 py-1 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#c2410c]">
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
      <div aria-hidden className="pointer-events-none invisible">
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
        <div
          className="relative mt-12 flex justify-center gap-2"
          role="group"
          aria-label="Select dish preview"
        >
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
                  : "w-2.5 bg-[#b0c4b2] hover:bg-[#055c1b]/60 dark:bg-[#2b4334] dark:hover:bg-[#7ddc78]/60",
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
    <section className="relative w-full overflow-hidden border-b border-[#d7eadb] bg-gradient-to-b from-[#eaf6ee] via-[#f2faf3] to-[#fbf9f1] px-4 pt-28 pb-16 sm:px-6 sm:pb-24 lg:px-8 dark:border-[#24392b] dark:from-[#09150d] dark:via-[#0e1a12] dark:to-[#0e1a12]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-96 w-96 rounded-full bg-[#98f992]/20 blur-3xl dark:bg-[#055c1b]/15" />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-[420px] w-[420px] rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-500/10" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Copy & Actions */}
        <div className="z-10 flex flex-col items-start gap-5 lg:col-span-6">
          {/* Main Brand Logo */}
          <div>
            <LogoWordmark
              priority
              className="h-auto w-[min(88vw,22rem)] select-none sm:w-[26rem] lg:w-[30rem]"
            />
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-3xl leading-[1.12] font-extrabold tracking-tight text-[#0f1f15] sm:text-4xl lg:text-[42px] dark:text-[#eef5ef]">
            Protein from real food.
            <br />
            <span className="text-[#055c1b] dark:text-[#7ddc78]">Made in our kitchen every day.</span>
          </h1>

          <p className="max-w-xl text-[16px] leading-relaxed font-medium text-[#273a2f] sm:text-[17px] dark:text-[#cde5d3]">
            Salads and bowls, chaat, toasts, sandwiches, oats and smoothies – with our estimate of the protein
            and calories shown for every dish.
          </p>

          {/* CTA Buttons */}
          <div className="flex w-full flex-wrap items-center gap-3.5 pt-1 sm:w-auto">
            <Link
              href="/menu"
              className="group flex items-center justify-center gap-2 rounded-full bg-[#ea580c] px-6 py-3.5 text-[15px] font-bold text-white shadow-md transition-all duration-200 hover:bg-[#c2410c] hover:shadow-lg active:scale-95"
            >
              <span>Explore Menu</span>
              <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#visit"
              className="flex items-center justify-center gap-2 rounded-full border-2 border-[#0f1f15]/20 bg-white px-6 py-3.5 text-[15px] font-bold text-[#0f1f15] shadow-xs transition-all hover:border-[#055c1b] hover:bg-[#e7f4eb]/60 hover:text-[#055c1b] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#eef5ef] dark:hover:border-[#7ddc78] dark:hover:bg-[#1f3325] dark:hover:text-[#7ddc78]"
            >
              <Store className="size-4.5 text-[#055c1b] dark:text-[#7ddc78]" />
              <span>Visit Café</span>
            </a>
          </div>
        </div>

        {/* Right Column: Layered Interactive Showcase */}
        <div className="relative flex items-center justify-center py-6 lg:col-span-6">
          {/* Decorative backdrop cards */}
          <div className="pointer-events-none absolute h-[380px] w-[290px] scale-95 rotate-6 transform rounded-[28px] bg-orange-200/50 shadow-md sm:w-[350px] dark:bg-orange-500/10" />
          <div className="pointer-events-none absolute h-[380px] w-[290px] scale-98 -rotate-3 transform rounded-[28px] bg-[#98f992]/40 shadow-md sm:w-[350px] dark:bg-[#055c1b]/20" />

          {/* Floating Badge: Real Food Protein */}
          <div className="absolute -bottom-3 -left-2 z-40 flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3.5 py-2 shadow-md sm:left-2 dark:border-orange-500/30 dark:bg-[#16251b]">
            <Dumbbell className="size-4 text-[#ea580c]" />
            <span className="text-[13px] font-bold text-[#0f1f15] dark:text-[#eef5ef]">
              Protein from Real Food
            </span>
          </div>

          {/* Floating Badge: Made in our kitchen */}
          <div className="absolute top-1/2 -right-4 z-40 flex items-center gap-1.5 rounded-full border border-[#055c1b]/20 bg-white px-3 py-1.5 shadow-md sm:-right-6 dark:border-[#24392b] dark:bg-[#16251b]">
            <ShieldCheck className="size-4 text-[#055c1b] dark:text-[#7ddc78]" />
            <span className="text-[12px] font-bold text-[#0f1f15] dark:text-[#eef5ef]">
              Made in our kitchen
            </span>
          </div>

          {/* Foreground Dish Stack */}
          <DishStack dishes={dishes} />
        </div>
      </div>
    </section>
  );
}
