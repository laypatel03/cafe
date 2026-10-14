import type { ExpenseCategory, ExpensePayment } from "@/generated/prisma/enums";

// Names people see for expense categories and payment ways (the database keeps the codes).

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  VEGETABLES_FRUITS: "Vegetables & fruits",
  GROCERY: "Groceries",
  DAIRY: "Dairy",
  PACKAGING: "Packaging",
  GAS: "Gas",
  ELECTRICITY_WATER: "Electricity & water",
  RENT: "Rent",
  SALARIES: "Salaries",
  REPAIRS: "Repairs",
  OTHER: "Other",
};

export const EXPENSE_PAYMENT: Record<ExpensePayment, string> = {
  CASH: "Cash from the drawer",
  UPI: "Google Pay / UPI",
  CARD: "Card",
  BANK: "Bank transfer",
};
