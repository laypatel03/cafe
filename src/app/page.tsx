import { connection } from "next/server";
import { CafeJsonLd } from "@/components/landing/cafe-json-ld";
import { Hero, type HeroDish } from "@/components/landing/hero";
import {
  Bestsellers,
  FromOurKitchen,
  HowWeCount,
  OurPromise,
  TodaysPick,
  VisitUs,
} from "@/components/landing/sections";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { ARTICLES } from "@/lib/articles";
import { isWithinWorkingHours } from "@/lib/cafe-hours";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export default async function HomePage() {
  // Rendered per request (cheap – the data below is cached) so builds don't need the database.
  await connection();
  const [{ items, categories }, cafe] = await Promise.all([getPublicMenu(), getCafeDetails()]);
  const pick = items.find((m) => m.id === cafe.todaysPickId) ?? items[0];
  const isOrderingAllowed = cafe.orderingEnabled && isWithinWorkingHours(cafe.hours);

  // Hero cards: today's pick, then dishes with photos, bestsellers, then the most protein.
  const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
  const orderable = items.filter((m) => m.available && m.price > 0);
  const ranked = [
    ...(pick && orderable.includes(pick) ? [pick] : []),
    ...orderable.filter((m) => m.photo),
    ...orderable.filter((m) => m.tags.includes("bestseller")),
    ...[...orderable].sort((a, b) => b.protein - a.protein),
  ];
  const heroDishes: HeroDish[] = [...new Map(ranked.map((m) => [m.id, m])).values()].slice(0, 5).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    categoryName: categoryName.get(m.category) ?? "",
    price: m.price,
    protein: m.protein,
    kcal: m.kcal,
    photo: m.photo,
    bestseller: m.tags.includes("bestseller"),
  }));

  return (
    <>
      <CafeJsonLd cafe={cafe} />
      <SiteHeader showBlog={cafe.blogEnabled} />
      <main>
        <Hero dishes={heroDishes} />
        {pick && <TodaysPick item={pick} />}
        <OurPromise />
        {items.length > 0 && <Bestsellers items={items} orderingEnabled={isOrderingAllowed} />}
        <HowWeCount />
        {cafe.blogEnabled && (
          <FromOurKitchen
            articles={[...ARTICLES].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 3)}
          />
        )}
        <VisitUs cafe={cafe} />
      </main>
      <SiteFooter cafe={cafe} />
    </>
  );
}
