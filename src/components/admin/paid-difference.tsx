import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

const rupees = (paise: number) => formatINR(toRupees(paise));

/**
 * Under an order's amount, when its bill was paid more or less than the total: what actually came in,
 * and what's still owed (`duePaise`, from `shortBillsDue`) or kept as credit. Nothing for an exact payment.
 */
export function PaidDifference({
  bill,
  duePaise,
  className,
}: {
  bill: {
    totalPaise: number;
    differencePaise: number;
    paidAt: Date | null;
    voidedAt: Date | null;
    orders: number;
  };
  /** still owed on this bill; 0 or missing = the shortfall has been paid since */
  duePaise?: number;
  className?: string;
}) {
  if (!bill.paidAt || bill.voidedAt || bill.differencePaise === 0) return null;
  const short = bill.differencePaise < 0;
  const owed = short && (duePaise ?? 0) > 0;
  return (
    <p
      className={cn(
        "text-sm font-semibold",
        owed ? "text-brand-text" : "text-hh-green dark:text-hh-green-light",
        className,
      )}
    >
      {bill.orders > 1 ? "Bill paid" : "Paid"}{" "}
      <span className="tabular">{rupees(bill.totalPaise + bill.differencePaise)}</span>
      {bill.orders > 1 && <span className="tabular"> of {rupees(bill.totalPaise)}</span>}
      <span className="block text-xs">
        {!short
          ? `${rupees(bill.differencePaise)} extra as credit`
          : owed
            ? `${rupees(duePaise!)} still to pay`
            : "the rest paid since"}
      </span>
    </p>
  );
}
