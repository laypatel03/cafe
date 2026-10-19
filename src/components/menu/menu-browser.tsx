"use client";

import {
  ChevronLeft,
  Clock,
  Dumbbell,
  Feather,
  FileText,
  Leaf,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup } from "motion/react";
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
  /** counter order for a known guest (opened from their customer page): name and number filled in */
  counterGuest?: { name: string; phone: string };
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
  counterGuest,
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
      (i) =>
        (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) &&
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
      <div className="min-h-svh bg-[#f2faf3] pb-32 text-[#0f1f15] dark:bg-[#0e1a12] dark:text-[#eef5ef]">
        {/* Top Header Banner */}
        <header className="relative overflow-hidden border-b border-[#d8e8dc] bg-gradient-to-b from-[#eaf6ee] via-[#f0f8f2] to-[#f2faf3] px-4 pt-6 pb-12 sm:px-6 lg:px-8 dark:border-[#24392b] dark:from-[#09150d] dark:via-[#0e1a12] dark:to-[#0e1a12]">
          <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between">
            <Link
              href={counter ? "/admin" : "/"}
              className="inline-flex items-center gap-2 rounded-full border border-[#cbe2d2] bg-white/90 px-4 py-2 text-sm font-bold text-[#273a2f] shadow-xs transition-colors hover:bg-white hover:text-[#055c1b] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:text-[#7ddc78]"
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span>{counter ? "Live Orders" : "Back to Home"}</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="mx-auto flex max-w-7xl flex-col items-start gap-4">
            {/* Top Guarantee Row */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#055c1b]/20 bg-[#055c1b]/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-[#055c1b] uppercase dark:border-[#7ddc78]/30 dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
              <Leaf className="size-3.5 fill-current" />
              <span>100% Vegetarian Café · Zero Palm Oil · Real Food Macros</span>
            </div>

            <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-baseline">
              <div className="flex items-center gap-3.5">
                <LogoIcon className="h-11 w-auto shrink-0 sm:h-13" priority />
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-[#0f1f15] sm:text-4xl lg:text-5xl dark:text-[#eef5ef]">
                    {counter ? "Counter Order" : "Menu"}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm font-medium text-[#334b3c] sm:text-base dark:text-[#a7b8ac]">
                    {counter
                      ? counterGuest
                        ? `For ${counterGuest.name} – pick dishes with them, customize add-ons, then confirm their order ticket.`
                        : "Pick dishes with the guest, customize add-ons, then confirm their order ticket."
                      : "Macro-balanced protein bowls, guilt-free street chaats, artisan sourdough melts and botanical smoothies."}
                  </p>
                </div>
              </div>

              {!counter && (
                <a
                  href="/menu/pdf"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cbe2d2] bg-white px-4 py-2 text-xs font-bold text-[#055c1b] shadow-xs transition-colors hover:bg-[#e7f4eb] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#7ddc78] dark:hover:bg-[#1f3325]"
                >
                  <FileText className="size-4" />
                  <span>Download PDF Menu</span>
                </a>
              )}
            </div>

            {!orderingEnabled && (
              <p className="inline-block rounded-full bg-[#ea580c]/15 px-4 py-1.5 text-xs font-bold text-[#ea580c]">
                Online ordering is currently paused for fresh prep – please order at the counter!
              </p>
            )}
          </div>
        </header>

        {/* Sticky Search & Navigation Bar */}
        <div className="sticky top-0 z-30 border-b border-[#d8e8dc] bg-[#f2faf3]/95 px-4 py-3 shadow-xs backdrop-blur-md sm:px-6 lg:px-8 dark:border-[#24392b] dark:bg-[#0e1a12]/95">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {/* Search Input & Quick Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                  className="h-11 w-full rounded-2xl border border-[#cde5d3] bg-white pr-10 pl-11 text-sm font-medium text-[#0f1f15] shadow-xs outline-none placeholder:text-[#64796c] focus-visible:ring-2 focus-visible:ring-[#055c1b] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#eef5ef] dark:placeholder:text-[#a7b8ac] dark:focus-visible:ring-[#7ddc78]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#e8f4ec] text-[#283c2e] transition-colors hover:bg-[#055c1b] hover:text-white dark:bg-[#24392b] dark:text-[#eef5ef] dark:hover:bg-[#7ddc78] dark:hover:text-[#0e1a12]"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filter Chips */}
              <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilters([])}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
                    filters.length === 0
                      ? "bg-[#055c1b] text-white shadow-xs"
                      : "border border-[#cde5d3] bg-white text-[#283c2e] hover:bg-[#055c1b] hover:text-white dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:bg-[#055c1b] dark:hover:text-white",
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
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
                        on
                          ? "border-[#ea580c] bg-[#ea580c] text-white shadow-xs"
                          : "border-[#cde5d3] bg-white text-[#283c2e] hover:border-[#055c1b] hover:bg-[#055c1b] hover:text-white dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:bg-[#055c1b] dark:hover:text-white",
                      )}
                    >
                      <f.icon className="size-3.5 shrink-0" aria-hidden />
                      <span>{f.label}</span>
                      {f.hint && (
                        <span
                          className={cn(
                            "text-[10px] opacity-80",
                            on ? "text-white" : "text-[#566b5d] dark:text-[#a7b8ac]",
                          )}
                        >
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
                        "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all disabled:pointer-events-none disabled:opacity-30 sm:text-sm",
                        isActive
                          ? "bg-[#055c1b] text-white shadow-sm"
                          : "border border-[#d2e8d8] bg-white/80 text-[#283c2e] hover:bg-[#055c1b] hover:text-white dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:bg-[#055c1b] dark:hover:text-white",
                      )}
                    >
                      <span>{c.name}</span>
                      {matchingCount > 0 && (
                        <span
                          className={cn(
                            "py-0.2 rounded-full px-1.5 text-[10px] font-black",
                            isActive
                              ? "bg-white/25 text-white"
                              : "bg-[#e8f4ec] text-[#055c1b] dark:bg-[#24392b] dark:text-[#7ddc78]",
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
        <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {!orderingEnabled && (
            <div className="mb-8 flex flex-col justify-between gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-amber-900 shadow-xs sm:flex-row sm:items-center dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold sm:text-sm">
                    {isWithinHours === false
                      ? "Online ordering is currently closed outside working hours."
                      : "Online ordering is temporarily paused."}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                    {hours && hours.length > 0
                      ? `Opening hours: ${hours.map((h) => `${h.days}: ${h.time}`).join(" • ")}`
                      : "You can explore the full menu, complete macros, and certified ingredients."}
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-start rounded-full bg-amber-200/80 px-3 py-1 text-[11px] font-black tracking-wider text-amber-900 uppercase sm:self-auto dark:bg-amber-900/60 dark:text-amber-200">
                Browsing Only
              </span>
            </div>
          )}

          {grouped.length === 0 && (
            <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-[#b0c4b2] bg-white p-12 text-center text-[#566b5d] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#a7b8ac]">
              <p className="text-lg font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                No dishes match your search.
              </p>
              <p className="mt-1 text-sm">Try clearing filters or search terms.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilters([]);
                }}
                className="mt-4 rounded-full bg-[#055c1b] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#044c16]"
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
              <div className="mb-5 flex flex-col justify-between gap-2 border-b border-[#d8e8dc] pb-4 sm:flex-row sm:items-center dark:border-[#24392b]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#055c1b]/10 font-bold text-[#055c1b] dark:bg-[#055c1b]/25 dark:text-[#7ddc78]">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2
                      id={`cat-${group.slug}`}
                      className="text-2xl font-black tracking-tight text-[#0f1f15] sm:text-3xl dark:text-[#eef5ef]"
                    >
                      {group.name}
                    </h2>
                  </div>
                </div>

                <span className="self-start rounded-full border border-[#c2ded0] bg-white px-3.5 py-1 text-xs font-black tracking-wider text-[#055c1b] uppercase sm:self-auto dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#7ddc78]">
                  {group.items.length} Option{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* 2-Column Responsive Card Grid */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
          <div className="mt-16 flex flex-col items-center justify-between gap-6 rounded-3xl border border-[#cde5d3] bg-white p-6 shadow-sm sm:p-8 md:flex-row dark:border-[#24392b] dark:bg-[#16251b]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#055c1b] text-white">
                <ShieldCheck className="size-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0f1f15] dark:text-[#eef5ef]">
                  Clean Label Guarantee
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed font-medium text-[#334b3c] sm:text-sm dark:text-[#a7b8ac]">
                  100% Unprocessed Paneer & Zero Seed Oil. Every gram of protein on our menu is certified from
                  authentic local partners.
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-[#e8f4ec] px-4 py-2 text-xs font-bold text-[#055c1b] dark:bg-[#1f3325] dark:text-[#7ddc78]">
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
        {orderingEnabled && (
          <CartBar items={items} addOns={addOns} counter={counter} counterGuest={counterGuest} />
        )}
      </div>
    </CartStoreContext.Provider>
  );
}
