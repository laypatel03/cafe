import { ArrowRight, Dumbbell, Flame } from "lucide-react";
import Link from "next/link";
import { VegMark } from "@/components/brand/veg-mark";
import { FadeImage } from "@/components/brand/fade-image";
import { ItemImage } from "@/components/menu/item-art";
import { type Article, articleDate } from "@/lib/articles";
import type { MenuItem } from "@/lib/menu-types";

/** An article in a list: cover, title, one line, date and read time. */
export function ArticleCard({ article: a, priority }: { article: Article; priority?: boolean }) {
  return (
    <Link
      href={`/blog/${a.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <FadeImage
          src={a.cover.src}
          alt={a.cover.alt}
          priority={priority}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-[opacity,transform] duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted-foreground">
          {articleDate(a.published)} · {a.readMinutes} min read
        </p>
        <h3 className="mt-2 text-xl font-semibold text-balance">{a.title}</h3>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-text">
          Read <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** A dish under an article's "Try it": photo, name, protein and calories – no price. */
export function TryDishCard({ item }: { item: MenuItem }) {
  return (
    <Link
      href={`/menu?item=${item.id}`}
      className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-3 pr-5 transition-colors hover:bg-muted"
    >
      <ItemImage item={item} sizes="80px" className="size-20 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          <VegMark /> <span className="min-w-0 truncate">{item.name}</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 tabular text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="size-3.5" aria-hidden /> {item.protein} g protein
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="size-3.5" aria-hidden /> {item.kcal} kcal
          </span>
        </p>
        {!item.available && <p className="mt-1 text-xs font-semibold text-brand-text">Sold out today</p>}
      </div>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
    </Link>
  );
}
