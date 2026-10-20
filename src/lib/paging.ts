// Page maths for the admin lists. Pure, so it's unit-tested.

export const PAGE_SIZES = [10, 25, 50] as const;

/** A page size from the URL if it's one we offer, otherwise the default. */
export function resolvePerPage(input: string | undefined, fallback: number) {
  const n = Number(input);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback;
}

/** Number of pages (at least 1) and the requested page kept inside them. */
export function clampPage(page: number, total: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return { pages, page: Math.min(Math.max(1, Math.floor(page) || 1), pages) };
}

/** Page buttons to show: always the first and last, the current one and its neighbours, "…" for gaps. */
export function pageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => keep.add(n));
  const sorted = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** "11–20 of 134" */
export function rangeLabel(page: number, perPage: number, total: number) {
  if (total === 0) return "0 of 0";
  const from = (page - 1) * perPage + 1;
  return `${from}–${Math.min(total, page * perPage)} of ${total}`;
}
