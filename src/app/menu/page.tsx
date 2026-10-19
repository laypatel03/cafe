import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { isWithinWorkingHours } from "@/lib/cafe-hours";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Salads, chaats, sandwiches, toast, oats bowls and drinks – with protein and calories on every item.",
};

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const [{ item }, menu, cafe] = await Promise.all([searchParams, getPublicMenu(), getCafeDetails()]);
  const isWithinHours = isWithinWorkingHours(cafe.hours);
  const isOrderingAllowed = cafe.orderingEnabled && isWithinHours;

  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      orderingEnabled={isOrderingAllowed}
      isWithinHours={isWithinHours}
      hours={cafe.hours}
      initialItemId={typeof item === "string" ? item : undefined}
    />
  );
}
