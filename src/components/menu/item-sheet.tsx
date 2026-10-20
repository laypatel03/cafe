"use client";

import { useState } from "react";
import { toast } from "sonner";
import { VegMark } from "@/components/brand/veg-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCartStore } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { hasNutrition, type AddOn, type MenuItem } from "@/lib/menu-types";
import { ItemImage } from "./item-art";
import { QuantityStepper } from "./quantity-stepper";

type Props = {
  item: MenuItem | null;
  addOns: AddOn[];
  orderingEnabled: boolean;
  onClose: () => void;
};

export function ItemSheet({ item, addOns, orderingEnabled, onClose }: Props) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92svh] max-w-xl gap-0 overflow-y-auto rounded-t-[2rem] border-x p-0 sm:bottom-4 sm:rounded-[2rem] sm:border"
      >
        {/* keyed so quantity and add-ons reset for each item */}
        {item && (
          <ItemSheetBody
            key={item.id}
            item={item}
            addOns={addOns}
            orderingEnabled={orderingEnabled}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemSheetBody({
  item,
  addOns,
  orderingEnabled,
  onDone,
}: {
  item: MenuItem;
  addOns: AddOn[];
  orderingEnabled: boolean;
  onDone: () => void;
}) {
  const add = useCartStore()((s) => s.add);
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<string[]>([]);
  const options = addOns.filter((a) => item.addOnIds.includes(a.id));
  const picked = options.filter((a) => chosen.includes(a.id));
  const protein = item.protein + picked.reduce((s, a) => s + a.protein, 0);
  const kcal = item.kcal + picked.reduce((s, a) => s + a.kcal, 0);
  const canOrder = orderingEnabled && item.available;

  return (
    <>
      <div className="relative">
        <ItemImage
          item={item}
          sizes="(min-width: 640px) 576px, 100vw"
          priority
          className="h-52 w-full sm:h-60"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-popover to-transparent" />
        <span className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/60 sm:hidden" />
      </div>
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <VegMark />
          {!item.available && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
              Sold out
            </span>
          )}
        </div>
        <SheetTitle className="mt-2 font-heading text-3xl font-bold">{item.name}</SheetTitle>
        <SheetDescription className="mt-1 text-base">{item.description}</SheetDescription>

        <dl
          className={`mt-4 grid gap-2 text-center tabular ${hasNutrition(item) ? "grid-cols-3" : "grid-cols-1"}`}
        >
          {[
            ...(hasNutrition(item)
              ? [
                  ["Protein*", `~${protein} g`],
                  ["Energy*", `~${kcal} kcal`],
                ]
              : []),
            ["Price", formatINR(item.price)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-secondary/60 px-2 py-3">
              <dt className="font-sans text-[11px] text-muted-foreground uppercase">{k}</dt>
              <dd className="mt-0.5 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {hasNutrition(item) && (
          <p className="mt-2 text-xs text-muted-foreground">
            *Our own estimate from the recipe, not lab-tested.
          </p>
        )}

        {item.ingredients.length > 0 && (
          <>
            <h4 className="mt-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Ingredients
            </h4>
            <p className="mt-1">{item.ingredients.join(", ")}</p>
          </>
        )}

        {options.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Add-ons
            </legend>
            <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
              {options.map((a) => {
                const id = `addon-${a.id}`;
                return (
                  <li key={a.id}>
                    <label
                      htmlFor={id}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${
                        a.available
                          ? "cursor-pointer text-[#0f1f15] hover:bg-[#e8f4ec]/70 dark:text-[#eef5ef] dark:hover:bg-[#1f3325]/70"
                          : "opacity-50"
                      }`}
                    >
                      <Checkbox
                        id={id}
                        disabled={!a.available || !canOrder}
                        checked={chosen.includes(a.id)}
                        onCheckedChange={(c) =>
                          setChosen((prev) => (c ? [...prev, a.id] : prev.filter((x) => x !== a.id)))
                        }
                      />
                      <span className="flex-1">
                        <span className="text-sm font-semibold">{a.name}</span>
                        <span className="block tabular text-xs font-medium text-muted-foreground">
                          {a.available ? `+${a.protein} g protein · ${a.kcal} kcal` : "Sold out"}
                        </span>
                      </span>
                      <span className="tabular text-sm font-bold text-[#055c1b] dark:text-[#7ddc78]">
                        +{formatINR(a.price)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </div>

      {canOrder ? (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
          <QuantityStepper value={qty} onChange={setQty} label="Quantity" />
          <Button
            className="h-11 flex-1 rounded-full bg-[#ea580c] text-base font-extrabold text-white shadow-md transition-all hover:bg-[#c2410c] hover:text-white active:scale-95"
            onClick={() => {
              add({
                itemId: item.id,
                name: item.name,
                addOnIds: picked.map((a) => a.id),
                addOnNames: picked.map((a) => a.name),
                quantity: qty,
              });
              toast.success(`${qty} × ${item.name} added to your list`);
              onDone();
            }}
          >
            Add to my list
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-0 border-t border-border bg-popover/95 px-5 py-3.5 text-center backdrop-blur">
          <p className="text-xs font-bold text-muted-foreground">
            {!orderingEnabled
              ? "Online ordering is currently closed outside working hours."
              : !item.available
                ? "This dish is currently sold out."
                : "Price to be confirmed."}
          </p>
        </div>
      )}
    </>
  );
}
