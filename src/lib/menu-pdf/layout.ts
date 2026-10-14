import type { AddOn, Category, MenuItem } from "@/lib/menu-types";

/**
 * Splits the menu into A4 pages of two columns. react-pdf has no column flow, so heights are
 * estimated from text length (Figtree at the sizes in document.tsx) and kept on the safe side;
 * a category that doesn't fit is continued in the next column.
 */

export type PdfCategory = { name: string; items: MenuItem[]; addOns: AddOn[] };
export type PdfBlock = PdfCategory & { continued: boolean; showAddOns: boolean };
export type PdfPage = [PdfBlock[], PdfBlock[]];

/** Usable height of one column in points (A4 minus padding, header and footer, with slack). */
export const COLUMN_HEIGHT = 630;

const NAME_CHARS_PER_LINE = 40;
const TEXT_CHARS_PER_LINE = 68;

const lines = (text: string, perLine: number) => (text ? Math.ceil(text.length / perLine) : 0);

export function itemHeight(item: MenuItem) {
  return (
    11.5 * lines(item.name, NAME_CHARS_PER_LINE) +
    9.1 * lines(item.description, TEXT_CHARS_PER_LINE) +
    9 +
    8.5
  );
}

const HEADER_HEIGHT = 30;
const BLOCK_GAP = 12;

export function addOnsHeight(addOns: AddOn[]) {
  if (addOns.length === 0) return 0;
  const text = addOns.map((a) => `${a.name} ₹${a.price}`).join(" · ");
  return 10 + 10 * lines(`Add-ons: ${text}`, TEXT_CHARS_PER_LINE);
}

/** Groups visible items by category with the add-ons any of them offer. */
export function groupMenu(categories: Category[], items: MenuItem[], addOns: AddOn[]): PdfCategory[] {
  const addOnById = new Map(addOns.map((a) => [a.id, a]));
  return categories
    .map((c) => {
      const catItems = items.filter((i) => i.category === c.slug);
      const ids = new Set(catItems.flatMap((i) => i.addOnIds));
      const catAddOns = [...ids]
        .map((id) => addOnById.get(id))
        .filter((a): a is AddOn => !!a && a.available)
        .sort((a, b) => addOns.indexOf(a) - addOns.indexOf(b));
      return { name: c.name, items: catItems, addOns: catAddOns };
    })
    .filter((c) => c.items.length > 0);
}

export function paginate(groups: PdfCategory[]): PdfPage[] {
  const pages: PdfPage[] = [];
  let page: PdfPage = [[], []];
  let col = 0;
  let used = 0;

  const nextColumn = () => {
    if (col === 0) col = 1;
    else {
      pages.push(page);
      page = [[], []];
      col = 0;
    }
    used = 0;
  };

  for (const group of groups) {
    let remaining = [...group.items];
    let continued = false;

    // Keep a category in one piece: if it fits a fresh column but not this one, move it whole.
    // Only a category taller than a column is split, and never with fewer than two items under its heading.
    const whole =
      HEADER_HEIGHT + remaining.reduce((h, i) => h + itemHeight(i), 0) + addOnsHeight(group.addOns);
    const minStart = HEADER_HEIGHT + remaining.slice(0, 2).reduce((h, i) => h + itemHeight(i), 0);
    if (
      used > 0 &&
      used + whole > COLUMN_HEIGHT &&
      (whole <= COLUMN_HEIGHT || used + minStart > COLUMN_HEIGHT)
    ) {
      nextColumn();
    }

    while (remaining.length > 0) {
      let height = used + HEADER_HEIGHT;
      const fit: MenuItem[] = [];
      for (const item of remaining) {
        const h = itemHeight(item);
        if (fit.length > 0 && height + h > COLUMN_HEIGHT) break;
        fit.push(item);
        height += h;
      }
      remaining = remaining.slice(fit.length);
      const last = remaining.length === 0;
      const extra = last ? addOnsHeight(group.addOns) : 0;
      // Add-ons line goes with the last items; move one item along if it would overflow.
      if (last && fit.length > 1 && height + extra > COLUMN_HEIGHT) {
        remaining = [fit.pop()!];
        height -= itemHeight(remaining[0]);
      }
      const done = remaining.length === 0;

      page[col].push({ ...group, items: fit, continued, showAddOns: done });
      used = height + (done ? extra : 0) + BLOCK_GAP;
      continued = true;
      if (!done) nextColumn();
    }
  }

  if (page[0].length > 0) pages.push(page);
  return pages;
}
