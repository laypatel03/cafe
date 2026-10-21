"use client";

import { EyeOff, FileText, GripVertical, Pencil, Plus, Search } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  moveMenuItem,
  setAddOnAvailable,
  setItemAvailable,
  setMenuItemOrder,
} from "@/app/admin/(dashboard)/menu/actions";
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
                    <SortableItems
                      categoryId={cat.id}
                      items={items}
                      isOwner={isOwner}
                      // reordering a filtered list would hide where the other items go
                      draggable={isOwner && !q}
                    />
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

type Item = AdminMenu["categories"][number]["items"][number];

/** One category's items; the owner reorders them by dragging the grip (the arrows stay for keyboard use). */
function SortableItems({
  categoryId,
  items,
  isOwner,
  draggable,
}: {
  categoryId: string;
  items: Item[];
  isOwner: boolean;
  draggable: boolean;
}) {
  const serverIds = items.map((i) => i.id);
  // restart from the server order whenever it changes (after a save, the arrows, or another device)
  const serverKey = serverIds.join(",");
  const [state, setState] = useState({ key: serverKey, ids: serverIds });
  const ids = state.key === serverKey ? state.ids : serverIds;
  // the drop handler can run before React re-renders with the last reorder
  const latest = useRef(state);
  const [pending, start] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));

  const save = () => {
    if (latest.current.key !== serverKey) return;
    const next = latest.current.ids;
    if (next.join(",") === serverKey) return;
    start(async () => {
      const res = await setMenuItemOrder(categoryId, next);
      if ("error" in res) {
        toast.error(res.error);
        latest.current = { key: serverKey, ids: serverIds };
        setState(latest.current);
      }
    });
  };

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={ids}
      onReorder={(next: string[]) => {
        latest.current = { key: serverKey, ids: next };
        setState(latest.current);
      }}
      className="divide-y divide-border rounded-2xl border border-border bg-card"
      aria-busy={pending}
    >
      {ids.map((id, idx) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <ItemRow
            key={id}
            item={item}
            isOwner={isOwner}
            draggable={draggable}
            first={idx === 0}
            last={idx === ids.length - 1}
            onDrop={save}
          />
        );
      })}
    </Reorder.Group>
  );
}

function ItemRow({
  item,
  isOwner,
  draggable,
  first,
  last,
  onDrop,
}: {
  item: Item;
  isOwner: boolean;
  draggable: boolean;
  first: boolean;
  last: boolean;
  onDrop: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={item.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10 }}
      className="relative flex items-center gap-3 bg-card px-3 py-2.5 first:rounded-t-2xl last:rounded-b-2xl"
    >
      {draggable && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          title="Drag to reorder"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          // touch-none: on phones the finger drags the row instead of scrolling the page
          className="-mr-1 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
      )}
      <ItemImage item={item} sizes="48px" className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-medium">
          <span className={item.available ? "" : "text-muted-foreground line-through"}>{item.name}</span>
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
      {draggable && (
        <MoveButtons label={item.name} first={first} last={last} move={(dir) => moveMenuItem(item.id, dir)} />
      )}
      {isOwner && (
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`}>
          <Link href={`/admin/menu/items/${item.id}`}>
            <Pencil />
          </Link>
        </Button>
      )}
    </Reorder.Item>
  );
}

export function HiddenBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <EyeOff className="size-3" aria-hidden /> Hidden
    </span>
  );
}
