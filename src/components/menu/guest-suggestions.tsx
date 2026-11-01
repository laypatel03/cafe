"use client";

import { useEffect, useState } from "react";
import { type GuestMatch, searchGuests } from "@/app/admin/(dashboard)/actions";

/**
 * Owner, counter order: saved customers matching what's being typed in the number or name field.
 * Asks the server a moment after typing stops; nothing below 3 digits / 2 letters.
 */
export function useGuestSuggestions(query: string, enabled: boolean) {
  const [result, setResult] = useState<{ query: string; guests: GuestMatch[] }>({ query: "", guests: [] });
  const q = query.trim();
  useEffect(() => {
    if (!enabled || q.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      void searchGuests(q)
        .then((res) => live && res.ok && setResult({ query: q, guests: res.guests }))
        .catch(() => {});
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, q]);
  // only the answer to what's in the field now
  return enabled && result.query === q ? result.guests : [];
}

/** The pick list under the field. `onMouseDown` keeps the field focused so the tap lands. */
export function GuestSuggestionList({
  id,
  guests,
  onPick,
}: {
  id: string;
  guests: GuestMatch[];
  onPick: (guest: GuestMatch) => void;
}) {
  if (guests.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Saved customers"
      className="mt-1 max-h-56 overflow-y-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
    >
      {guests.map((g) => (
        <li key={g.phone} role="option" aria-selected={false}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(g)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{g.name}</span>
              <span className="tabular text-muted-foreground">{g.phone}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {g.visits} {g.visits === 1 ? "visit" : "visits"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
