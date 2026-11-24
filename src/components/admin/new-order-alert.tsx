"use client";

import { BellRing, Check, LoaderCircle, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { advanceOrder } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import type { LiveOrder } from "@/lib/data/live";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";

/**
 * Live orders: a popup that stays on screen while guest orders wait to be accepted or declined –
 * it only goes when every new order is handled.
 */
export function NewOrderAlert({
  orders,
  onDecline,
  onChanged,
}: {
  orders: LiveOrder[];
  onDecline: (o: LiveOrder) => void;
  onChanged: () => void;
}) {
  if (orders.length === 0) return null;
  const shown = orders.slice(0, 3);
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`${orders.length} new order${orders.length === 1 ? "" : "s"} waiting`}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-3xl border-2 border-hh-orange bg-card p-4 shadow-2xl ring-4 ring-hh-orange/30 motion-safe:animate-[pulse_1.6s_ease-in-out_infinite] sm:right-4 sm:left-auto sm:mx-0"
    >
      <p className="flex items-center gap-2 text-base font-bold">
        <BellRing className="size-5 text-brand-text" aria-hidden />
        {orders.length === 1 ? "New order" : `${orders.length} new orders`} – accept or decline
      </p>
      <ul className="mt-2 divide-y divide-border">
        {shown.map((o) => (
          <AlertRow key={o.id} order={o} onDecline={() => onDecline(o)} onChanged={onChanged} />
        ))}
      </ul>
      {orders.length > shown.length && (
        <p className="mt-1 text-xs text-muted-foreground">
          + {orders.length - shown.length} more under New orders
        </p>
      )}
    </div>
  );
}

function AlertRow({
  order: o,
  onDecline,
  onChanged,
}: {
  order: LiveOrder;
  onDecline: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const dishes = o.items.reduce((n, i) => n + (i.custom ? 0 : i.quantity), 0);
  const accept = () =>
    start(async () => {
      const res = await advanceOrder(o.id, "accept");
      if (res.ok) {
        toast.success(`#${o.number} accepted`);
        onChanged();
      } else toast.error(res.error);
    });
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <a href={`#order-${o.id}`} className="min-w-0 flex-1 text-sm hover:underline">
        <span className="font-bold">
          #{o.number} · {o.type === "PARCEL" ? "Takeaway" : "Dine-in"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {o.customerName} · {dishes} item{dishes === 1 ? "" : "s"} · {formatINR(toRupees(o.totalPaise))}
        </span>
      </a>
      <Button
        size="sm"
        disabled={pending}
        onClick={accept}
        className="rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check data-icon="inline-start" />}
        Accept
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={onDecline} className="rounded-full">
        <X data-icon="inline-start" /> Decline
      </Button>
    </li>
  );
}
