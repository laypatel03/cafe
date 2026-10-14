import type { PaymentMethod } from "@/generated/prisma/enums";

// How guests pay. Names people see (the database keeps the codes). Pure, so it's shared with the browser.

/** Choices offered when taking payment or adding a sale. `CARD` is only on old bills. */
export const PAY_CHOICES = ["CASH", "UPI", "CREDIT_CARD", "DEBIT_CARD"] as const;
export type PayChoice = (typeof PAY_CHOICES)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "Google Pay / UPI",
  CREDIT_CARD: "Credit card",
  DEBIT_CARD: "Debit card",
  CARD: "Card",
};

/** Short form for receipts and status notes ("paid by …"). */
export const PAYMENT_SHORT: Record<PaymentMethod, string> = {
  CASH: "cash",
  UPI: "UPI",
  CREDIT_CARD: "credit card",
  DEBIT_CARD: "debit card",
  CARD: "card",
};
