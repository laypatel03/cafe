"use client";

import { CircleCheck, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { addBalanceEntry, deleteBalanceEntry } from "@/app/admin/(dashboard)/customers/balance-actions";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/hooks/use-form-action";
import { BALANCE_KIND_LABEL, MANUAL_KINDS } from "@/lib/customer-balance";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAY_CHOICES, PAYMENT_LABEL } from "@/lib/payments";

const HINT: Record<(typeof MANUAL_KINDS)[number], string> = {
  PAID_EXTRA: "Adds to their credit – e.g. an advance",
  PAID_LESS: "They owe this – no money changed hands, so sales don't change",
  PAID_BACK: "They paid back money owed on their balance (unpaid bills: use Take payment at the top)",
  RETURNED: "You gave their extra back",
};

/** Owner: record money handed over or given back outside a bill. */
export function BalanceEntryForm({ customerId }: { customerId: string }) {
  const [state, onSubmit, pending] = useFormAction(addBalanceEntry, undefined);
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState("");
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) {
      setFormKey((k) => k + 1);
      setKind("");
    }
  }
  useEffect(() => {
    if (state?.ok) toast.success("Balance updated");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  const err = state?.fieldErrors ?? {};

  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="customerId" value={customerId} />
      <FormField
        id="bal-kind"
        label="What happened"
        hint={kind ? HINT[kind as keyof typeof HINT] : undefined}
        error={err.kind}
      >
        <NativeSelect
          id="bal-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-10"
          required
        >
          <option value="" disabled>
            Choose…
          </option>
          {MANUAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {BALANCE_KIND_LABEL[k]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="bal-amount" label="Amount (₹)" error={err.amount}>
        <Input id="bal-amount" name="amount" inputMode="decimal" className="h-10" required />
      </FormField>
      {kind !== "PAID_LESS" && (
        <FormField id="bal-method" label="Cash, card or UPI" error={err.method}>
          <NativeSelect id="bal-method" name="method" defaultValue="CASH" className="h-10" required>
            {PAY_CHOICES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}
      <FormField id="bal-note" label="Note (optional)" error={err.note}>
        <Input id="bal-note" name="note" maxLength={200} className="h-10" />
      </FormField>
      <div className="sm:col-span-4">
        <Button type="submit" variant="outline" disabled={pending} className="h-10">
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          Add to balance
        </Button>
      </div>
    </form>
  );
}

/**
 * Owner: clear the whole balance in one go – "Mark as paid" when the guest owes, "Give back"
 * when they have credit. Records a "paid back" / "extra given back" entry for the full amount.
 */
export function ClearBalanceButton({ customerId, balance }: { customerId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(addBalanceEntry, undefined);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setOpen(false);
  }
  useEffect(() => {
    if (state?.ok) toast.success("Balance cleared – the money is in today's sales");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  if (balance === 0) return null;
  const owes = balance < 0;
  const amount = formatINR(toRupees(Math.abs(balance)));

  return (
    <>
      <Button
        className={
          owes ? "rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light" : "rounded-full"
        }
        variant={owes ? "default" : "outline"}
        onClick={() => setOpen(true)}
      >
        <CircleCheck data-icon="inline-start" />
        {owes ? `Mark ${amount} as paid` : `Give back ${amount}`}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{owes ? `Guest paid ${amount}` : `Give back ${amount}`}</DialogTitle>
          <DialogDescription>
            {owes
              ? "The balance goes to ₹0 and the money counts in today's sales (and the cash drawer, if cash)."
              : "The balance goes to ₹0 and the money comes off today's sales (and the cash drawer, if cash)."}
          </DialogDescription>
          <form onSubmit={onSubmit} className="grid gap-3">
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="kind" value={owes ? "PAID_BACK" : "RETURNED"} />
            <input type="hidden" name="amount" value={String(toRupees(Math.abs(balance)))} />
            <FormField
              id="clear-method"
              label={owes ? "Paid with" : "Given back as"}
              error={state?.fieldErrors?.method}
            >
              <NativeSelect id="clear-method" name="method" defaultValue="CASH" className="h-10" required>
                {PAY_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABEL[m]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                {owes ? "Mark as paid" : "Given back"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Owner: delete a hand entry made by mistake – it stays on the page in red and stops counting. */
export function DeleteBalanceButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const remove = () =>
    start(async () => {
      const res = await deleteBalanceEntry(id);
      if (res.ok) {
        toast.success("Entry deleted – it no longer counts");
        setOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="ml-1 size-7 align-middle text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${label}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>
            It stays in the list in red but no longer counts in the balance, and its money is taken out of the
            money book and cash drawer.
          </DialogDescription>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              {pending && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
