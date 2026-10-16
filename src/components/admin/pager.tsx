import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageSizeSelect } from "@/components/admin/page-size-select";
import { PAGE_SIZES, pageNumbers, rangeLabel } from "@/lib/paging";
import { cn } from "@/lib/utils";

/**
 * Page links under an admin list: ‹ 1 2 3 … 10 ›, then "Results: 1–10 of 96" and (optionally)
 * how many to show per page. Plain links, so the browser's back button and shared URLs keep the page.
 */
export function Pager({
  page,
  pages,
  total,
  perPage,
  noun,
  href,
  sizes = false,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  /** what's being counted, plural: "orders" */
  noun: string;
  /** link for a page (and page size, when sizes are offered) */
  href: (to: { page: number; perPage: number }) => string;
  /** show the 10 / 25 / 50 per page choice */
  sizes?: boolean;
}) {
  if (total === 0) return null;
  const tile =
    "inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold sm:size-11 sm:text-base";
  const arrow = (to: number, label: string, Icon: typeof ChevronLeft) =>
    to >= 1 && to <= pages ? (
      <Link href={href({ page: to, perPage })} className={cn(tile, "hover:bg-muted")} aria-label={label}>
        <Icon className="size-5" aria-hidden />
      </Link>
    ) : (
      <span className={cn(tile, "text-muted-foreground/40")} aria-hidden>
        <Icon className="size-5" />
      </span>
    );

  return (
    <nav aria-label={`${noun} pages`} className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <li>{arrow(page - 1, "Previous page", ChevronLeft)}</li>
        {pageNumbers(page, pages).map((n, i) =>
          n === "…" ? (
            <li key={`gap-${i}`} className={cn(tile, "text-muted-foreground")} aria-hidden>
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href({ page: n, perPage })}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  tile,
                  "tabular",
                  n === page ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>{arrow(page + 1, "Next page", ChevronRight)}</li>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm font-semibold sm:text-base">
          Results: {rangeLabel(page, perPage, total)}
        </p>
        {sizes && (
          <PageSizeSelect
            value={perPage}
            options={PAGE_SIZES.map((size) => ({ size, href: href({ page: 1, perPage: size }) }))}
          />
        )}
      </div>
    </nav>
  );
}
