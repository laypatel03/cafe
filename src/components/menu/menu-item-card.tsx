"use client";

import { Flame, Plus, Zap } from "lucide-react";
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
  const isHighProt = isHighProtein(item);
  const isBestseller = item.tags.includes("bestseller");

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileTap={soldOut ? undefined : { scale: 0.99 }}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-[#cde5d3] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#055c1b]/40 hover:shadow-lg sm:flex-row dark:border-[#24392b] dark:bg-[#16251b] dark:hover:border-[#7ddc78]/40",
        soldOut && "opacity-65",
      )}
    >
      {/* Invisible backdrop button for card click */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:ring-3 focus-visible:ring-[#055c1b]/50 focus-visible:outline-none"
        aria-label={`${item.name} – view details & customize`}
      />

      {/* Food Image Container */}
      <div className="pointer-events-none relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[#e2efe5] sm:w-44 dark:bg-[#1f3325]">
        <ItemImage
          item={item}
          sizes="(min-width: 640px) 176px, 100vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-Left: Standard Pure Veg Mark */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <VegMark className="size-4.5 shadow-sm" />
        </div>

        {/* Top-Right: Bestseller Tag */}
        {isBestseller && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center rounded-full bg-[#ea580c] px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-sm">
              Bestseller
            </span>
          </div>
        )}

        {/* Bottom-left: protein tag (non-overlapping with top tags) */}
        {isHighProt && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#055c1b] px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-sm">
              <Zap className="size-2.5 fill-current" aria-hidden />
              <span>~{item.protein} g protein</span>
            </span>
          </div>
        )}

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f1f15]/70 backdrop-blur-xs">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0f1f15] shadow-md dark:bg-[#16251b] dark:text-[#eef5ef]">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Content & Details */}
      <div className="z-10 flex min-w-0 flex-1 flex-col justify-between gap-2.5">
        <div className="flex flex-col">
          {item.ingredients.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="truncate text-[11px] font-bold tracking-wider text-[#055c1b] uppercase dark:text-[#7ddc78]">
                {item.ingredients.slice(0, 3).join(" · ")}
              </span>
            </div>
          )}

          <h3 className="mt-0.5 text-base leading-snug font-black text-[#0f1f15] transition-colors group-hover:text-[#055c1b] sm:text-lg dark:text-[#eef5ef] dark:group-hover:text-[#7ddc78]">
            {item.name}
          </h3>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed font-medium text-[#334b3c] sm:text-sm dark:text-[#a7b8ac]">
            {item.description}
          </p>
        </div>

        {/* Nutritional Macros */}
        {hasNutrition(item) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {item.protein > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#055c1b] px-2.5 py-1 text-xs font-black text-white shadow-xs">
                <Zap className="size-3.5 fill-current" /> ~{item.protein}g protein
              </span>
            )}
            {item.kcal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d6e3d9] bg-[#f1f5f2] px-2.5 py-1 text-xs font-extrabold text-[#1c2e23] dark:border-[#2b4334] dark:bg-[#1d3325] dark:text-[#eef5ef]">
                <Flame className="size-3.5 fill-[#ea580c] text-[#ea580c]" /> ~{item.kcal} kcal
              </span>
            )}
            {item.ingredients.length > 0 && (
              <span className="hidden rounded-full bg-[#e8f4ec] px-2 py-0.5 text-[11px] font-bold text-[#22382a] md:inline-flex dark:bg-[#1f3325] dark:text-[#cde5d3]">
                {item.ingredients.slice(0, 2).join(" · ")}
              </span>
            )}
          </div>
        )}

        {/* Price & Action Row */}
        <div className="mt-auto flex items-center justify-between border-t border-[#e8f1ea] pt-2.5 dark:border-[#24392b]">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
              {formatINR(item.price)}
            </span>
          </div>

          <div className="z-20">
            {soldOut ? (
              <span className="rounded-full bg-[#f1f5f2] px-3 py-1.5 text-xs font-bold text-[#64796c] dark:bg-[#1d3325] dark:text-[#a7b8ac]">
                Unavailable
              </span>
            ) : orderingEnabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(item);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#ea580c] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#c2410c] hover:shadow active:scale-95"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="size-4 text-white" aria-hidden />
                <span className="font-extrabold text-white">Add</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-[#d2e2d6] bg-[#e8f1ea] px-3.5 py-1.5 text-xs font-bold text-[#819988] opacity-80 select-none dark:border-[#283d2e] dark:bg-[#1e2e22] dark:text-[#5d7363]"
                aria-label={`${item.name} – Ordering closed outside working hours`}
                title="Ordering is closed outside working hours"
              >
                <Plus className="size-3.5 opacity-40" aria-hidden />
                <span>Closed</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
