"use client";

import { ChevronLeft, Dumbbell, FileText, Feather, Search, Star, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoIcon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NUTRITION_NOTE } from "@/lib/cafe";
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
import { CartStoreContext, useCart, useCounterCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { CartBar } from "./cart-bar";
import { ItemSheet } from "./item-sheet";
import { MenuItemCard } from "./menu-item-card";

type Filter = "high-protein" | "light" | "bestseller";

const FILTERS: { id: Filter; label: string; hint: string; icon: typeof Star }[] = [
  { id: "high-protein", label: "High protein", hint: `${HIGH_PROTEIN_MIN_G} g+`, icon: Dumbbell },
  { id: "light", label: "Light", hint: `under ${LIGHT_MAX_KCAL} kcal`, icon: Feather },
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
      (i) => (!q || i.name.toLowerCase().includes(q)) && filters.every((f) => matches[f](i)),
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
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: "smooth" });
    setTimeout(() => (clickScrolling.current = false), 700);
  };

  const toggleFilter = (f: Filter) =>
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <CartStoreContext.Provider value={counter ? useCounterCart : useCart}>
      <div className="min-h-svh bg-background pb-32">
        <header className="relative overflow-hidden bg-surface px-4 pt-4 pb-14 text-surface-foreground">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 90% at 90% 0%, rgba(255,120,0,0.38), transparent 60%), radial-gradient(50% 70% at 0% 100%, rgba(120,185,12,0.3), transparent 60%)",
            }}
          />
          <div className="relative mx-auto flex max-w-2xl items-center justify-between">
            <Link
              href={counter ? "/admin" : "/"}
              className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm text-white/85 hover:text-white"
            >
              <ChevronLeft className="size-4" aria-hidden /> {counter ? "Live orders" : "Healthy Hunger"}
            </Link>
            <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
          </div>
          <div className="relative mx-auto mt-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20">
                <LogoIcon className="h-9" alt="" priority />
              </span>
              <div>
                <h1 className="text-4xl font-bold">{counter ? "Counter order" : "Menu"}</h1>
                <p className="-mt-1 tagline text-[10px] text-surface-accent">Eat well, live well</p>
              </div>
            </div>
            <p className="mt-3 text-white/85">
              {counter
                ? counterGuest
                  ? `For ${counterGuest.name} – pick the dishes with them.`
                  : "Pick the dishes with the guest, then add their name."
                : "100% vegetarian · protein from real food"}
            </p>
            {!counter && (
              <a
                href="/menu/pdf"
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
              >
                <FileText className="size-4" aria-hidden /> Menu as PDF
              </a>
            )}
            {!orderingEnabled && (
              <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm">
                The menu is view-only right now – please order at the counter.
              </p>
            )}
          </div>
        </header>

        <div className="sticky top-0 z-30 -mt-8 px-4">
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-background/85 p-2 shadow-[0_18px_40px_-26px_rgba(14,85,24,0.5)] backdrop-blur-xl">
            <label className="relative block">
              <span className="sr-only">Search the menu</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search paneer, chaat, avocado…"
                className="h-11 w-full rounded-2xl bg-card pr-10 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>

            <LayoutGroup>
              <nav aria-label="Categories" className="mt-2 flex [scrollbar-width:none] gap-1 overflow-x-auto">
                {categories.map((c) => {
                  const isActive = c.slug === active;
                  const empty = !grouped.some((g) => g.slug === c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      disabled={empty}
                      onClick={() => jumpTo(c.slug)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-35",
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.name}
                      {isActive && (
                        <motion.span
                          layoutId="cat-underline"
                          className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-brand"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>

            <div className="mt-2 flex [scrollbar-width:none] gap-2 overflow-x-auto pb-0.5">
              {FILTERS.map((f) => {
                const on = filters.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFilter(f.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/60 text-secondary-foreground hover:bg-secondary",
                    )}
                  >
                    <f.icon className="size-3.5" aria-hidden />
                    {f.label}
                    {f.hint && (
                      <span className={cn("text-xs", on ? "opacity-80" : "text-muted-foreground")}>
                        {f.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-2xl px-4 pt-6">
          {grouped.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nothing matches. Try clearing a filter.
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
              className="mb-10"
              aria-labelledby={`cat-${group.slug}`}
            >
              <h2 id={`cat-${group.slug}`} className="mb-4 text-2xl font-bold">
                {group.name}
              </h2>
              <div className="grid gap-5">
                {/* initial={false}: cards are visible in the server HTML, so the menu paints before JS loads */}
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

          <p className="mt-4 rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
            {NUTRITION_NOTE}
          </p>
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
