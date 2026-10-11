"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { VegMark } from "@/components/brand/veg-mark";
import { formatINR } from "@/lib/format";
import { hasNutrition, isHighProtein, type MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";
import { ItemImage } from "./item-art";

type Props = {
  item: MenuItem;
  orderingEnabled: boolean;
  onOpen: (item: MenuItem) => void;
};

export function MenuItemCard({ item, orderingEnabled, onOpen }: Props) {
  const soldOut = !item.available;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileTap={soldOut ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative flex gap-4 rounded-3xl border border-border bg-card p-3 shadow-[0_14px_30px_-22px_rgba(15,92,44,0.45)] transition-shadow hover:shadow-[0_22px_40px_-24px_rgba(15,92,44,0.5)]",
        soldOut && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="absolute inset-0 z-0 rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`${item.name} – details`}
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col py-1 pl-1">
        <div className="flex items-center gap-2">
          <VegMark />
          {item.tags.includes("bestseller") && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-brand-text">
              Bestseller
            </span>
          )}
          {isHighProtein(item) && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              High protein
            </span>
          )}
        </div>
        <h3 className="mt-2 text-lg leading-tight font-semibold">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        {hasNutrition(item) && (
          <p className="mt-auto pt-3 tabular text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{item.protein} g</span> protein ·{" "}
            <span className="font-semibold text-foreground">{item.kcal}</span> kcal
          </p>
        )}
        <p
          className={cn(
            "tabular text-lg font-semibold text-brand-text",
            hasNutrition(item) ? "mt-1" : "mt-auto pt-3",
          )}
        >
          {formatINR(item.price)}
        </p>
      </div>
      <div className="relative z-10 w-28 shrink-0 sm:w-32">
        <div className="pointer-events-none overflow-hidden rounded-2xl shadow-md transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-1.5deg]">
          <ItemImage item={item} sizes="128px" className="aspect-square w-full" />
        </div>
        {soldOut ? (
          <span className="absolute inset-x-2 -bottom-2 rounded-full bg-foreground py-1.5 text-center text-xs font-semibold text-background">
            Sold out
          </span>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="absolute inset-x-3 -bottom-2 flex h-9 items-center justify-center gap-1 rounded-full bg-cta text-sm font-bold text-cta-foreground shadow-lg shadow-hh-orange/35 transition-transform hover:bg-hh-orange-light active:scale-95"
            >
              <Plus className="size-4" aria-hidden /> Add
            </button>
          )
        )}
      </div>
    </motion.article>
  );
}
