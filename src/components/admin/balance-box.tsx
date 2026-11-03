"use client";

import { LoaderCircle, Undo2, Wallet } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { settleBalance, undoBalanceSettle } from "@/app/admin/(dashboard)/customers/balance-actions";
import { Button } from "@/components/ui/button";
import { settleLine } from "@/lib/customer-balance";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";

const rupees = (paise: number) => formatINR(toRupees(Math.abs(paise)));

/** On a "To bill" card: the guest's credit or what they owe from earlier, and "Use on this bill". */
export function BalanceBox({
  balance,
  orderIds,
  ordersTotalPaise,
  used,
  onChanged,
}: {
  /** plus = credit, minus = owed; 0 or undefined = nothing */
  balance: number | undefined;
  orderIds: string[];
  ordersTotalPaise: number;
  /** these orders already have the balance line */
  used: boolean;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  if (!balance && !used) return null;
  const line = balance ? settleLine(balance, ordersTotalPaise) : 0;

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/50 p-3 text-sm">
      {balance ? (
        <p>
          <Wallet className="mr-1 inline size-4 text-muted-foreground" aria-hidden />
          {balance > 0 ? (
            <>
              <span className="font-semibold text-hh-green dark:text-hh-green-light">
                Credit {rupees(balance)}
              </span>{" "}
              · paid extra on an earlier visit
            </>
          ) : (
            <>
              <span className="font-semibold text-brand-text">Owes {rupees(balance)}</span> · paid less on an
              earlier visit
            </>
          )}
        </p>
      ) : (
        <p>
          <Wallet className="mr-1 inline size-4 text-muted-foreground" aria-hidden />
          The guest&apos;s balance is on this bill.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {balance && line !== 0 && !used ? (
          <Button
            size="sm"
            className="rounded-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await settleBalance(orderIds);
                if (!res.ok) return void toast.error(res.error);
                toast.success(
                  res.linePaise < 0
                    ? `${rupees(res.linePaise)} credit taken off the bill`
                    : `${rupees(res.linePaise)} owed added to the bill`,
                );
                onChanged();
              })
            }
          >
            {pending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : (
              <Wallet data-icon="inline-start" />
            )}
            {line < 0 ? `Use ${rupees(line)} credit on this bill` : `Add ${rupees(line)} owed to this bill`}
          </Button>
        ) : null}
        {used && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await undoBalanceSettle(orderIds);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Balance taken off the bill");
                onChanged();
              })
            }
          >
            <Undo2 data-icon="inline-start" /> Undo balance
          </Button>
        )}
      </div>
    </div>
  );
}
