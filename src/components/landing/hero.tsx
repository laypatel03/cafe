"use client";

import { ArrowRight, Dumbbell, Flame, Leaf, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/brand/logo";
import { ItemImage } from "@/components/menu/item-art";
import { Button } from "@/components/ui/button";
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

const ADVANCE_MS = 3600;

// Where each card sits in the fanned stack: front card first.
const SLOTS = [
  { x: 0, y: 0, rotate: -2, scale: 1, opacity: 1, zIndex: 30 },
  { x: 46, y: 18, rotate: 7, scale: 0.92, opacity: 0.95, zIndex: 20 },
  { x: -44, y: 30, rotate: -9, scale: 0.86, opacity: 0.85, zIndex: 10 },
];
const HIDDEN = { x: 0, y: 46, rotate: 0, scale: 0.8, opacity: 0, zIndex: 0 };

function DishCard({ dish, front }: { dish: HeroDish; front: boolean }) {
  const hasNumbers = dish.protein > 0 || dish.kcal > 0;
  return (
    <Link
      href={`/menu?item=${encodeURIComponent(dish.id)}`}
      tabIndex={front ? 0 : -1}
      aria-hidden={!front}
      className="block rounded-[2rem] border border-border/70 bg-card p-3 text-card-foreground shadow-[0_30px_60px_-28px_rgba(14,85,24,0.55)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative">
        <ItemImage
          item={dish}
          sizes="(min-width: 768px) 360px, 80vw"
          priority={front}
          className="aspect-[4/3] w-full rounded-[1.5rem]"
        />
        {dish.bestseller && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cta px-2.5 py-1 text-xs font-semibold text-cta-foreground shadow">
            <Star className="size-3.5 fill-current" aria-hidden /> Bestseller
          </span>
        )}
      </div>
      <div className={cn("px-2 pt-4 pb-2 transition-opacity duration-300", !front && "opacity-0")}>
        <p className="text-[11px] font-semibold tracking-wider text-hh-green uppercase dark:text-hh-green-light">
          {dish.categoryName}
        </p>
        <h3 className="mt-1 line-clamp-2 font-heading text-2xl leading-tight font-bold">{dish.name}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-auto tabular text-2xl font-bold text-brand-text">{formatINR(dish.price)}</span>
          {hasNumbers && dish.protein > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-hh-green/10 px-2.5 py-1 tabular text-xs font-semibold text-secondary-foreground">
              <Dumbbell className="size-3.5" aria-hidden /> {dish.protein} g protein
            </span>
          )}
          {hasNumbers && dish.kcal > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 tabular text-xs font-semibold text-muted-foreground">
              <Flame className="size-3.5" aria-hidden /> {dish.kcal} kcal
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Fanned stack of real dishes from the menu; the front card changes every few seconds. */
function DishStack({ dishes }: { dishes: HeroDish[] }) {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = dishes.length;

  // smaller sideways fan on phones so the back cards stay on screen
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

  return (
    <div
      className="relative mx-auto w-full max-w-[22rem] md:max-w-[24rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* invisible copy of a card sets the stage height */}
      <div aria-hidden className="invisible">
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
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 22 }}
          >
            <DishCard dish={dish} front={pos === 0} />
          </motion.div>
        );
      })}

      {n > 1 && (
        <div className="relative mt-16 flex justify-center gap-2" role="group" aria-label="Choose a dish">
          {dishes.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setFront(i)}
              aria-label={`Show ${d.name}`}
              aria-current={i === front}
              className={cn(
                "h-2 rounded-full transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                i === front ? "w-6 bg-hh-green" : "w-2 bg-hh-green/25 hover:bg-hh-green/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const CHIPS = [
  { label: "100% veg", className: "-top-3 -left-2 md:-left-10" },
  { label: "Made fresh daily", className: "top-1/3 -right-2 md:-right-12 [animation-delay:1.2s]" },
  { label: "Protein from real food", className: "bottom-24 -left-3 md:-left-14 [animation-delay:2.1s]" },
];

export function Hero({ dishes }: { dishes: HeroDish[] }) {
  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      {/* fresh studio backdrop: green and orange light washes, like the logo */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-90 dark:opacity-60"
        style={{
          background:
            "radial-gradient(50% 55% at 78% 50%, rgba(255,185,0,0.3), transparent 70%), radial-gradient(45% 45% at 10% 10%, rgba(120,185,12,0.22), transparent 70%), radial-gradient(35% 35% at 95% 5%, rgba(22,122,36,0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid min-h-[92svh] max-w-6xl items-center gap-12 px-5 pt-28 pb-16 md:grid-cols-[1.05fr_1fr] md:gap-8 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-hh-green/20 bg-hh-green/10 px-3 py-1 text-xs font-semibold tracking-wide text-secondary-foreground uppercase backdrop-blur">
            <Leaf className="size-3.5" aria-hidden /> 100% vegetarian café
          </p>
          <h1>
            <LogoWordmark priority className="h-auto w-[min(88vw,24rem)] lg:w-[30rem]" />
          </h1>
          <p className="mt-5 max-w-md text-lg text-pretty text-muted-foreground md:text-xl">
            Protein from real food. Salads, chaats, sandwiches and oats bowls made fresh every day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-cta px-6 text-base font-semibold text-cta-foreground shadow-lg shadow-hh-orange/30 hover:bg-hh-orange-light"
            >
              <Link href="/menu">
                View menu <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-hh-green/30 bg-transparent px-6 text-base text-secondary-foreground hover:bg-hh-green/10"
            >
              <a href="#visit">Visit us</a>
            </Button>
          </div>
        </motion.div>

        {dishes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative px-6 md:px-0"
          >
            <DishStack dishes={dishes} />
            {CHIPS.map((c) => (
              <span
                key={c.label}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute z-40 hidden rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-hh-ink shadow-lg shadow-hh-green-deep/15 backdrop-blur-md motion-safe:animate-[hh-bob_5s_ease-in-out_infinite] sm:block dark:border-white/10 dark:bg-hh-ink/80 dark:text-white",
                  c.className,
                )}
              >
                {c.label}
              </span>
            ))}
          </motion.div>
        )}
      </div>
      <style>{`@keyframes hh-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }`}</style>
    </section>
  );
}
