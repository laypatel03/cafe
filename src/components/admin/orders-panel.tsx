"use client";

import { ChefHat, LoaderCircle, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { advanceOrder, cancelOrder, updateOrderItems } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { OrderStatus } from "@/generated/prisma/enums";
import type { LiveBill, LiveOrder } from "@/lib/data/live";
import type { PublicMenu } from "@/lib/data/menu";
import { CAFE_TZ, formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { ACTION_LABEL, availableActions, canCancel, canEditItems } from "@/lib/order-flow";
import { cn } from "@/lib/utils";
import { BillingPanel } from "./billing-panel";
import { type EditableLine, ItemLinesEditor, toEditableLines } from "./item-lines-editor";
import { OrderStatusBadge } from "./order-status-badge";

const GROUPS: { title: string; statuses: OrderStatus[]; hint: string }[] = [
  {
    title: "New orders",
    statuses: ["NEW"],
    hint: "Orders guests place from the QR menu appear here. Check them and accept.",
  },
  {
    title: "Accepted",
    statuses: ["ACCEPTED"],
    hint: "Edit the items if needed, then send to the kitchen.",
  },
  {
    title: "In the kitchen",
    statuses: ["PREPARING"],
    hint: "Mark served (or ready to collect) when it leaves the kitchen.",
  },
  { title: "Ready to collect", statuses: ["READY"], hint: "Takeaway orders waiting for the guest." },
];

export function OrdersPanel({
  orders,
  bills,
  menu,
  onChanged,
}: {
  orders: LiveOrder[];
  bills: LiveBill[];
  menu: PublicMenu;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<LiveOrder | null>(null);
  const [cancelling, setCancelling] = useState<LiveOrder | null>(null);
  const served = orders.filter((o) => o.status === "PAID");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  return (
    <>
      {GROUPS.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        if (g.statuses.includes("READY") && list.length === 0) return null;
        return (
          <section key={g.title} className="space-y-3" aria-label={g.title}>
            <h2 className="text-lg font-bold">
              {g.title} <span className="text-sm font-normal text-muted-foreground">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                {g.hint}
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onEdit={() => setEditing(o)}
                    onCancel={() => setCancelling(o)}
                    onChanged={onChanged}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <BillingPanel orders={orders} bills={bills} onChanged={onChanged} />

      {served.length + cancelled.length > 0 && (
        <section className="space-y-3" aria-label="Done today">
          <details className="group">
            <summary className="cursor-pointer text-lg font-bold">
              Done today{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {served.length} paid{cancelled.length > 0 && ` · ${cancelled.length} cancelled`}
              </span>
            </summary>
            <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...served, ...cancelled].map((o) => (
                <OrderCard key={o.id} order={o} onEdit={() => {}} onCancel={() => {}} onChanged={onChanged} />
              ))}
            </ul>
          </details>
        </section>
      )}

      <EditItemsDialog order={editing} menu={menu} onClose={() => setEditing(null)} onSaved={onChanged} />
      <CancelDialog order={cancelling} onClose={() => setCancelling(null)} onDone={onChanged} />
    </>
  );
}

function OrderCard({
  order: o,
  onEdit,
  onCancel,
  onChanged,
}: {
  order: LiveOrder;
  onEdit: () => void;
  onCancel: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const actions = availableActions(o.status, o.type);
  const done = o.status === "SERVED" || o.status === "PAID" || o.status === "CANCELLED";

  const run = (action: (typeof actions)[number]) =>
    start(async () => {
      const res = await advanceOrder(o.id, action);
      if (res.ok) {
        toast.success(`#${o.number} · ${ACTION_LABEL[action]}`);
        onChanged();
      } else toast.error(res.error);
    });

  return (
    <li className={cn("flex flex-col rounded-3xl border border-border bg-card p-4", done && "opacity-75")}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-lg font-bold">
            #{o.number} · {o.type === "PARCEL" ? "Takeaway" : "Dine-in"}
          </p>
          <p className="text-xs text-muted-foreground">
            {o.customerName}
            {o.customerPhone && ` · ${o.customerPhone}`} ·{" "}
            {new Date(o.createdAt).toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: CAFE_TZ,
            })}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>
      <ul className="mt-3 flex-1 space-y-1 text-sm">
        {o.items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="w-7 shrink-0 tabular font-bold text-brand-text">{i.quantity}×</span>
            <span className="flex-1">
              {i.name}
              {i.addOns.length > 0 && (
                <span className="block text-xs text-muted-foreground">
                  + {i.addOns.map((a) => a.name).join(", ")}
                </span>
              )}
            </span>
            <span className="tabular text-muted-foreground">{formatINR(toRupees(i.lineTotalPaise))}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-sm">Note: {o.note}</p>}
      {o.status === "CANCELLED" && o.cancelReason && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Cancelled: {o.cancelReason}
        </p>
      )}
      <p className="mt-3 border-t border-border pt-2 text-right tabular font-semibold">
        {formatINR(toRupees(o.totalPaise))}
      </p>

      {!done && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              size="sm"
              disabled={pending}
              className={cn(
                "rounded-full",
                (a === "accept" || a === "toKitchen") &&
                  "bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light",
              )}
              onClick={() => run(a)}
            >
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : a === "toKitchen" ? (
                <ChefHat data-icon="inline-start" />
              ) : null}
              {ACTION_LABEL[a]}
            </Button>
          ))}
          {canEditItems(o.status) && (
            <Button size="sm" variant="outline" className="rounded-full" disabled={pending} onClick={onEdit}>
              <Pencil data-icon="inline-start" /> Edit items
            </Button>
          )}
          {o.paid && <span className="text-sm font-semibold text-brand-text">Paid</span>}
          {canCancel(o.status, o.paid) && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto rounded-full text-destructive"
              disabled={pending}
              onClick={onCancel}
            >
              <X data-icon="inline-start" /> Cancel
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function EditItemsDialog({
  order,
  menu,
  onClose,
  onSaved,
}: {
  order: LiveOrder | null;
  menu: PublicMenu;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {order && (
          <EditItemsForm key={order.id} order={order} menu={menu} onClose={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditItemsForm({
  order,
  menu,
  onClose,
  onSaved,
}: {
  order: LiveOrder;
  menu: PublicMenu;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<EditableLine[]>(() => toEditableLines(order.items));
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const dropped = order.items.length - toEditableLines(order.items).length;

  const save = () =>
    start(async () => {
      const res = await updateOrderItems(
        order.id,
        lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOns.map((a) => a.id), quantity: l.quantity })),
      );
      if (res.ok) {
        toast.success(`Order #${order.number} updated`);
        onSaved();
        onClose();
      } else setError({ message: res.error, problems: res.problems });
    });

  return (
    <div className="space-y-4">
      <div>
        <DialogTitle className="text-xl">
          Edit order #{order.number} · {order.type === "PARCEL" ? "Takeaway" : "Dine-in"}
        </DialogTitle>
        <DialogDescription>
          Change, remove or add items before it goes to the kitchen. Prices update from the menu.
        </DialogDescription>
      </div>
      {dropped > 0 && (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm">
          {dropped} item{dropped > 1 ? "s were" : " was"} removed from the menu and will be dropped when you
          save.
        </p>
      )}
      <ItemLinesEditor lines={lines} onChange={setLines} menu={menu} />
      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error.message}</p>
          {error.problems && (
            <ul className="mt-1 list-disc pl-5">
              {error.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Keep as it was
        </Button>
        <Button onClick={save} disabled={pending || lines.length === 0}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          Save changes
        </Button>
      </DialogFooter>
    </div>
  );
}

const QUICK_REASONS = ["Guest left", "Item not available", "Duplicate order", "Guest changed their mind"];

function CancelDialog({
  order,
  onClose,
  onDone,
}: {
  order: LiveOrder | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const close = () => {
    setReason("");
    onClose();
  };
  const submit = () =>
    order &&
    start(async () => {
      const res = await cancelOrder(order.id, reason);
      if (res.ok) {
        toast.success(`Order #${order.number} cancelled`);
        onDone();
        close();
      } else toast.error(res.error);
    });

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogTitle>Cancel order #{order?.number}?</DialogTitle>
        <DialogDescription>
          The guest&apos;s phone will show it as cancelled. Say why – it&apos;s kept in the order history.
        </DialogDescription>
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                reason === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          aria-label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Or type a reason"
        />
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Keep order
          </Button>
          <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={submit}>
            Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
