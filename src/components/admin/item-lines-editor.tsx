"use client";

import { ChevronLeft, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { QuantityStepper } from "@/components/menu/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PublicMenu } from "@/lib/data/menu";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";

export type EditableLine = {
  key: string;
  itemId: string;
  name: string;
  quantity: number;
  addOns: { id: string; name: string }[];
};

const keyOf = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

export function toEditableLines(
  items: { itemId: string | null; name: string; quantity: number; addOns: { id: string; name: string }[] }[],
) {
  return items
    .filter((i): i is typeof i & { itemId: string } => !!i.itemId)
    .map((i) => ({
      ...i,
      key: keyOf(
        i.itemId,
        i.addOns.map((a) => a.id),
      ),
    }));
}

/** Staff edit a guest's items: change quantity, remove, or add from the menu. */
export function ItemLinesEditor({
  lines,
  onChange,
  menu,
  allowSoldOut = false,
}: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  menu: PublicMenu;
  /** for past orders: the guest already had it, so sold-out items can be picked */
  allowSoldOut?: boolean;
}) {
  const [adding, setAdding] = useState(false);

  const add = (item: MenuItem, addOns: { id: string; name: string }[]) => {
    const key = keyOf(
      item.id,
      addOns.map((a) => a.id),
    );
    const existing = lines.find((l) => l.key === key);
    onChange(
      existing
        ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l))
        : [...lines, { key, itemId: item.id, name: item.name, quantity: 1, addOns }],
    );
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {lines.map((it) => (
          <li key={it.key} className="flex items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{it.name}</p>
              {it.addOns.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  + {it.addOns.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>
            <QuantityStepper
              value={it.quantity}
              min={1}
              label={`Quantity of ${it.name}`}
              onChange={(q) => onChange(lines.map((x) => (x.key === it.key ? { ...x, quantity: q } : x)))}
              className="h-9 [&_button]:size-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${it.name}`}
              onClick={() => onChange(lines.filter((x) => x.key !== it.key))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {lines.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">No items. Add something below.</li>
        )}
      </ul>
      {adding ? (
        <MenuPicker menu={menu} onPick={add} onCancel={() => setAdding(false)} allowSoldOut={allowSoldOut} />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setAdding(true)}
        >
          <Plus data-icon="inline-start" /> Add item
        </Button>
      )}
    </div>
  );
}

function MenuPicker({
  menu,
  onPick,
  onCancel,
  allowSoldOut,
}: {
  menu: PublicMenu;
  onPick: (item: MenuItem, addOns: { id: string; name: string }[]) => void;
  onCancel: () => void;
  allowSoldOut: boolean;
}) {
  const [query, setQuery] = useState("");
  const [choosing, setChoosing] = useState<MenuItem | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const addOnById = useMemo(() => new Map(menu.addOns.map((a) => [a.id, a])), [menu.addOns]);
  const q = query.trim().toLowerCase();
  const matches = menu.items.filter((i) => !q || i.name.toLowerCase().includes(q));

  if (choosing) {
    const options = choosing.addOnIds.map((id) => addOnById.get(id)).filter((a) => !!a);
    return (
      <div className="space-y-2 rounded-2xl border border-border p-3">
        <button
          type="button"
          onClick={() => setChoosing(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden /> Menu
        </button>
        <p className="font-semibold">{choosing.name}</p>
        <ul className="space-y-1">
          {options.map((a) => (
            <li key={a.id}>
              <label
                className={`flex min-h-9 items-center gap-2 text-sm ${a.available || allowSoldOut ? "cursor-pointer" : "opacity-50"}`}
              >
                <Checkbox
                  disabled={!a.available && !allowSoldOut}
                  checked={picked.includes(a.id)}
                  onCheckedChange={(c) => setPicked((p) => (c ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                />
                <span className="flex-1">{a.name}</span>
                <span className="tabular text-xs text-muted-foreground">
                  {a.available || allowSoldOut ? `+${formatINR(a.price)}` : "Sold out"}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() =>
            onPick(
              choosing,
              picked.map((id) => ({ id, name: addOnById.get(id)!.name })),
            )
          }
        >
          Add {choosing.name}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search the menu</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            className="h-9 w-full rounded-full border border-input bg-background pr-3 pl-8 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <ul className="max-h-56 divide-y divide-border overflow-y-auto">
        {matches.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!item.available && !allowSoldOut}
              onClick={() => {
                if (item.addOnIds.length > 0) {
                  setPicked([]);
                  setChoosing(item);
                } else onPick(item, []);
              }}
              className="flex w-full items-center gap-2 px-1 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="tabular text-xs text-muted-foreground">
                {item.available || allowSoldOut ? formatINR(item.price) : "Sold out"}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="py-3 text-center text-sm text-muted-foreground">Nothing matches.</li>
        )}
      </ul>
    </div>
  );
}
