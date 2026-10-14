"use client";

import { Ban, Banknote, CreditCard, LoaderCircle, Printer, ReceiptText, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateBill, markBillPaid, voidBill } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { LiveBill, LiveOrder } from "@/lib/data/live";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { RECEIPT_SMS_ENABLED } from "@/lib/receipt";
import { ReceiptSmsDialog } from "./receipt-sms";
import { cn } from "@/lib/utils";

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
  onChanged,
}: {
  orders: LiveOrder[];
  bills: LiveBill[];
  onChanged: () => void;
}) {
  const pending = toBill(orders);
  // kept here, not on the bill card: the card disappears once the bill is paid
  const [receipt, setReceipt] = useState<{ id: string; number: number } | null>(null);
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
              <ToBillCard key={b.key} entry={b} onChanged={onChanged} />
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
              <BillCard key={b.id} bill={b} onChanged={onChanged} onPaid={setReceipt} />
            ))}
          </ul>
        </section>
      )}
      {RECEIPT_SMS_ENABLED && <ReceiptSmsDialog bill={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

function ToBillCard({ entry, onChanged }: { entry: ToBill; onChanged: () => void }) {
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
    </li>
  );
}

const METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "Google Pay", icon: Smartphone },
  { id: "CREDIT_CARD", label: "Credit card", icon: CreditCard },
  { id: "DEBIT_CARD", label: "Debit card", icon: CreditCard },
] as const;

function BillCard({
  bill,
  onChanged,
  onPaid,
}: {
  bill: LiveBill;
  onChanged: () => void;
  onPaid: (bill: { id: string; number: number }) => void;
}) {
  const [pending, start] = useTransition();
  const [voiding, setVoiding] = useState(false);
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
    <li className="flex flex-col rounded-3xl border-2 border-hh-green/40 bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-lg font-bold">
            Bill #{bill.number} · {bill.type === "PARCEL" ? "Takeaway" : "Dine-in"}
          </p>
          <p className="text-xs text-muted-foreground">
            {bill.customerName} · orders {bill.orderNumbers.map((n) => `#${n}`).join(", ")}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/admin/print/bill/${bill.id}`} target="_blank">
            <Printer data-icon="inline-start" /> Print
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-right tabular text-2xl font-bold">{formatINR(toRupees(bill.totalPaise))}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Paid by</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.id}
            disabled={pending}
            className="rounded-full"
            onClick={() =>
              run(
                () => markBillPaid(bill.id, m.id),
                `Bill #${bill.number} paid by ${m.label}`,
                RECEIPT_SMS_ENABLED ? () => onPaid({ id: bill.id, number: bill.number }) : undefined,
              )
            }
          >
            <m.icon data-icon="inline-start" /> {m.label}
          </Button>
        ))}
      </div>
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
