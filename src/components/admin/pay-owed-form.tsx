"use client";

import { LoaderCircle, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { payOwed } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { allocatePayment, type Debt } from "@/lib/customer-balance";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAY_CHOICES, PAYMENT_LABEL, type PayChoice } from "@/lib/payments";
import { cn } from "@/lib/utils";

const rupees = (paise: number) => formatINR(toRupees(paise));

/**
 * Customer page: what the guest owes, bill by bill (oldest first), and one payment that goes on the
 * oldest bills first – shown live as the amount is typed.
 */
export function PayOwedForm({
  customerId,
  debts,
}: {
  customerId: string;
  debts: (Omit<Debt, "at"> & { at: string; payLater: boolean })[];
}) {
  const owed = debts.reduce((n, d) => n + d.paise, 0);
  const [amount, setAmount] = useState(String(toRupees(owed)));
  const [method, setMethod] = useState<PayChoice>("CASH");
  const [pending, start] = useTransition();
  const router = useRouter();

  const typed = amount.replace(/[₹,\s]/g, "");
  const paise = typed === "" ? 0 : Math.round(Number(typed) * 100);
  const bad = !Number.isFinite(paise) || paise <= 0 || paise > owed;
  const plan = new Map(
    allocatePayment(
      debts.map((d) => ({ ...d, at: new Date(d.at) })),
      bad ? 0 : paise,
    ).map((a) => [a.debt.billId, a.pay]),
  );

  const take = () =>
    start(async () => {
      const res = await payOwed(customerId, paise, method);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const parts = [
        res.paid.length && `${res.paid.map((n) => `#${n}`).join(", ")} paid`,
        res.part && `#${res.part.number} part paid – ${rupees(res.part.left)} still to pay`,
      ].filter(Boolean);
      toast.success(`${rupees(paise)} taken · ${parts.join(" · ")}`);
      router.refresh();
    });

  return (
    <div className="w-full space-y-3">
      <ul className="divide-y divide-hh-orange/20 rounded-2xl bg-background/60 text-sm">
        {debts.map((d) => {
          const pay = plan.get(d.billId) ?? 0;
          return (
            <li
              key={`${d.kind}-${d.billId}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
            >
              <span className="font-semibold">Bill #{d.number}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(d.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                {d.kind === "short" ? "rest of a short payment" : d.payLater ? "pay later" : "not paid"}
              </span>
              <span className="ml-auto tabular font-semibold">{rupees(d.paise)}</span>
              {/* what this payment does to the bill, in words */}
              <span
                className={cn(
                  "w-full text-right text-xs font-semibold sm:w-36",
                  pay === 0
                    ? "text-muted-foreground"
                    : pay === d.paise
                      ? "text-hh-green dark:text-hh-green-light"
                      : "text-brand-text",
                )}
              >
                {pay === 0
                  ? "stays owed"
                  : pay === d.paise
                    ? "paid in full"
                    : `${rupees(pay)} paid, ${rupees(d.paise - pay)} left`}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          They paid (₹)
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="h-10 w-32 text-foreground"
            aria-invalid={bad}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Paid with
          <NativeSelect
            value={method}
            onChange={(e) => setMethod(e.target.value as PayChoice)}
            className="h-10 text-foreground"
          >
            {PAY_CHOICES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button
          type="button"
          onClick={take}
          disabled={bad || pending}
          className="h-10 rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Wallet data-icon="inline-start" />
          )}
          Take payment
        </Button>
        <p className="text-xs text-muted-foreground">
          {paise > owed
            ? `They owe ${rupees(owed)} on their bills – that's the most.`
            : "Goes on the oldest bills first."}
        </p>
      </div>
    </div>
  );
}
