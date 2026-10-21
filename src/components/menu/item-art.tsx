import { Citrus, CupSoda, GlassWater, Salad, Sandwich, Snowflake, Soup, Sparkles, Wheat } from "lucide-react";
import { FadeImage } from "@/components/brand/fade-image";
import type { CategorySlug } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

const art: Record<string, { icon: typeof Soup; from: string; to: string }> = {
  salads: { icon: Salad, from: "#78b90c", to: "#167a24" },
  chaat: { icon: Soup, from: "#ffb900", to: "#ff7800" },
  sandwiches: { icon: Sandwich, from: "#ffd04d", to: "#ff9a00" },
  toast: { icon: Wheat, from: "#ff9a2e", to: "#e05f00" },
  "oats-bowls": { icon: Soup, from: "#a3cf4a", to: "#55a90d" },
  drinks: { icon: CupSoda, from: "#55a90d", to: "#0e5518" },
  navratri: { icon: Sparkles, from: "#fb923c", to: "#db2777" },
  "oats-overnight": { icon: Snowflake, from: "#6ee7b7", to: "#0f766e" },
  smoothies: { icon: Citrus, from: "#fdba74", to: "#f97316" },
  "cold-drinks": { icon: GlassWater, from: "#7dd3fc", to: "#0369a1" },
};

const FALLBACK = { icon: Salad, from: "#78b90c", to: "#167a24" };

/** Stand-in artwork until the owner uploads photos (photos are optional per item). */
export function ItemArt({ category, className }: { category: CategorySlug; className?: string }) {
  const a = art[category] ?? FALLBACK;
  return (
    <div
      aria-hidden
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})` }}
    >
      <div className="absolute -top-1/3 -right-1/4 size-[90%] rounded-full bg-white/15 blur-xl" />
      <a.icon
        className="relative size-1/2 max-h-16 max-w-16 text-white/90 drop-shadow-md"
        strokeWidth={1.5}
      />
    </div>
  );
}

/** Uploaded photo if there is one, otherwise the category artwork. */
export function ItemImage({
  item,
  className,
  sizes,
  priority,
}: {
  item: { name: string; category: CategorySlug; photo?: string };
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!item.photo) return <ItemArt category={item.category} className={className} />;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <FadeImage
        src={item.photo}
        alt={item.name}
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
