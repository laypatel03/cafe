"use client";

import {
  Ban,
  Banknote,
  Clock,
  CreditCard,
  LoaderCircle,
  Printer,
  ReceiptText,
  Smartphone,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  generateBill,
  markBillPaid,
  markBillPayLater,
  markBillsPaid,
  voidBill,
} from "@/app/admin/(dashboard)/actions";
import { BalanceBox } from "@/components/admin/balance-box";
import { MealPassBox } from "@/components/admin/passes/pass-forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LiveBill, LiveOrder } from "@/lib/data/live";
import type { LivePass } from "@/lib/data/meal-passes";
import { CAFE_TZ, formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import { undoStep } from "./undo-step";

type ToBill = {
  key: string;
  title: string;
  orders: LiveOrder[];
  /** this guest's dine-in orders that are not served yet – the bill waits for them */
  waitingOn: LiveOrder[];
};

/** Served dine-in orders grouped by guest (one bill per visit); takeaway billed per order. */
function toBill(orders: LiveOrder[]): ToBill[] {
  const out: ToBill[] = [];
  const byGuest = new Map<string, LiveOrder[]>();
  for (const o of orders) {
    if (o.billId || o.status === "CANCELLED" || o.status === "PAID") continue;
    if (o.type === "PARCEL") {
      if (o.status === "READY" || o.status === "SERVED") {
        out.push({
          key: o.id,
          title: `Takeaway #${o.number}`,
          orders: [o],
          waitingOn: [],
        });
      }
    } else {
      const key = o.customerId ?? o.id;
      byGuest.set(key, [...(byGuest.get(key) ?? []), o]);
    }
  }
  for (const [key, unsorted] of byGuest) {
    const list = [...unsorted].sort((a, b) => a.number - b.number);
    const served = list.filter((o) => o.status === "SERVED");
    if (served.length === 0) continue;
    out.push({
      key,
      title: `Dine-in · ${list[0].customerName}`,
      orders: served,
      waitingOn: list.filter((o) => o.status !== "SERVED"),
    });
  }
  return out;
}

export function BillingPanel({
  orders,
  bills,
  payLater,
  passes,
  balances,
  balanceBills,
  onChanged,
}: {
  orders: LiveOrder[];
  bills: LiveBill[];
  payLater: LiveBill[];
  passes: Record<string, LivePass>;
  balances: Record<string, number>;
  balanceBills: Record<string, number[]>;
  onChanged: () => void;
}) {
  const pending = toBill(orders);
  return (
    <>
      {pending.length > 0 && (
        <section className="space-y-3" aria-label="To bill">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ReceiptText className="size-5 text-brand-text" aria-hidden /> To bill
            <span className="text-sm font-normal text-muted-foreground">{pending.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((b) => (
              <ToBillCard
                key={b.key}
                entry={b}
                pass={b.orders[0].customerId ? passes[b.orders[0].customerId] : undefined}
                balance={b.orders[0].customerId ? balances[b.orders[0].customerId] : undefined}
                balanceBills={b.orders[0].customerId ? balanceBills[b.orders[0].customerId] : undefined}
                onChanged={onChanged}
              />
            ))}
          </ul>
        </section>
      )}
      {bills.length > 0 && (
        <section className="space-y-3" aria-label="Awaiting payment">
          <h2 className="text-lg font-bold">
            Awaiting payment <span className="text-sm font-normal text-muted-foreground">{bills.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bills.map((b) => (
              <BillCard key={b.id} bill={b} onChanged={onChanged} />
            ))}
          </ul>
        </section>
      )}
      {payLater.length > 0 && (
        <section className="space-y-3" aria-label="Pay later">
          <details className="group" open>
            <summary className="cursor-pointer text-lg font-bold">
              <Clock className="mr-1 inline size-5 text-brand-text" aria-hidden /> Pay later{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {payLater.length} not paid yet ·{" "}
                {formatINR(toRupees(payLater.reduce((s, b) => s + b.totalPaise, 0)))}
              </span>
            </summary>
            <p className="mt-1 text-sm text-muted-foreground">
              Orders completed without payment today, one card per guest (with their earlier unpaid ones).
              Tick the bills they&apos;re paying now and tap how they paid – it counts as a sale today. Other
              earlier days are in Order history.
            </p>
            <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupByGuest(payLater).map((g) => (
                <PayLaterGuestCard key={g[0].guestKey} bills={g} onChanged={onChanged} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}

function ToBillCard({
  entry,
  pass,
  balance,
  balanceBills,
  onChanged,
}: {
  entry: ToBill;
  pass: LivePass | undefined;
  balance: number | undefined;
  balanceBills: number[] | undefined;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const total = entry.orders.reduce((s, o) => s + o.totalPaise, 0);
  const items = entry.orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  return (
    <li className="flex flex-col rounded-3xl border border-border bg-card p-4">
      <p className="text-lg font-bold">{entry.title}</p>
      <p className="text-xs text-muted-foreground">
        {entry.orders[entry.orders.length - 1].customerName} ·{" "}
        {entry.orders.length === 1 ? "order" : "orders"} {entry.orders.map((o) => `#${o.number}`).join(", ")}{" "}
        · {items} item{items === 1 ? "" : "s"}
      </p>
      {entry.waitingOn.length > 0 && (
        <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-sm">
          {entry.waitingOn.map((o) => `#${o.number}`).join(", ")} still in progress – serve or cancel before
          billing.
        </p>
      )}
      {entry.orders
        .filter((o) => o.undo)
        .map((o) => (
          <Button
            key={o.id}
            size="sm"
            variant="ghost"
            className="mt-2 self-start rounded-full text-muted-foreground"
            disabled={pending}
            onClick={() => start(() => undoStep(o, onChanged))}
          >
            <Undo2 data-icon="inline-start" /> Undo “{o.undo}” on #{o.number}
          </Button>
        ))}
      <MealPassBox
        pass={pass}
        orderIds={entry.orders.map((o) => o.id)}
        passUsed={entry.orders.some((o) => o.items.some((i) => i.pass))}
        onChanged={onChanged}
      />
      <BalanceBox
        balance={balance}
        bills={balanceBills ?? []}
        orderIds={entry.orders.map((o) => o.id)}
        ordersTotalPaise={total}
        used={entry.orders.some((o) => o.items.some((i) => i.balance))}
        onChanged={onChanged}
      />
      <p className="mt-3 text-right tabular text-2xl font-bold">{formatINR(toRupees(total))}</p>
      <Button
        className="mt-3 rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
        disabled={pending || entry.waitingOn.length > 0}
        onClick={() =>
          start(async () => {
            const res = await generateBill(entry.orders.map((o) => o.id));
            if (res.ok) {
              toast.success(`Bill #${res.number} ready`);
              onChanged();
            } else toast.error(res.error);
          })
        }
      >
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <ReceiptText data-icon="inline-start" />
        )}
        Generate bill
      </Button>
      <Button
        variant="outline"
        className="mt-2 rounded-full"
        disabled={pending || entry.waitingOn.length > 0}
        onClick={() =>
          start(async () => {
            const res = await generateBill(entry.orders.map((o) => o.id));
            if (!res.ok) return void toast.error(res.error);
            const later = await markBillPayLater(res.billId);
            if (later.ok) toast.success(`Bill #${res.number} completed – pay later`);
            else toast.error(later.error);
            onChanged();
          })
        }
      >
        <Clock data-icon="inline-start" /> Complete · pay later
      </Button>
    </li>
  );
}

const METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "Google Pay", icon: Smartphone },
  { id: "CREDIT_CARD", label: "Credit card", icon: CreditCard },
  { id: "DEBIT_CARD", label: "Debit card", icon: CreditCard },
] as const;

function BillCard({ bill, onChanged }: { bill: LiveBill; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const [voiding, setVoiding] = useState(false);
  // what the guest actually paid, when it isn't the bill total (only for a known customer)
  const [received, setReceived] = useState("");
  const typed = received.replace(/[₹,\s]/g, "");
  const receivedPaise = typed === "" ? undefined : Math.round(Number(typed) * 100);
  const badReceived = receivedPaise !== undefined && !(Number.isFinite(receivedPaise) && receivedPaise >= 0);
  const difference = receivedPaise === undefined || badReceived ? 0 : receivedPaise - bill.totalPaise;
  const run = (
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
    after?: () => void,
  ) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        after?.();
        onChanged();
      } else toast.error(res.error);
    });

  return (
    <li
      className={cn(
        "flex flex-col rounded-3xl border-2 bg-card p-4",
        bill.payLaterAt ? "border-hh-orange/40" : "border-hh-green/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-lg font-bold">
            Bill #{bill.number} · {bill.type === "PARCEL" ? "Takeaway" : "Dine-in"}
          </p>
          <p className="text-xs text-muted-foreground">
            {bill.customerName} · orders {bill.orderNumbers.map((n) => `#${n}`).join(", ")}
          </p>
          {bill.payLaterAt && (
            <p className="mt-1 text-xs font-semibold text-brand-text">
              Pay later since{" "}
              {new Date(bill.payLaterAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                timeZone: CAFE_TZ,
              })}
            </p>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/admin/print/bill/${bill.id}`} target="_blank">
            <Printer data-icon="inline-start" /> Print
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-right tabular text-2xl font-bold">{formatINR(toRupees(bill.totalPaise))}</p>
      {bill.customerId && (
        <div className="mt-3">
          <label htmlFor={`received-${bill.id}`} className="text-xs font-semibold text-muted-foreground">
            Received (₹) – only if more or less than the bill
          </label>
          <Input
            id={`received-${bill.id}`}
            inputMode="decimal"
            placeholder={String(toRupees(bill.totalPaise))}
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            aria-invalid={badReceived}
            className="mt-1 h-10"
          />
          {badReceived ? (
            <p className="mt-1 text-xs text-destructive">Type an amount in rupees.</p>
          ) : difference > 0 ? (
            <p className="mt-1 text-xs font-semibold text-hh-green dark:text-hh-green-light">
              {formatINR(toRupees(difference))} extra – kept as the guest&apos;s credit for next time
            </p>
          ) : difference < 0 ? (
            <p className="mt-1 text-xs font-semibold text-brand-text">
              {formatINR(toRupees(-difference))} short – the guest owes this next time
            </p>
          ) : null}
        </div>
      )}
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Paid by</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.id}
            disabled={pending || badReceived}
            className="rounded-full"
            onClick={() =>
              run(
                () => markBillPaid(bill.id, m.id, difference === 0 ? undefined : receivedPaise),
                `Bill #${bill.number} paid by ${m.label}${
                  difference > 0
                    ? ` · ${formatINR(toRupees(difference))} kept as credit`
                    : difference < 0
                      ? ` · ${formatINR(toRupees(-difference))} owed`
                      : ""
                }`,
              )
            }
          >
            <m.icon data-icon="inline-start" /> {m.label}
          </Button>
        ))}
      </div>
      {!bill.payLaterAt && (
        <Button
          variant="outline"
          disabled={pending}
          className="mt-2 rounded-full"
          onClick={() => run(() => markBillPayLater(bill.id), `Bill #${bill.number} completed – pay later`)}
        >
          <Clock data-icon="inline-start" /> Complete · pay later
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="mt-2 self-start rounded-full text-muted-foreground"
        onClick={() => setVoiding(true)}
      >
        <Ban data-icon="inline-start" /> Void bill…
      </Button>
      <VoidDialog bill={voiding ? bill : null} onClose={() => setVoiding(false)} onDone={onChanged} />
    </li>
  );
}

/** One guest's pay-later bills together, oldest first, guests in the order they first appear. */
function groupByGuest(bills: LiveBill[]): LiveBill[][] {
  const groups = new Map<string, LiveBill[]>();
  for (const b of bills) groups.set(b.guestKey, [...(groups.get(b.guestKey) ?? []), b]);
  return [...groups.values()].map((g) =>
    [...g].sort((a, b) => (a.payLaterAt ?? a.createdAt).localeCompare(b.payLaterAt ?? b.createdAt)),
  );
}

const shortWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CAFE_TZ,
  });

/** A guest's pay-later bills on one card: tick the ones they're paying now, then how they paid. */
function PayLaterGuestCard({ bills, onChanged }: { bills: LiveBill[]; onChanged: () => void }) {
  const [pending, start] = useTransition();
  // ticked by default; bills that leave the card (paid, voided) drop out of the choice by themselves
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [voiding, setVoiding] = useState<LiveBill | null>(null);
  const chosen = bills.filter((b) => !unticked.has(b.id));
  const totalPaise = chosen.reduce((s, b) => s + b.totalPaise, 0);
  const several = bills.length > 1;
  const toggle = (id: string, on: boolean) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  const pay = (method: (typeof METHODS)[number]) =>
    start(async () => {
      const names = chosen.map((b) => `#${b.number}`).join(", ");
      const res = await markBillsPaid(
        chosen.map((b) => b.id),
        method.id,
      );
      if (res.ok) {
        toast.success(`Bill${chosen.length > 1 ? "s" : ""} ${names} paid by ${method.label}`);
        setUnticked(new Set());
      } else toast.error(res.error);
      onChanged();
    });

  return (
    <li className="flex flex-col rounded-3xl border-2 border-hh-orange/40 bg-card p-4">
      <p className="text-lg font-bold">{bills[0].customerName}</p>
      <p className="text-xs text-muted-foreground">
        {bills.length} pay-later {bills.length === 1 ? "bill" : "bills"} ·{" "}
        {formatINR(toRupees(bills.reduce((s, b) => s + b.totalPaise, 0)))} in all
      </p>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {bills.map((b) => {
          const on = !unticked.has(b.id);
          return (
            <li key={b.id} className="flex items-center gap-2 px-3 py-2">
              {several && (
                <Checkbox
                  id={`pl-${b.id}`}
                  checked={on}
                  disabled={pending}
                  onCheckedChange={(c) => toggle(b.id, c === true)}
                  aria-label={`Paying bill #${b.number} now`}
                />
              )}
              <label htmlFor={several ? `pl-${b.id}` : undefined} className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">Bill #{b.number}</span>{" "}
                <span className="text-muted-foreground">
                  · {b.type === "PARCEL" ? "Takeaway" : "Dine-in"} · {shortWhen(b.payLaterAt ?? b.createdAt)}
                </span>
              </label>
              <span className="tabular text-sm font-semibold">{formatINR(toRupees(b.totalPaise))}</span>
              <Button asChild size="icon-sm" variant="ghost" aria-label={`Print bill #${b.number}`}>
                <Link href={`/admin/print/bill/${b.id}`} target="_blank">
                  <Printer />
                </Link>
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                aria-label={`Void bill #${b.number}`}
                onClick={() => setVoiding(b)}
              >
                <Ban />
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {several ? `Paying ${chosen.length} of ${bills.length}` : "To pay"}
        </span>
        <span className="tabular text-2xl font-bold">{formatINR(toRupees(totalPaise))}</span>
      </p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Paid by</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.id}
            disabled={pending || chosen.length === 0}
            className="rounded-full"
            onClick={() => pay(m)}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <m.icon data-icon="inline-start" />
            )}{" "}
            {m.label}
          </Button>
        ))}
      </div>
      <VoidDialog bill={voiding} onClose={() => setVoiding(null)} onDone={onChanged} />
    </li>
  );
}

const VOID_REASONS = ["Wrong items on the bill", "Guest is ordering more", "Made by mistake"];

function VoidDialog({
  bill,
  onClose,
  onDone,
}: {
  bill: LiveBill | null;
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
    bill &&
    start(async () => {
      const res = await voidBill(bill.id, reason);
      if (res.ok) {
        toast.success(`Bill #${bill.number} voided – its orders are back in "To bill"`);
        onDone();
        close();
      } else toast.error(res.error);
    });

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogTitle>Void bill #{bill?.number}?</DialogTitle>
        <DialogDescription>
          The bill is kept as void (bill numbers stay in order) and its orders go back to &quot;To bill&quot;.
          Say why – it&apos;s kept in the order history.
        </DialogDescription>
        <div className="flex flex-wrap gap-2">
          {VOID_REASONS.map((r) => (
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
            Keep bill
          </Button>
          <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={submit}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            Void bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
