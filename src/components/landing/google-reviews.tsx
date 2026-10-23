import { ArrowUpRight, PenLine, Star } from "lucide-react";
import { Reveal } from "@/components/brand/reveal";
import { Button } from "@/components/ui/button";
import { REVIEW_URL } from "@/lib/cafe";
import { initials } from "@/lib/format";
import type { GoogleReviews as Reviews } from "@/lib/google-reviews";
import { cn } from "@/lib/utils";

function Stars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= full ? "fill-[#FF8A00] text-[#FF8A00]" : "fill-none text-[#c9d6cc]")}
        />
      ))}
    </span>
  );
}

/** Rating and reviews exactly as Google sends them (Google's terms: unedited, with author and Google credit). */
export function GoogleReviews({ data }: { data: Reviews }) {
  return (
    <section
      id="reviews"
      className="border-t border-[#d7eadb] py-20 sm:py-28 dark:border-[#24392b]"
      aria-labelledby="reviews-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-2 text-xs font-black tracking-widest text-[#C2410C] uppercase dark:text-[#FF8A00]">
            Community voice
          </p>
          <h2
            id="reviews-title"
            className="text-3xl leading-[1.15] font-black tracking-tight text-balance text-[#0f1f15] sm:text-4xl lg:text-5xl dark:text-[#eef5ef]"
          >
            What our guests say
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[#334b3c] dark:text-[#a7b8ac]">
            <span className="text-2xl font-black text-[#0f1f15] dark:text-[#eef5ef]">
              {data.rating.toFixed(1)}
            </span>
            <Stars rating={data.rating} className="[&_svg]:size-5" />
            <span className="text-sm font-semibold">
              {data.count.toLocaleString("en-IN")} {data.count === 1 ? "review" : "reviews"} on Google
            </span>
          </div>
        </div>

        {data.reviews.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.reviews.map((r, i) => (
              <li key={`${r.author}-${i}`}>
                <Reveal delay={i * 0.05} className="h-full">
                  <figure className="flex h-full flex-col rounded-2xl border border-[#cde5d3] bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-[#24392b] dark:bg-[#16251b]">
                    <figcaption className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {r.photo ? (
                          // plain <img>: Google's photo is shown as sent, not copied into our image cache
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.photo}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="size-10 shrink-0 rounded-full bg-muted"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white",
                              i % 2 ? "bg-[#c2410c]" : "bg-[#055c1b]",
                            )}
                          >
                            {initials(r.author)}
                          </span>
                        )}
                        <div className="min-w-0">
                          {r.authorUrl ? (
                            <a
                              href={r.authorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-[15px] font-bold text-[#0f1f15] hover:underline dark:text-[#eef5ef]"
                            >
                              {r.author}
                            </a>
                          ) : (
                            <span className="block truncate text-[15px] font-bold text-[#0f1f15] dark:text-[#eef5ef]">
                              {r.author}
                            </span>
                          )}
                          <span className="block truncate text-xs text-[#5a6f61] dark:text-[#a7b8ac]">
                            Google review{r.when && ` · ${r.when}`}
                          </span>
                        </div>
                      </div>
                      <Stars rating={r.rating} className="mt-0.5 shrink-0 [&_svg]:size-3.5" />
                    </figcaption>
                    <blockquote className="mt-4 line-clamp-6 text-sm leading-relaxed whitespace-pre-line text-[#334b3c] dark:text-[#cde5d3]">
                      &ldquo;{r.text}&rdquo;
                    </blockquote>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-3">
            {data.mapsUrl && (
              <Button asChild variant="outline" className="h-11 rounded-full px-5 font-bold">
                <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer">
                  Read all reviews on Google <ArrowUpRight data-icon="inline-end" />
                </a>
              </Button>
            )}
            <Button
              asChild
              className="h-11 rounded-full bg-[#FF8A00] px-5 font-bold text-[#1a1206] hover:bg-[#f07f00]"
            >
              <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
                <PenLine data-icon="inline-start" /> Write a review
              </a>
            </Button>
          </div>
          <p className="text-xs text-[#5a6f61] dark:text-[#a7b8ac]">
            Reviews from Google, shown as written. We show 4 and 5 star reviews here.
          </p>
        </div>
      </div>
    </section>
  );
}
