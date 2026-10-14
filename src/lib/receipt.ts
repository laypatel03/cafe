import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAYMENT_SHORT } from "@/lib/payments";

// The receipt text a guest gets by SMS once their bill is paid. Staff send it from the
// counter phone's own messages app (an sms: link), so it costs nothing. Pure, so it's unit-tested.

/**
 * Switched off for now (owner, 8 Oct 2026) – texting receipts comes later. Set to `true` to show
 * the "Text the receipt" box after payment and the "Text receipt" button in order history.
 */
export const RECEIPT_SMS_ENABLED = false;

export function receiptMessage(bill: {
  cafeName: string;
  number: number;
  totalPaise: number;
  paymentMethod: keyof typeof PAYMENT_SHORT | null;
}) {
  const paid = bill.paymentMethod ? ` paid by ${PAYMENT_SHORT[bill.paymentMethod]}` : " paid";
  return `Thank you for visiting ${bill.cafeName}! Bill #${bill.number} – ${formatINR(toRupees(bill.totalPaise))}${paid}. See you again soon.`;
}

/**
 * Opens the phone's messages app with the number and text filled in. `?&body=` works on
 * both Android and iPhone.
 */
export const smsLink = (phone: string, text: string) => `sms:+91${phone}?&body=${encodeURIComponent(text)}`;
