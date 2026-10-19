"use client";

import {
  ChevronLeft,
  Clock,
  Dumbbell,
  Feather,
  FileText,
  Flame,
  Leaf,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoIcon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NUTRITION_NOTE } from "@/lib/cafe";
import { CartStoreContext, useCart, useCounterCart } from "@/lib/cart-store";
import {
  HIGH_PROTEIN_MIN_G,
  isHighProtein,
  isLight,
  LIGHT_MAX_KCAL,
  type AddOn,
  type Category,
  type CategorySlug,
  type MenuItem,
} from "@/lib/menu-types";
import { cn } from "@/lib/utils";
import { CartBar } from "./cart-bar";
import { ItemSheet } from "./item-sheet";
import { MenuItemCard } from "./menu-item-card";

type Filter = "high-protein" | "light" | "bestseller";

const FILTERS: { id: Filter; label: string; hint: string; icon: typeof Star }[] = [
  { id: "high-protein", label: "High protein", hint: `${HIGH_PROTEIN_MIN_G}g+`, icon: Dumbbell },
  { id: "light", label: "Light", hint: `<${LIGHT_MAX_KCAL} kcal`, icon: Feather },
  { id: "bestseller", label: "Bestseller", hint: "", icon: Star },
];

const matches: Record<Filter, (i: MenuItem) => boolean> = {
  "high-protein": isHighProtein,
  light: isLight,
  bestseller: (i) => i.tags.includes("bestseller"),
};

type Props = {
  categories: Category[];
  items: MenuItem[];
  addOns: AddOn[];
  orderingEnabled: boolean;
  isWithinHours?: boolean;
  hours?: { days: string; time: string }[];
  initialItemId?: string;
  /** staff taking a walk-in guest's order with the same menu (see /admin/counter-order) */
  counter?: boolean;
};

export function MenuBrowser({
  categories,
  items,
  addOns,
  orderingEnabled,
  isWithinHours,
  hours,
  initialItemId,
  counter = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [active, setActive] = useState<CategorySlug>(categories[0]?.slug);
  const [openItem, setOpenItem] = useState<MenuItem | null>(
    () => items.find((i) => i.id === initialItemId) ?? null,
  );
  const sectionRefs = useRef(new Map<CategorySlug, HTMLElement>());
  const clickScrolling = useRef(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) => (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) &&
        filters.every((f) => matches[f](i)),
    );
  }, [items, query, filters]);

  const grouped = categories
    .map((c) => ({ ...c, items: visible.filter((i) => i.category === c.slug) }))
    .filter((c) => c.items.length > 0);

  // Scroll-spy: highlight the category whose section is near the top.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.getAttribute("data-category") as CategorySlug);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sectionRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [grouped.length, query, filters]);

  const jumpTo = (slug: CategorySlug) => {
    setActive(slug);
    const el = sectionRefs.current.get(slug);
    if (!el) return;
    clickScrolling.current = true;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
    setTimeout(() => (clickScrolling.current = false), 700);
  };

  const toggleFilter = (f: Filter) =>
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <CartStoreContext.Provider value={counter ? useCounterCart : useCart}>
      <div className="min-h-svh bg-[#f2faf3] dark:bg-[#0e1a12] text-[#0f1f15] dark:text-[#eef5ef] pb-32">
        {/* Top Header Banner */}
        <header className="relative overflow-hidden bg-gradient-to-b from-[#eaf6ee] via-[#f0f8f2] to-[#f2faf3] dark:from-[#09150d] dark:via-[#0e1a12] dark:to-[#0e1a12] border-b border-[#d8e8dc] dark:border-[#24392b] pt-6 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between mb-6">
            <Link
              href={counter ? "/admin" : "/"}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-white/90 dark:bg-[#16251b] text-[#273a2f] dark:text-[#cde5d3] hover:text-[#055c1b] dark:hover:text-[#7ddc78] hover:bg-white border border-[#cbe2d2] dark:border-[#24392b] shadow-xs transition-colors"
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span>{counter ? "Live Orders" : "Back to Home"}</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="max-w-7xl mx-auto flex flex-col items-start gap-4">
            {/* Top Guarantee Row */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#055c1b]/10 dark:bg-[#055c1b]/25 border border-[#055c1b]/20 dark:border-[#7ddc78]/30 text-[#055c1b] dark:text-[#7ddc78] font-bold text-xs uppercase tracking-wider">
              <Leaf className="size-3.5 fill-current" />
              <span>100% Vegetarian Café · Certified Zero Palm Oil · Real Food Macros</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between w-full gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f1f15] dark:text-[#eef5ef] tracking-tight">
                  {counter ? "Counter Order" : "Menu"}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#334b3c] dark:text-[#a7b8ac] font-medium max-w-2xl">
                  {counter
                    ? "Pick dishes with the guest, customize add-ons, then confirm their order ticket."
                    : "Macro-balanced protein bowls, guilt-free street chaats, artisan sourdough melts and botanical smoothies."}
                </p>
              </div>

              {!counter && (
                <a
                  href="/menu/pdf"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#16251b] border border-[#cbe2d2] dark:border-[#24392b] px-4 py-2 text-xs font-bold text-[#055c1b] dark:text-[#7ddc78] hover:bg-[#e7f4eb] dark:hover:bg-[#1f3325] shadow-xs transition-colors shrink-0"
                >
                  <FileText className="size-4" />
                  <span>Download PDF Menu</span>
                </a>
              )}
            </div>

            {!orderingEnabled && (
              <p className="inline-block rounded-full bg-[#ea580c]/15 text-[#ea580c] px-4 py-1.5 text-xs font-bold">
                Online ordering is currently paused for fresh prep – please order at the counter!
              </p>
            )}
          </div>
        </header>

        {/* Sticky Search & Navigation Bar */}
        <div className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 bg-[#f2faf3]/95 dark:bg-[#0e1a12]/95 backdrop-blur-md border-b border-[#d8e8dc] dark:border-[#24392b] shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            {/* Search Input & Quick Filters Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-[#566b5d] dark:text-[#a7b8ac]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bowls, paneer, chaat, sourdough, smoothie..."
                  className="h-11 w-full rounded-2xl bg-white dark:bg-[#16251b] pr-10 pl-11 text-sm font-medium border border-[#cde5d3] dark:border-[#24392b] outline-none text-[#0f1f15] dark:text-[#eef5ef] placeholder:text-[#64796c] dark:placeholder:text-[#a7b8ac] focus-visible:ring-2 focus-visible:ring-[#055c1b] dark:focus-visible:ring-[#7ddc78] shadow-xs"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#e8f4ec] dark:bg-[#24392b] text-[#283c2e] dark:text-[#eef5ef] hover:bg-[#055c1b] hover:text-white dark:hover:bg-[#7ddc78] dark:hover:text-[#0e1a12] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilters([])}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs transition-all",
                    filters.length === 0
                      ? "bg-[#055c1b] text-white shadow-xs"
                      : "bg-white dark:bg-[#16251b] text-[#283c2e] dark:text-[#cde5d3] border border-[#cde5d3] dark:border-[#24392b] hover:bg-[#055c1b] hover:text-white dark:hover:bg-[#055c1b] dark:hover:text-white"
                  )}
                >
                  <span>All</span>
                </button>

                {FILTERS.map((f) => {
                  const on = filters.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleFilter(f.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs transition-all border",
                        on
                          ? "bg-[#ea580c] border-[#ea580c] text-white shadow-xs"
                          : "bg-white dark:bg-[#16251b] border-[#cde5d3] dark:border-[#24392b] text-[#283c2e] dark:text-[#cde5d3] hover:bg-[#055c1b] hover:text-white hover:border-[#055c1b] dark:hover:bg-[#055c1b] dark:hover:text-white"
                      )}
                    >
                      <f.icon className="size-3.5 shrink-0" aria-hidden />
                      <span>{f.label}</span>
                      {f.hint && (
                        <span className={cn("text-[10px] opacity-80", on ? "text-white" : "text-[#566b5d] dark:text-[#a7b8ac]")}>
                          {f.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sticky Category Pills Bar */}
            <LayoutGroup>
              <nav
                aria-label="Categories"
                className="flex [scrollbar-width:none] gap-2 overflow-x-auto pt-1 pb-1"
              >
                {categories.map((c) => {
                  const isActive = c.slug === active;
                  const matchingCount = visible.filter((i) => i.category === c.slug).length;
                  const empty = matchingCount === 0;

                  return (
                    <button
                      key={c.slug}
                      type="button"
                      disabled={empty}
                      onClick={() => jumpTo(c.slug)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none",
                        isActive
                          ? "bg-[#055c1b] text-white shadow-sm"
                          : "bg-white/80 dark:bg-[#16251b] text-[#283c2e] dark:text-[#cde5d3] border border-[#d2e8d8] dark:border-[#24392b] hover:bg-[#055c1b] hover:text-white dark:hover:bg-[#055c1b] dark:hover:text-white"
                      )}
                    >
                      <span>{c.name}</span>
                      {matchingCount > 0 && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                            isActive ? "bg-white/25 text-white" : "bg-[#e8f4ec] dark:bg-[#24392b] text-[#055c1b] dark:text-[#7ddc78]"
                          )}
                        >
                          {matchingCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {!orderingEnabled && (
            <div className="mb-8 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    {isWithinHours === false
                      ? "Online ordering is currently closed outside working hours."
                      : "Online ordering is temporarily paused."}
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    {hours && hours.length > 0
                      ? `Opening hours: ${hours.map((h) => `${h.days}: ${h.time}`).join(" • ")}`
                      : "You can explore the full menu, complete macros, and certified ingredients."}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 px-3 py-1 rounded-full self-start sm:self-auto shrink-0 text-amber-900 dark:text-amber-200">
                Browsing Only
              </span>
            </div>
          )}

          {grouped.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#b0c4b2] dark:border-[#24392b] p-12 text-center text-[#566b5d] dark:text-[#a7b8ac] bg-white dark:bg-[#16251b] max-w-lg mx-auto">
              <p className="text-lg font-bold text-[#0f1f15] dark:text-[#eef5ef]">No dishes match your search.</p>
              <p className="text-sm mt-1">Try clearing filters or search terms.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilters([]);
                }}
                className="mt-4 px-5 py-2 rounded-full bg-[#055c1b] text-white font-bold text-xs shadow-xs hover:bg-[#044c16]"
              >
                Reset Filters
              </button>
            </div>
          )}

          {grouped.map((group) => (
            <section
              key={group.slug}
              data-category={group.slug}
              ref={(el) => {
                if (el) sectionRefs.current.set(group.slug, el);
                else sectionRefs.current.delete(group.slug);
              }}
              className="mb-14 scroll-mt-36"
              aria-labelledby={`cat-${group.slug}`}
            >
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-[#d8e8dc] dark:border-[#24392b]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#055c1b]/10 dark:bg-[#055c1b]/25 flex items-center justify-center text-[#055c1b] dark:text-[#7ddc78] font-bold">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 id={`cat-${group.slug}`} className="text-2xl sm:text-3xl font-black text-[#0f1f15] dark:text-[#eef5ef] tracking-tight">
                      {group.name}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-[#304537] dark:text-[#a7b8ac]">
                      Engineered for clean satiety, complete amino profiles & sustained energy
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-[#055c1b] dark:text-[#7ddc78] uppercase tracking-wider bg-white dark:bg-[#16251b] px-3.5 py-1 rounded-full border border-[#c2ded0] dark:border-[#24392b] self-start sm:self-auto">
                  {group.items.length} Option{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* 2-Column Responsive Card Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {group.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      orderingEnabled={orderingEnabled}
                      onOpen={setOpenItem}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}

          {/* Clean Label Guarantee Banner */}
          <div className="mt-16 rounded-3xl border border-[#cde5d3] dark:border-[#24392b] bg-white dark:bg-[#16251b] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#055c1b] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="size-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0f1f15] dark:text-[#eef5ef]">Clean Label Guarantee</h3>
                <p className="text-xs sm:text-sm text-[#334b3c] dark:text-[#a7b8ac] font-medium leading-relaxed mt-0.5">
                  100% Unprocessed Paneer & Zero Seed Oil. Every gram of protein on our menu is certified from authentic local partners.
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-[#055c1b] dark:text-[#7ddc78] bg-[#e8f4ec] dark:bg-[#1f3325] px-4 py-2 rounded-full shrink-0">
              {NUTRITION_NOTE}
            </div>
          </div>
        </main>

        <ItemSheet
          item={openItem}
          addOns={addOns}
          orderingEnabled={orderingEnabled}
          onClose={() => setOpenItem(null)}
        />
        {orderingEnabled && <CartBar items={items} addOns={addOns} counter={counter} />}
      </div>
    </CartStoreContext.Provider>
  );
}
