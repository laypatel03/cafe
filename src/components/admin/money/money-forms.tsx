"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addExtraSale, deleteExtraSale, saveCardFees } from "@/app/admin/(dashboard)/money/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/hooks/use-form-action";
import { PAY_CHOICES, PAYMENT_LABEL } from "@/lib/payments";

function useToast(state: { ok?: boolean; error?: string } | undefined, success: string, onOk?: () => void) {
  useEffect(() => {
    if (state?.ok) {
      toast.success(success);
      onOk?.();
    } else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

/** A sale that didn't go through a bill, e.g. written on paper while the system was down. */
export function ExtraSaleForm({ today, defaultDay }: { today: string; defaultDay: string }) {
  const [state, onSubmit, pending] = useFormAction(addExtraSale, undefined);
  const [formKey, setFormKey] = useState(0);
  const err = state?.fieldErrors ?? {};
  useToast(state, "Sale added", () => setFormKey((k) => k + 1));
  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[9rem_1fr_8rem]">
      <FormField id="xs-day" label="Date" error={err.day}>
        <Input
          id="xs-day"
          name="day"
          type="date"
          max={today}
          defaultValue={defaultDay}
          className="h-10"
          required
        />
      </FormField>
      <FormField id="xs-method" label="Paid by" error={err.method}>
        <NativeSelect id="xs-method" name="method" defaultValue="CASH" className="h-10">
          {PAY_CHOICES.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABEL[m]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="xs-amount" label="Amount (₹)" error={err.amount}>
        <Input
          id="xs-amount"
          name="amount"
          inputMode="decimal"
          className="h-10"
          required
          aria-invalid={!!err.amount}
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id="xs-note" label="Note (optional)" error={err.note}>
          <Input
            id="xs-note"
            name="note"
            maxLength={120}
            placeholder="e.g. counter sales written on paper"
            className="h-10"
          />
        </FormField>
      </div>
      <Button type="submit" disabled={pending} className="h-10 self-end rounded-full">
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Add sale
      </Button>
    </form>
  );
}

export function DeleteExtraSaleButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmButton
      size="icon-sm"
      variant="ghost"
      aria-label={`Delete ${label}`}
      title={`Delete ${label}?`}
      description="It's taken out of the money book. A cash sale also comes off that day's drawer, unless the day is already closed."
      onConfirm={() => deleteExtraSale(id)}
      onDone={() => toast.success("Sale deleted")}
    >
      <Trash2 />
    </ConfirmButton>
  );
}

const pct = (bps: number) => (bps === 0 ? "" : String(bps / 100));

/** What the card machine provider keeps on each card payment. */
export function CardFeesForm({ creditBps, debitBps }: { creditBps: number; debitBps: number }) {
  const [state, onSubmit, pending] = useFormAction(saveCardFees, undefined);
  const err = state?.fieldErrors ?? {};
  useToast(state, "Card fees saved");
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="w-36">
        <FormField id="fee-credit" label="Credit card fee (%)" error={err.credit}>
          <Input
            id="fee-credit"
            name="credit"
            inputMode="decimal"
            defaultValue={pct(creditBps)}
            placeholder="e.g. 1.8"
            className="h-10"
            aria-invalid={!!err.credit}
          />
        </FormField>
      </div>
      <div className="w-36">
        <FormField id="fee-debit" label="Debit card fee (%)" error={err.debit}>
          <Input
            id="fee-debit"
            name="debit"
            inputMode="decimal"
            defaultValue={pct(debitBps)}
            placeholder="e.g. 0.4"
            className="h-10"
            aria-invalid={!!err.debit}
          />
        </FormField>
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="h-10 rounded-full">
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Save fees
      </Button>
    </form>
  );
}
