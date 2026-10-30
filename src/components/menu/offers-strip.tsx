"use client";

import { Tag } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { ItemImage } from "./item-art";
import { Price } from "./price";

/** Today's offers at the top of the QR menu; tapping one opens the dish. Hidden when there are none. */
export function OffersStrip({ items, onOpen }: { items: MenuItem[]; onOpen: (item: MenuItem) => void }) {
  const offers = items.filter((i) => i.wasPrice !== undefined && i.available);
  if (!offers.length) return null;
  return (
    <section
      aria-labelledby="offers-h"
      className="mb-8 rounded-3xl border border-[#FF8A00]/40 bg-gradient-to-br from-[#fff4e5] to-[#fffaf2] p-4 sm:p-5 dark:border-[#FF8A00]/30 dark:from-[#2a1a08] dark:to-[#16251b]"
    >
      <h2
        id="offers-h"
        className="flex items-center gap-2 text-lg font-black text-[#0f1f15] dark:text-[#eef5ef]"
      >
        <Tag className="size-5 text-[#C2410C] dark:text-[#FF8A00]" aria-hidden />
        {offers.length === 1 ? "Today's offer" : "Today's offers"}
      </h2>
      <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1">
        {offers.map((item) => (
          <li key={item.id} className="w-64 shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-[#FF8A00]/50 focus-visible:outline-none dark:bg-[#16251b]"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#e2efe5] dark:bg-[#1f3325]">
                <ItemImage item={item} sizes="64px" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                  {item.name}
                </span>
                {item.offer?.title && (
                  <span className="block truncate text-xs text-[#5a6f61] dark:text-[#a7b8ac]">
                    {item.offer.title}
                  </span>
                )}
                <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                  <Price item={item} className="text-base" />
                  <span className="text-[11px] font-bold text-[#055c1b] dark:text-[#7ddc78]">
                    Save {formatINR(item.wasPrice! - item.price)}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
