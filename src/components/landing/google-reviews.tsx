"use client";

import { ArrowRight, ArrowUpRight, PenLine, Quote, Salad, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/brand/reveal";
import { Button } from "@/components/ui/button";
import { REVIEW_URL } from "@/lib/cafe";
import { initials } from "@/lib/format";
import type { Dish, MarkedReview } from "@/lib/google-reviews";
import { cn } from "@/lib/utils";

export type ReviewsSection = {
  rating: number;
  count: number;
  mapsUrl: string;
  reviews: MarkedReview[];
  lovedFor: Dish[];
};

// one tint per dish, used for its highlight in the text and its chip
const TINTS = [
  "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200",
  "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200",
  "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200",
];
const AVATARS = ["bg-[#055c1b]", "bg-[#c2410c]", "bg-[#1d4ed8]", "bg-[#6d28d9]", "bg-[#0f1f15]"];

function Stars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= full ? "fill-[#FF8A00] text-[#FF8A00]" : "fill-none text-[#c9d6cc] dark:text-[#2b4334]",
          )}
        />
      ))}
    </span>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function ReviewCard({ r, i, tint }: { r: MarkedReview; i: number; tint: (id: string) => string }) {
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-[#e3ece5] bg-white p-6 shadow-sm transition-shadow hover:shadow-lg dark:border-[#24392b] dark:bg-[#16251b]">
      <figcaption className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative shrink-0">
            {r.photo ? (
              // plain <img>: Google's photo is shown as sent, not copied into our image cache
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.photo}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-12 rounded-full bg-muted object-cover"
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "flex size-12 items-center justify-center rounded-full text-base font-black text-white",
                  AVATARS[i % AVATARS.length],
                )}
              >
                {initials(r.author)}
              </span>
            )}
            <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#0e1a12]">
              <GoogleG className="size-3" />
            </span>
          </span>
          <div className="min-w-0">
            {r.authorUrl ? (
              <a
                href={r.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate font-bold text-[#0f1f15] hover:underline dark:text-[#eef5ef]"
              >
                {r.author}
              </a>
            ) : (
              <span className="block truncate font-bold text-[#0f1f15] dark:text-[#eef5ef]">{r.author}</span>
            )}
            <span className="block text-xs text-[#5a6f61] dark:text-[#a7b8ac]">
              Google review{r.when && ` · ${r.when}`}
            </span>
          </div>
        </div>
        <Stars rating={r.rating} className="mt-1 shrink-0 [&_svg]:size-3.5" />
      </figcaption>

      <blockquote className="relative mt-5 flex-1 pl-5">
        <Quote
          aria-hidden
          className="absolute top-0 left-0 size-4 -scale-x-100 text-[#d7e3da] dark:text-[#2b4334]"
        />
        <p className="line-clamp-8 text-[15px] leading-relaxed whitespace-pre-line text-[#273a2f] dark:text-[#cde5d3]">
          &ldquo;
          {r.parts.map((p, k) =>
            p.dish ? (
              <mark key={k} className={cn("rounded px-1 font-semibold", tint(p.dish))}>
                {p.text}
              </mark>
            ) : (
              <span key={k}>{p.text}</span>
            ),
          )}
          &rdquo;
        </p>
      </blockquote>

      {r.dishes.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#eef3ef] pt-4 dark:border-[#24392b]">
          {r.dishes.map((d) => (
            <Link
              key={d.id}
              href={`/menu?item=${encodeURIComponent(d.id)}`}
              className={cn("rounded-full px-3 py-1 text-xs font-bold hover:opacity-80", tint(d.id))}
            >
              {d.name}
            </Link>
          ))}
        </div>
      )}
    </figure>
  );
}

function PromiseCard() {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-[#14361f] p-6 text-white shadow-lg dark:bg-[#0b2414] dark:ring-1 dark:ring-[#24392b]">
      <div className="flex items-center justify-between">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
          <Salad className="size-6" aria-hidden />
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black tracking-widest uppercase">
          Our promise
        </span>
      </div>
      <p className="mt-6 text-2xl leading-tight font-black tracking-tight">
        Real food.
        <br />
        Made in our kitchen every day.
      </p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/80">
        Salads and bowls, chaat, toasts, sandwiches, oats and smoothies – cooked with ingredients you know,
        with our estimate of the protein and calories shown for every dish.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/15 pt-4 text-sm">
        <Link
          href="/menu"
          className="group inline-flex items-center gap-1 font-bold underline-offset-4 hover:underline"
        >
          Explore Menu{" "}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Rating and reviews exactly as Google sends them (Google's terms: unedited, with author and Google credit). */
export function GoogleReviews({ data }: { data: ReviewsSection }) {
  const [dish, setDish] = useState<string | null>(null);
  const tintOf = new Map(data.lovedFor.map((d, i) => [d.id, TINTS[i % TINTS.length]]));
  const tint = (id: string) => tintOf.get(id) ?? TINTS[0];
  const shown = dish ? data.reviews.filter((r) => r.dishes.some((d) => d.id === dish)) : data.reviews;
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
      active
        ? "border-[#0f1f15] bg-[#0f1f15] text-white dark:border-[#eef5ef] dark:bg-[#eef5ef] dark:text-[#0f1f15]"
        : "border-[#dfe8e1] bg-white text-[#273a2f] hover:border-[#055c1b] dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#cde5d3] dark:hover:border-[#7ddc78]",
    );

  return (
    <section
      id="reviews"
      className="border-t border-[#d7eadb] bg-gradient-to-b from-[#f6f8f5] to-[#fbf9f1] py-20 sm:py-28 dark:border-[#24392b] dark:from-[#0e1a12] dark:to-[#0b160f]"
      aria-labelledby="reviews-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 flex max-w-4xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#cde5d3] bg-white px-4 py-1.5 text-xs dark:border-[#24392b] dark:bg-[#16251b]">
            <span aria-hidden className="size-2 rounded-full bg-[#15803D] dark:bg-[#7ddc78]" />
            <span className="font-black tracking-widest text-[#0f1f15] uppercase dark:text-[#eef5ef]">
              Google reviews
            </span>
            <span aria-hidden className="text-[#b0c4b2]">
              ·
            </span>
            <span className="font-semibold text-[#055c1b] dark:text-[#7ddc78]">Healthy Hunger Café</span>
          </span>

          <h2
            id="reviews-title"
            className="mt-5 text-4xl leading-[1.1] font-black tracking-tight text-balance text-[#0f1f15] sm:text-5xl lg:text-6xl dark:text-[#eef5ef]"
          >
            What our guests say
          </h2>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-3 rounded-2xl border border-[#e3ece5] bg-white px-4 py-2.5 shadow-sm dark:border-[#24392b] dark:bg-[#16251b]">
              <GoogleG className="size-6" />
              <span className="text-2xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
                {data.rating.toFixed(1)}
              </span>
              <Stars rating={data.rating} className="[&_svg]:size-5" />
              <span className="border-l border-[#e3ece5] pl-3 text-sm font-medium text-[#334b3c] dark:border-[#24392b] dark:text-[#a7b8ac]">
                {data.count.toLocaleString("en-IN")} {data.count === 1 ? "review" : "reviews"} on Google
              </span>
            </span>
          </div>

          {data.lovedFor.length > 0 && (
            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              role="group"
              aria-label="Filter reviews by dish"
            >
              <span className="mr-1 text-xs font-black tracking-widest text-[#5a6f61] uppercase dark:text-[#a7b8ac]">
                Loved for:
              </span>
              <button
                type="button"
                aria-pressed={!dish}
                onClick={() => setDish(null)}
                className={chip(!dish)}
              >
                All reviews
              </button>
              {data.lovedFor.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={dish === d.id}
                  onClick={() => setDish(dish === d.id ? null : d.id)}
                  className={chip(dish === d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const i = data.reviews.indexOf(r);
            return (
              <li key={`${r.author}-${i}`}>
                <Reveal delay={(i % 3) * 0.05} className="h-full">
                  <ReviewCard r={r} i={i} tint={tint} />
                </Reveal>
              </li>
            );
          })}
          <li>
            <Reveal delay={0.1} className="h-full">
              <PromiseCard />
            </Reveal>
          </li>
        </ul>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {data.mapsUrl && (
            <Button asChild variant="outline" className="h-12 rounded-full px-6 font-bold">
              <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer">
                Read all reviews on Google <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          )}
          <Button
            asChild
            className="h-12 rounded-full bg-[#FF8A00] px-6 font-bold text-[#1a1206] hover:bg-[#f07f00]"
          >
            <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
              <PenLine data-icon="inline-start" /> Write a review
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
