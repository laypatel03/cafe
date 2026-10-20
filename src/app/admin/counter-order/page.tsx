import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getPublicMenu } from "@/lib/data/menu";

export const metadata: Metadata = { title: "Counter order", robots: { index: false } };

/**
 * Staff take a walk-in guest's order with the same menu guests see on their phones.
 * Full screen (outside the dashboard layout) so it looks and works exactly like the QR menu.
 * `?customer=<id>` (owner, from a customer's page) fills in that guest's name and number.
 */
export default async function CounterOrderPage({ searchParams }: PageProps<"/admin/counter-order">) {
  const me = await requireUser();
  const { customer: customerId } = await searchParams;
  const [menu, guest] = await Promise.all([
    getPublicMenu(),
    // owner only: staff see masked numbers everywhere else
    me.role === "OWNER" && typeof customerId === "string"
      ? db.customer.findUnique({ where: { id: customerId }, select: { name: true, phone: true } })
      : null,
  ]);
  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      // staff can take counter orders even while guest ordering is switched off
      orderingEnabled
      counter
      counterGuest={guest ?? undefined}
    />
  );
}
