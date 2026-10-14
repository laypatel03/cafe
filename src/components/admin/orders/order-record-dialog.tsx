"use client";

import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addPastOrder, editOrder } from "@/app/admin/(dashboard)/orders/actions";
import { type EditableLine, ItemLinesEditor, toEditableLines } from "@/components/admin/item-lines-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { PublicMenu } from "@/lib/data/menu";
import { toCafeInput } from "@/lib/order-edit";
import { PAY_CHOICES, PAYMENT_LABEL, type PayChoice } from "@/lib/payments";

/** An order as the edit form needs it (dates already in café time). */
export type EditableOrder = {
  id: string;
  number: number;
  when: string;
  takeaway: boolean;
  name: string;
  phone: string;
  note: string;
  items: { itemId: string | null; name: string; quantity: number; addOns: { id: string; name: string }[] }[];
  /** set when the order's bill is paid */
  paidBy: PayChoice | "CARD" | null;
  billNumber: number | null;
  /** other orders on the same bill */
  sharedBill: boolean;
};

/** "Add order" on Order history: an order that already happened and was paid. */
export function AddOrderButton({ menu }: { menu: PublicMenu }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="rounded-full" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" /> Add order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {open && <OrderForm menu={menu} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "Edit" on an order in Order history. */
export function EditOrderButton({ menu, order }: { menu: PublicMenu; order: EditableOrder }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <Pencil data-icon="inline-start" /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {open && <OrderForm menu={menu} order={order} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderForm({
  menu,
  order,
  onClose,
}: {
  menu: PublicMenu;
  order?: EditableOrder;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<EditableLine[]>(() => (order ? toEditableLines(order.items) : []));
  const [when, setWhen] = useState(order?.when ?? toCafeInput(new Date()));
  const [takeaway, setTakeaway] = useState(order?.takeaway ?? false);
  const [name, setName] = useState(order?.name ?? "");
  const [phone, setPhone] = useState(order?.phone ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  // "" keeps an old "card" bill as it is
  const [method, setMethod] = useState<PayChoice | "">(
    order?.paidBy && order.paidBy !== "CARD" ? order.paidBy : "",
  );
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const dropped = order ? order.items.length - toEditableLines(order.items).length : 0;
  const showPayment = !order || !!order.paidBy;
  const now = toCafeInput(new Date());

  const save = () =>
    start(async () => {
      setError(null);
      const common = {
        when,
        takeaway,
        name,
        phone,
        note,
        items: lines.map((l) => ({
          itemId: l.itemId,
          addOnIds: l.addOns.map((a) => a.id),
          quantity: l.quantity,
        })),
      };
      const res = order
        ? await editOrder({ ...common, orderId: order.id, method: method || undefined })
        : method
          ? await addPastOrder({ ...common, method })
          : ({ ok: false, error: "Pick how the guest paid" } as const);
      if (res.ok) {
        toast.success(
          order ? `Order #${order.number} saved` : `Order #${"number" in res ? res.number : ""} added`,
        );
        onClose();
        router.refresh();
      } else setError({ message: res.error, problems: "problems" in res ? res.problems : undefined });
    });

  return (
    <div className="space-y-4">
      <div>
        <DialogTitle className="text-xl">
          {order ? `Edit order #${order.number}` : "Add an order"}
        </DialogTitle>
        <DialogDescription>
          {order
            ? "Fix anything that was entered wrong. Items already on the order keep the price the guest paid."
            : "For an order that already happened and was paid. It goes in as served and paid, with its bill."}
        </DialogDescription>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="oe-when">Date and time</Label>
          <Input
            id="oe-when"
            type="datetime-local"
            value={when}
            max={now}
            onChange={(e) => setWhen(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oe-type">Type</Label>
          <NativeSelect
            id="oe-type"
            value={takeaway ? "PARCEL" : "DINE_IN"}
            onChange={(e) => setTakeaway(e.target.value === "PARCEL")}
            disabled={order?.sharedBill}
            className="h-10"
          >
            <option value="DINE_IN">Dine-in</option>
            <option value="PARCEL">Takeaway</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oe-name">Guest name</Label>
          <Input
            id="oe-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Walk-in"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oe-phone">Phone (optional)</Label>
          <Input
            id="oe-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            maxLength={14}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
            className="h-10"
          />
        </div>
        {showPayment && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oe-method">
              Paid by{order?.billNumber ? ` (bill #${order.billNumber})` : ""}
            </Label>
            <NativeSelect
              id="oe-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PayChoice | "")}
              className="h-10"
            >
              {!order && <option value="">Choose…</option>}
              {order?.paidBy === "CARD" && <option value="">Card</option>}
              {PAY_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABEL[m]}
                </option>
              ))}
            </NativeSelect>
            {order?.sharedBill && (
              <p className="text-xs text-muted-foreground">
                This bill has other orders on it too – the payment and total apply to the whole bill.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Items</p>
        {dropped > 0 && (
          <p className="rounded-xl bg-accent px-3 py-2 text-sm">
            {dropped} item{dropped > 1 ? "s are" : " is"} no longer on the menu and will be dropped when you
            save.
          </p>
        )}
        <ItemLinesEditor lines={lines} onChange={setLines} menu={menu} allowSoldOut />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oe-note">Note (optional)</Label>
        <Input
          id="oe-note"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          className="h-10"
        />
      </div>

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
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || lines.length === 0}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {order ? "Save changes" : "Add order"}
        </Button>
      </DialogFooter>
    </div>
  );
}
