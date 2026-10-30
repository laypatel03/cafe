"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteOffer, saveOffer } from "@/app/admin/(dashboard)/offers/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/hooks/use-form-action";
import { formatINR } from "@/lib/format";

export type OfferDish = { id: string; name: string; category: string; price: number };

export function OfferForm({ dishes, today }: { dishes: OfferDish[]; today: string }) {
  const [state, onSubmit, pending] = useFormAction(saveOffer, undefined);
  const [formKey, setFormKey] = useState(0);
  const [dishId, setDishId] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const err = state?.fieldErrors ?? {};
  const dish = dishes.find((d) => d.id === dishId);

  // after a successful save, clear the form for the next offer (adjusting state while rendering)
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) {
      setFormKey((k) => k + 1);
      setDishId("");
      setStartsOn(today);
    }
  }

  useEffect(() => {
    if (state?.ok) toast.success("Offer added – it shows on the website on its days");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  const byCategory = Map.groupBy(dishes, (d) => d.category);

  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField id="offer-dish" label="Dish" error={err.menuItemId}>
          <NativeSelect
            id="offer-dish"
            name="menuItemId"
            value={dishId}
            onChange={(e) => setDishId(e.target.value)}
            className="h-10"
            required
            aria-invalid={!!err.menuItemId}
          >
            <option value="" disabled>
              Choose a dish…
            </option>
            {[...byCategory].map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} – {formatINR(d.price)}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField
        id="offer-price"
        label="Offer price (₹)"
        hint={dish ? `Menu price ${formatINR(dish.price)}` : undefined}
        error={err.price}
      >
        <Input
          id="offer-price"
          name="price"
          inputMode="decimal"
          className="h-10"
          required
          aria-invalid={!!err.price}
        />
      </FormField>
      <FormField id="offer-title" label="Short line (optional)" hint="e.g. Monday special" error={err.title}>
        <Input id="offer-title" name="title" maxLength={60} className="h-10" />
      </FormField>
      <FormField id="offer-from" label="From" error={err.startsOn}>
        <Input
          id="offer-from"
          name="startsOn"
          type="date"
          min={today}
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          className="h-10"
          required
        />
      </FormField>
      <FormField id="offer-to" label="Till (last day)" error={err.endsOn}>
        <Input
          id="offer-to"
          name="endsOn"
          type="date"
          min={startsOn}
          defaultValue={today}
          className="h-10"
          required
          aria-invalid={!!err.endsOn}
        />
      </FormField>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          Add offer
        </Button>
      </div>
    </form>
  );
}

export function DeleteOfferButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="icon-sm"
      aria-label={`End the offer on ${name}`}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      title={`End the offer on ${name}?`}
      description="The website goes back to the regular price straight away. Orders already placed keep the price they were charged."
      confirmLabel="End offer"
      onConfirm={() => deleteOffer(id)}
    >
      <Trash2 />
    </ConfirmButton>
  );
}
