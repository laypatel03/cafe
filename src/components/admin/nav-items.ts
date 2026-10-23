import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "orders"
    | "menu"
    | "history"
    | "cash"
    | "expenses"
    | "money"
    | "qr"
    | "customers"
    | "reports"
    | "settings";
  roles: Role[];
  /** not built yet – shown greyed out with the phase it arrives in */
  soon?: string;
};

export const ROLE_LABEL: Record<Role, string> = { STAFF: "Staff", OWNER: "Owner", DEVELOPER: "Developer" };

export const NAV: NavItem[] = [
  { href: "/admin", label: "Live orders", icon: "orders", roles: ["STAFF", "OWNER"] },
  { href: "/admin/menu", label: "Menu", icon: "menu", roles: ["STAFF", "OWNER", "DEVELOPER"] },
  { href: "/admin/orders", label: "Order history", icon: "history", roles: ["STAFF", "OWNER"] },
  { href: "/admin/cash", label: "Cash counter", icon: "cash", roles: ["STAFF", "OWNER"] },
  { href: "/admin/expenses", label: "Expenses", icon: "expenses", roles: ["STAFF", "OWNER"] },
  { href: "/admin/money", label: "Money book", icon: "money", roles: ["OWNER"] },
  { href: "/admin/qr", label: "QR code", icon: "qr", roles: ["OWNER", "DEVELOPER"] },
  { href: "/admin/customers", label: "Customers", icon: "customers", roles: ["OWNER"] },
  { href: "/admin/reports", label: "Reports", icon: "reports", roles: ["OWNER"] },
  { href: "/admin/settings", label: "Settings", icon: "settings", roles: ["OWNER", "DEVELOPER"] },
];
