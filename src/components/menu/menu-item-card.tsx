"use client";

import { Flame, Plus, Sparkles, Zap } from "lucide-react";
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
        "group relative flex flex-col sm:flex-row rounded-2xl p-4 border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] shadow-sm hover:shadow-lg hover:border-[#055c1b]/40 dark:hover:border-[#7ddc78]/40 transition-all duration-300 gap-4",
        soldOut && "opacity-65"
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
      <div className="relative w-full sm:w-44 h-44 shrink-0 overflow-hidden rounded-xl bg-[#e2efe5] dark:bg-[#1f3325] pointer-events-none">
        <ItemImage
          item={item}
          sizes="(min-width: 640px) 176px, 100vw"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top-Left: Standard Pure Veg Mark */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <VegMark className="size-4.5 shadow-sm" />
        </div>

        {/* Top-Right: Bestseller Tag */}
        {isBestseller && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#ea580c] text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
              Bestseller
            </span>
          </div>
        )}

        {/* Bottom-Left: High Protein Tag (Non-overlapping with top tags) */}
        {isHighProt && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#055c1b] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              <Zap className="size-2.5 fill-current" aria-hidden />
              <span>{item.protein >= 25 ? `Super ${item.protein}g+` : `${item.protein}g Prot`}</span>
            </span>
          </div>
        )}

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 bg-[#0f1f15]/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="px-3 py-1 rounded-full bg-white dark:bg-[#16251b] text-[#0f1f15] dark:text-[#eef5ef] text-xs font-black shadow-md">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Content & Details */}
      <div className="flex flex-col justify-between flex-1 gap-2.5 min-w-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[#055c1b] dark:text-[#7ddc78] uppercase tracking-wider">
              {isBestseller ? "Chef's Peak Performance" : "Clean Whole Food"}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#0f1f15] dark:text-[#eef5ef] leading-snug mt-0.5 group-hover:text-[#055c1b] dark:group-hover:text-[#7ddc78] transition-colors">
            {item.name}
          </h3>

          <p className="text-xs sm:text-sm font-medium text-[#334b3c] dark:text-[#a7b8ac] leading-relaxed mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Nutritional Macros */}
        {hasNutrition(item) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {item.protein > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#055c1b] text-white text-xs font-black shadow-xs">
                <Zap className="size-3.5 fill-current" /> {item.protein}g Protein
              </span>
            )}
            {item.kcal > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f1f5f2] dark:bg-[#1d3325] border border-[#d6e3d9] dark:border-[#2b4334] text-[#1c2e23] dark:text-[#eef5ef] text-xs font-extrabold">
                <Flame className="size-3.5 text-[#ea580c] fill-[#ea580c]" /> {item.kcal} kcal
              </span>
            )}
            {item.ingredients.length > 0 && (
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-[#e8f4ec] dark:bg-[#1f3325] text-[#22382a] dark:text-[#cde5d3] text-[11px] font-bold">
                {item.ingredients.slice(0, 2).join(" · ")}
              </span>
            )}
          </div>
        )}

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#e8f1ea] dark:border-[#24392b] mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-[#0f1f15] dark:text-[#eef5ef] tabular">
              {formatINR(item.price)}
            </span>
          </div>

          <div className="z-20">
            {soldOut ? (
              <span className="px-3 py-1.5 rounded-full bg-[#f1f5f2] dark:bg-[#1d3325] text-[#64796c] dark:text-[#a7b8ac] text-xs font-bold">
                Unavailable
              </span>
            ) : orderingEnabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(item);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="size-4 text-white" aria-hidden />
                <span className="text-white font-extrabold">Add</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e8f1ea] dark:bg-[#1e2e22] text-[#819988] dark:text-[#5d7363] font-bold text-xs cursor-not-allowed select-none border border-[#d2e2d6] dark:border-[#283d2e] opacity-80"
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
