import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { isWithinWorkingHours } from "@/lib/cafe-hours";
import { getCafeDetails } from "@/lib/data/menu";
import { getMenuWithOffers } from "@/lib/data/offers";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Salads, chaats, sandwiches, toast, oats bowls and drinks – with protein and calories on every item.",
};

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const [{ item }, menu, cafe] = await Promise.all([searchParams, getMenuWithOffers(), getCafeDetails()]);
  const isWithinHours = isWithinWorkingHours(cafe.hours);

  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      orderingEnabled={cafe.orderingEnabled}
      isWithinHours={isWithinHours}
      hours={cafe.hours}
      initialItemId={typeof item === "string" ? item : undefined}
    />
  );
}
