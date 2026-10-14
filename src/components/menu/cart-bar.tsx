"use client";

import { ArrowLeft, ChefHat, CircleCheck, ClipboardList, LoaderCircle, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createCounterOrder } from "@/app/admin/(dashboard)/actions";
import { type GuestOrder, getGuestOrders, placeOrder, syncSelection } from "@/app/selection-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { itemCount, lineKey, type OrderKind, useCartStore } from "@/lib/cart-store";
import type { AddOn, MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { ListLine } from "./list-line";
import { guestStatusLabel, isActive, OrderTracker } from "./order-tracker";

type Sync = "idle" | "saving" | "saved" | "error";

const KIND_LABEL: Record<OrderKind, string> = { DINE_IN: "Dine-in", PARCEL: "Takeaway" };

/**
 * The guest's list. Staff see it live while the guest picks; the guest chooses dine-in or
 * takeaway, adds their name and number, and places the order. Staff accept it. No totals here.
 *
 * `counter` = staff taking an order at the counter with the same menu: nothing is mirrored or
 * tracked, the guest's phone is optional, and the order is created already accepted.
 */
export function CartBar({
  items,
  addOns,
  counter = false,
}: {
  /** menu items and add-ons, so guests can change add-ons from the list */
  items: MenuItem[];
  addOns: AddOn[];
  counter?: boolean;
}) {
  const useCart = useCartStore();
  const router = useRouter();
  const { clientId, lines, kind, guest, orders, showConfirmed } = useCart();
  const { setQuantity, setAddOns, setKind, orderPlaced, dismissConfirmed, clear } = useCart.getState();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"list" | "details">("list");
  const [sync, setSync] = useState<Sync>("idle");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [guestOrders, setGuestOrders] = useState<GuestOrder[]>([]);
  const count = itemCount(lines);
  const addOnsFor = useCallback(
    (itemId: string) => {
      const ids = items.find((i) => i.id === itemId)?.addOnIds ?? [];
      return addOns.filter((a) => ids.includes(a.id));
    },
    [items, addOns],
  );
  const latest = orders[0];
  const orderIds = orders.map((o) => o.id).join(",");

  const loadOrders = useCallback(async (ids: string) => {
    setGuestOrders(ids ? await getGuestOrders(ids.split(",")) : []);
  }, []);

  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => setHydrated(true));
  }, [useCart]);

  // Mirror the list to the dashboard shortly after every change.
  const shared = useRef(false);
  useEffect(() => {
    if (!hydrated || counter) return;
    if (count === 0 && !shared.current) return; // nothing shared yet, nothing to remove
    const timer = setTimeout(async () => {
      setSync("saving");
      try {
        const res = await syncSelection({
          clientId,
          takeaway: kind === "PARCEL",
          items: lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOnIds, quantity: l.quantity })),
        });
        shared.current = count > 0;
        if (res.ok) setSync("saved");
        else {
          setSync("error");
          toast.error(res.error);
        }
      } catch {
        setSync("error");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, counter, lines, kind, clientId, count]);

  // Live: every status change of this guest's orders (also catches up after being offline –
  // the stream sends the current state on connect), and orders placed from another tab.
  useEffect(() => {
    if (!hydrated || counter) return;
    const source = new EventSource(`/api/guest/stream?cid=${clientId}&orders=${orderIds}`);
    source.addEventListener("confirmed", (e) => {
      const { orderId, number } = JSON.parse((e as MessageEvent).data) as { orderId: string; number: number };
      if (useCart.getState().orders.some((o) => o.id === orderId)) return;
      orderPlaced({ id: orderId, number });
      shared.current = false;
    });
    source.addEventListener("order", () => void loadOrders(orderIds));
    source.onopen = () => void loadOrders(orderIds);
    // safety net in case live updates stop (the dashboard does the same)
    const poll = orderIds ? setInterval(() => void loadOrders(orderIds), 30_000) : undefined;
    return () => {
      clearInterval(poll);
      source.close();
    };
  }, [hydrated, counter, useCart, clientId, orderIds, orderPlaced, loadOrders]);

  const active = guestOrders.filter(isActive);
  // with an empty list, the bar and sheet show the guest's orders instead
  const tracking =
    !counter && count === 0 && (active.length > 0 || (showConfirmed && guestOrders.length > 0));
  const headline = active[0] ?? guestOrders[0];

  const openSheet = () => {
    setStep("list");
    setOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {hydrated && (count > 0 || tracking) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={openSheet}
              className="mx-auto flex h-16 w-full max-w-xl items-center gap-3 rounded-full bg-hh-green-deep pr-2 pl-5 text-left text-white shadow-[0_20px_40px_-12px_rgba(14,85,24,0.6)] ring-1 ring-white/10"
            >
              {count > 0 ? (
                <motion.span
                  key={count}
                  initial={{ scale: 1.35 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <ClipboardList className="size-6" aria-hidden />
                  <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-hh-orange tabular text-[11px] font-bold text-hh-ink">
                    {count}
                  </span>
                </motion.span>
              ) : headline?.status === "PREPARING" ? (
                <ChefHat className="size-6" aria-hidden />
              ) : (
                <CircleCheck className="size-6" aria-hidden />
              )}
              <span className="flex-1">
                <span className="block text-base leading-tight font-semibold">
                  {count === 0
                    ? `Order #${headline?.number ?? latest?.number} · ${headline ? guestStatusLabel(headline) : "Placed"}`
                    : counter
                      ? "Counter order"
                      : "Your list"}
                </span>
                <span className="block text-xs text-white/80">
                  {count === 0
                    ? "Tap to follow your order · add more any time"
                    : `${count} item${count === 1 ? "" : "s"} · ${KIND_LABEL[kind]}`}
                </span>
              </span>
              {count > 0 && (
                <span className="rounded-full bg-cta px-5 py-3 text-sm font-bold text-cta-foreground">
                  View list
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88svh] max-w-xl gap-0 overflow-y-auto rounded-t-[2rem] border-x p-0 sm:bottom-4 sm:rounded-[2rem] sm:border"
        >
          {tracking ? (
            <div className="px-5 pt-6 pb-6">
              <SheetTitle className="font-heading text-2xl font-bold">Your orders</SheetTitle>
              <SheetDescription className="mb-4">
                Updates here as the kitchen works. Pay at the counter when you&apos;re done.
              </SheetDescription>
              <OrderTracker orders={guestOrders} />
              <Button
                className="mt-5 h-11 w-full rounded-full"
                onClick={() => {
                  dismissConfirmed();
                  setOpen(false);
                }}
              >
                Add more items
              </Button>
            </div>
          ) : step === "details" ? (
            <DetailsStep
              clientId={clientId}
              kind={kind}
              count={count}
              counter={counter}
              initial={counter ? null : guest}
              lines={lines}
              onBack={() => setStep("list")}
              onPlaced={(order, details) => {
                if (counter) {
                  // back to Live orders, where the new order is waiting to go to the kitchen
                  clear();
                  setOpen(false);
                  toast.success(`Counter order #${order.number} – send it to the kitchen when ready`);
                  router.push("/admin");
                  return;
                }
                orderPlaced(order, details);
                shared.current = false;
                setStep("list");
                void loadOrders([order.id, ...orders.map((o) => o.id)].slice(0, 10).join(","));
                toast.success(`Order #${order.number} placed`);
              }}
            />
          ) : (
            <>
              <div className="px-5 pt-6 pb-2">
                <SheetTitle className="font-heading text-2xl font-bold">
                  {counter ? "Counter order" : "Your list"}
                </SheetTitle>
                <SheetDescription>
                  {counter
                    ? "Dine-in or takeaway? Check the items with the guest, then add their name."
                    : "Dine-in or takeaway? Check your items, then add your name and number to order."}
                </SheetDescription>
              </div>

              <div className="px-5 py-3">
                <KindPicker kind={kind} onChange={setKind} />
              </div>

              <ul className="divide-y divide-border px-5">
                {lines.map((l) => (
                  <ListLine
                    key={l.key}
                    line={l}
                    options={addOnsFor(l.itemId)}
                    open={expanded === l.key}
                    onToggle={() => setExpanded((k) => (k === l.key ? null : l.key))}
                    onQuantity={(q) => setQuantity(l.key, q)}
                    onAddOns={(ids, names) => {
                      setAddOns(l.key, ids, names);
                      setExpanded(lineKey(l.itemId, ids)); // follow the line to its new key
                    }}
                  />
                ))}
              </ul>

              {active.length > 0 && (
                <div className="px-5 pt-5">
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">Already ordered</p>
                  <OrderTracker orders={active} />
                </div>
              )}

              <div className="sticky bottom-0 mt-2 space-y-2 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
                <SyncLine sync={sync} />
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="rounded-full text-muted-foreground"
                    onClick={() => {
                      clear();
                      setOpen(false);
                    }}
                  >
                    Clear list
                  </Button>
                  <Button
                    className="ml-auto h-12 flex-1 rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
                    disabled={count === 0}
                    onClick={() => setStep("details")}
                  >
                    {counter ? "Next – guest's details" : "Next – your details"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetailsStep({
  clientId,
  kind,
  count,
  counter,
  initial,
  lines,
  onBack,
  onPlaced,
}: {
  clientId: string;
  kind: OrderKind;
  count: number;
  /** staff entering a walk-in guest's order: phone optional, no offers question */
  counter: boolean;
  initial: { name: string; phone: string } | null;
  lines: { itemId: string; addOnIds: string[]; quantity: number }[];
  onBack: () => void;
  onPlaced: (order: { id: string; number: number }, guest: { name: string; phone: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const phoneOk = counter && phone === "" ? true : INDIAN_MOBILE.test(phone);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const items = lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOnIds, quantity: l.quantity }));
        const takeaway = kind === "PARCEL";
        if (counter) {
          const res = await createCounterOrder({
            takeaway,
            name,
            phone,
            note: note.trim() || undefined,
            items,
          });
          if (res.ok) onPlaced({ id: "", number: res.number }, { name: name.trim(), phone });
          else setError({ message: res.error, problems: res.problems });
          return;
        }
        const res = await placeOrder({
          clientId,
          takeaway,
          name,
          phone,
          note: note.trim() || undefined,
          marketingConsent: consent,
          items,
        });
        if (res.ok) onPlaced({ id: res.id, number: res.number }, { name: name.trim(), phone });
        else setError({ message: res.error, problems: res.problems });
      } catch {
        setError({ message: "Couldn't reach the café. Check your internet and try again." });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 px-5 pt-6 pb-6">
      <div className="flex items-start gap-2">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Back to the list" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div>
          <SheetTitle className="font-heading text-2xl font-bold">
            {counter ? "Guest's details" : "Your details"}
          </SheetTitle>
          <SheetDescription>
            {KIND_LABEL[kind]} · {count} item{count === 1 ? "" : "s"}.{" "}
            {counter
              ? "The name is called out when the order is ready. The mobile number is optional."
              : "We use these to manage your order and call you when it's ready."}
          </SheetDescription>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="g-name">{counter ? "Guest's name" : "Your name"}</Label>
        <Input
          id="g-name"
          autoComplete={counter ? "off" : "name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-phone">{counter ? "Mobile number (optional)" : "Mobile number"}</Label>
        <Input
          id="g-phone"
          type="tel"
          inputMode="numeric"
          autoComplete={counter ? "off" : "tel-national"}
          maxLength={10}
          placeholder="10-digit mobile"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          aria-invalid={phone.length === 10 && !phoneOk}
          required={!counter}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-note">Note to the kitchen (optional)</Label>
        <Textarea
          id="g-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Less spicy, no onion…"
        />
      </div>
      {!counter && (
        <>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
            <span>Send me offers on WhatsApp / SMS (optional)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            See our{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacy note
            </Link>{" "}
            for how we use your details.
          </p>
        </>
      )}

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

      <Button
        type="submit"
        disabled={pending || !phoneOk || name.trim().length < 2}
        className="h-12 w-full rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        {counter ? "Create order" : "Place order"}
      </Button>
    </form>
  );
}

function SyncLine({ sync }: { sync: Sync }) {
  if (sync === "error")
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
        <TriangleAlert className="size-3.5" aria-hidden /> Couldn&apos;t reach the café. Check your internet.
      </p>
    );
  if (sync === "saving")
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Updating…
      </p>
    );
  return null;
}

function KindPicker({ kind, onChange }: { kind: OrderKind; onChange: (kind: OrderKind) => void }) {
  return (
    <div className="inline-flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Dine-in or takeaway">
      {(["DINE_IN", "PARCEL"] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={kind === k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            kind === k ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}
