"use client";

import { Banknote, CreditCard, LoaderCircle, Smartphone, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markBillPaid } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";

const METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "Google Pay", icon: Smartphone },
  { id: "CREDIT_CARD", label: "Credit card", icon: CreditCard },
  { id: "DEBIT_CARD", label: "Debit card", icon: CreditCard },
] as const;

/** Order history: the guest paid a "pay later" (or unpaid) bill – record how. */
export function RecordPaymentButton({ bill }: { bill: { id: string; number: number; totalPaise: number } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const pay = (method: (typeof METHODS)[number]) =>
    start(async () => {
      const res = await markBillPaid(bill.id, method.id);
      if (res.ok) {
        toast.success(`Bill #${bill.number} paid by ${method.label}`);
        setOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <>
      <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        <Wallet data-icon="inline-start" /> Record payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-xl">
            Bill #{bill.number} · {formatINR(toRupees(bill.totalPaise))}
          </DialogTitle>
          <DialogDescription>How did the guest pay? It counts as a sale today.</DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <Button key={m.id} disabled={pending} className="rounded-full" onClick={() => pay(m)}>
                {pending ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <m.icon data-icon="inline-start" />
                )}
                {m.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
