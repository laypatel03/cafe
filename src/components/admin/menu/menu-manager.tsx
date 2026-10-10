"use client";

import { EyeOff, FileText, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { moveMenuItem, setAddOnAvailable, setItemAvailable } from "@/app/admin/(dashboard)/menu/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { MoveButtons } from "@/components/admin/move-buttons";
import { ItemImage } from "@/components/menu/item-art";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminMenu } from "@/lib/data/admin-menu";
import { formatINR } from "@/lib/format";
import { AddOnsPanel } from "./add-ons-panel";
import { CategoriesPanel } from "./categories-panel";

export function MenuManager({ menu, isOwner }: { menu: AdminMenu; isOwner: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const soldOut = menu.categories.flatMap((c) => c.items).filter((i) => !i.available).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Edit items, prices and photos. Changes show on the QR menu straight away."
              : "Switch items off when they run out – customers see “Sold out” at once."}
            {soldOut > 0 && <span className="ml-1 font-medium text-brand-text">{soldOut} sold out now.</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <a href="/menu/pdf" target="_blank" rel="noopener">
              <FileText data-icon="inline-start" /> Menu PDF
            </a>
          </Button>
          {isOwner && (
            <Button asChild className="rounded-full">
              <Link href="/admin/menu/items/new">
                <Plus data-icon="inline-start" /> Add item
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="items" className="mt-6">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          {isOwner && <TabsTrigger value="categories">Categories</TabsTrigger>}
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <label className="relative mb-5 block max-w-sm">
            <span className="sr-only">Search items</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items"
              className="h-10 w-full rounded-full border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </label>

          <div className="space-y-8">
            {menu.categories.map((cat) => {
              const items = cat.items.filter((i) => !q || i.name.toLowerCase().includes(q));
              if (q && items.length === 0) return null;
              return (
                <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                  <h2 id={`cat-${cat.id}`} className="mb-2 flex items-center gap-2 text-lg font-bold">
                    {cat.name}
                    <span className="text-sm font-normal text-muted-foreground">{cat.items.length}</span>
                    {!cat.visible && <HiddenBadge />}
                  </h2>
                  {items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No items yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                      {items.map((item, idx) => (
                        <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                          <ItemImage item={item} sizes="48px" className="size-12 shrink-0 rounded-xl" />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-x-2 font-medium">
                              <span className={item.available ? "" : "text-muted-foreground line-through"}>
                                {item.name}
                              </span>
                              {item.isBestseller && (
                                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-brand-text">
                                  Bestseller
                                </span>
                              )}
                              {!item.visible && <HiddenBadge />}
                            </p>
                            <p className="tabular text-xs text-muted-foreground">
                              {formatINR(item.price)} · {item.protein} g · {item.kcal} kcal
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {item.available ? "Available" : "Sold out"}
                            </span>
                            <ActionSwitch
                              checked={item.available}
                              label={`${item.name} available`}
                              action={(next) => setItemAvailable(item.id, next)}
                              successMessage={(next) => `${item.name} is ${next ? "back on" : "sold out"}`}
                            />
                          </div>
                          {isOwner && !q && (
                            <MoveButtons
                              label={item.name}
                              first={idx === 0}
                              last={idx === items.length - 1}
                              move={(dir) => moveMenuItem(item.id, dir)}
                            />
                          )}
                          {isOwner && (
                            <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`}>
                              <Link href={`/admin/menu/items/${item.id}`}>
                                <Pencil />
                              </Link>
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </TabsContent>

        {isOwner && (
          <TabsContent value="categories" className="mt-4">
            <CategoriesPanel categories={menu.categories} />
          </TabsContent>
        )}

        <TabsContent value="addons" className="mt-4">
          <AddOnsPanel addOns={menu.addOns} isOwner={isOwner} setAvailable={setAddOnAvailable} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HiddenBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <EyeOff className="size-3" aria-hidden /> Hidden
    </span>
  );
}
