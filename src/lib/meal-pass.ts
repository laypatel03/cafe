// Meal passes: a customer prepays for a number of meals to use within 30 days.
// A plan has one or more meal types ("Bowl", "Smoothie", "Toast"...), each with its own count,
// categories and price limit. Pure rules, so they're unit-tested; the server loads rows and
// saves results. Money in paise.

/** One meal type on a plan, e.g. 26 × "Bowl" from Salads or Bowls, up to ₹199 each. */
export type MealPart = {
  name: string;
  meals: number;
  /** a dish in any of these categories counts */
  categoryIds: string[];
  capPaise: number;
};

/** What a pass covers (copied from its plan when sold). */
export type PassRules = { parts: MealPart[] };

export type PassState = PassRules & { startsOn: string; endsOn: string; refunded: boolean };

/** Meals left, one number per part (same order as `parts`). */
export type MealsLeft = number[];

export type PassStatus = "upcoming" | "active" | "used up" | "lapsed" | "refunded";

/** Reads the parts JSON stored on a plan or pass; anything malformed is dropped. */
export function readParts(json: unknown): MealPart[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((p) =>
    p &&
    typeof p === "object" &&
    typeof p.name === "string" &&
    Number.isInteger(p.meals) &&
    Array.isArray(p.categoryIds) &&
    Number.isInteger(p.capPaise)
      ? [
          {
            name: p.name,
            meals: p.meals,
            categoryIds: p.categoryIds.filter((c: unknown) => typeof c === "string"),
            capPaise: p.capPaise,
          },
        ]
      : [],
  );
}

const plural = (n: number, name: string) => {
  const word = name.toLowerCase();
  return `${n} ${n === 1 || /s$/.test(word) ? word : `${word}s`}`;
};

/** "26 bowls + 26 smoothies", for counts per part (plan totals or meals left). */
export const mealsSummary = (parts: Pick<MealPart, "name">[], counts: number[]) =>
  parts
    .map((p, i) => (counts[i] > 0 ? plural(counts[i], p.name) : ""))
    .filter(Boolean)
    .join(" + ") || "none";

/** Last day of a pass that starts on `startsOn` and runs `days` days (both ends count). */
export function passEndsOn(startsOn: string, days: number) {
  const [y, m, d] = startsOn.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days - 1)).toISOString().slice(0, 10);
}

/** Part counts minus meals already used (uses on cancelled or deleted orders aren't counted by the caller). */
export function mealsLeft(rules: PassRules, used: { part: number }[]): MealsLeft {
  return rules.parts.map((p, i) => Math.max(0, p.meals - used.filter((u) => u.part === i).length));
}

export function passStatus(pass: PassState, left: MealsLeft, today: string): PassStatus {
  if (pass.refunded) return "refunded";
  if (today > pass.endsOn) return "lapsed";
  if (left.every((n) => n === 0)) return "used up";
  if (today < pass.startsOn) return "upcoming";
  return "active";
}

/** A dish line on an unbilled order, with the price of the dish itself (add-ons are always charged). */
export type DishLine = {
  orderId: string;
  menuItemId: string;
  categoryId: string;
  name: string;
  quantity: number;
  dishPaise: number;
};

/** One dish (one unit of a line) a pass could pay for. */
export type MealOption = {
  orderId: string;
  menuItemId: string;
  name: string;
  /** index into the pass's parts */
  part: number;
  partName: string;
  /** what the pass pays: the dish price up to the part's cap */
  coverPaise: number;
  /** units on this order not yet covered */
  units: number;
  /** outside the plan's categories, counted as a meal at the counter */
  swap: boolean;
};

/**
 * Dishes from other categories staff may count as a meal ("swap"): none, only ones the pass
 * covers in full (staff), or any – the guest pays the difference (owner).
 */
export type SwapRule = "none" | "within cap" | "any";

/** What a swap uses up: the first meal type with meals left. */
export const swapPart = (rules: PassRules, left: MealsLeft) => {
  const i = rules.parts.findIndex((p, k) => p.meals > 0 && left[k] > 0);
  return i === -1 ? null : i;
};

/** The meal type a dish's category counts as: the first one with meals left, else the first match. */
const partOf = (rules: PassRules, left: MealsLeft, categoryId: string) => {
  const matches = rules.parts
    .map((p, i) => (p.meals > 0 && p.categoryIds.includes(categoryId) ? i : -1))
    .filter((i) => i !== -1);
  return matches.find((i) => left[i] > 0) ?? matches[0] ?? null;
};

/**
 * Dishes on these orders the pass can cover, minus ones already covered.
 * `covered` counts existing uses per `${orderId}:${menuItemId}`.
 */
export function mealOptions(
  rules: PassRules,
  left: MealsLeft,
  lines: DishLine[],
  covered: Map<string, number>,
  swaps: SwapRule = "none",
): MealOption[] {
  const byDish = new Map<string, MealOption>();
  const swapTo = swapPart(rules, left);
  for (const l of lines) {
    if (l.dishPaise <= 0) continue;
    const planPart = partOf(rules, left, l.categoryId);
    const part = planPart ?? (swaps !== "none" ? swapTo : null);
    if (part === null) continue;
    const cap = rules.parts[part].capPaise;
    if (planPart === null && swaps === "within cap" && l.dishPaise > cap) continue;
    const key = `${l.orderId}:${l.menuItemId}`;
    const existing = byDish.get(key);
    // the same dish on one order with different add-ons: cover the dearer price first
    const coverPaise = Math.max(existing?.coverPaise ?? 0, Math.min(l.dishPaise, cap));
    byDish.set(key, {
      orderId: l.orderId,
      menuItemId: l.menuItemId,
      name: l.name,
      part,
      partName: rules.parts[part].name,
      coverPaise,
      units: (existing?.units ?? 0) + l.quantity,
      swap: planPart === null,
    });
  }
  return [...byDish.entries()]
    .map(([key, o]) => ({ ...o, units: o.units - (covered.get(key) ?? 0) }))
    .filter((o) => o.units > 0 && o.coverPaise > 0);
}

export type MealPick = { orderId: string; menuItemId: string; count: number };

/** Checks what staff picked against what is on the orders and what is left on the pass. */
export function checkPicks(
  picks: MealPick[],
  options: MealOption[],
  left: MealsLeft,
): { ok: true; uses: Omit<MealOption, "units">[] } | { ok: false; error: string } {
  const uses: Omit<MealOption, "units">[] = [];
  for (const p of picks) {
    if (p.count === 0) continue;
    const o = options.find((x) => x.orderId === p.orderId && x.menuItemId === p.menuItemId);
    if (!o) return { ok: false, error: "A dish you picked can't use the pass – refresh the screen." };
    if (!Number.isInteger(p.count) || p.count < 0 || p.count > o.units)
      return { ok: false, error: `Only ${o.units} × ${o.name} can use the pass.` };
    const { orderId, menuItemId, name, part, partName, coverPaise, swap } = o;
    for (let i = 0; i < p.count; i++)
      uses.push({ orderId, menuItemId, name, part, partName, coverPaise, swap });
  }
  if (uses.length === 0) return { ok: false, error: "Pick at least one dish." };
  for (const [i, n] of left.entries()) {
    const wanted = uses.filter((u) => u.part === i);
    if (wanted.length > n)
      return {
        ok: false,
        error: `Only ${plural(n, wanted[0].partName)} left on the pass.`,
      };
  }
  return { ok: true, uses };
}

/** Name of the discount line a use adds to the order. */
export const passLineName = (partName: string, dish: string, passNumber: number, swap = false) =>
  `Meal pass #${passNumber} – ${partName.toLowerCase()}${swap ? " (swap)" : ""}: ${dish}`.slice(0, 120);

/**
 * The starting choice when a guest's dishes are spread over several passes: each dish (one per unit)
 * goes on the next pass in turn that covers it and has a meal of that type left – so four dishes and
 * four passes use one meal from each. Swaps are never picked by themselves. Returns a pass number
 * (or null) per unit.
 */
export function spreadDishes(
  units: { key: string }[],
  passes: { number: number; left: MealsLeft; options: { key: string; part: number; swap: boolean }[] }[],
): (number | null)[] {
  const left = passes.map((p) => [...p.left]);
  let next = 0;
  return units.map((u) => {
    for (let k = 0; k < passes.length; k++) {
      const i = (next + k) % passes.length;
      const o = passes[i].options.find((x) => x.key === u.key && !x.swap);
      if (o && left[i][o.part] > 0) {
        left[i][o.part]--;
        next = i + 1;
        return passes[i].number;
      }
    }
    return null;
  });
}

/** A meal already taken off a pass on an order whose prices are being edited. */
export type UsedMeal = {
  id: string;
  menuItemId: string | null;
  /** the limit of the meal type it was counted as */
  capPaise: number;
  coveredPaise: number;
};

/**
 * After an order's dish prices are edited: what each pass meal on it now covers – the dish's new
 * price without add-ons (the dearest line of that dish), up to the meal type's limit. Every covered
 * dish must still be on the order as many times as the pass paid for it.
 */
export function recoverMeals(
  uses: UsedMeal[],
  dishes: { menuItemId: string; quantity: number; dishPaise: number }[],
):
  | { ok: true; covers: { id: string; coverPaise: number }[] }
  | { ok: false; menuItemId: string; meals: number } {
  const units = new Map<string, number>();
  const price = new Map<string, number>();
  for (const d of dishes) {
    units.set(d.menuItemId, (units.get(d.menuItemId) ?? 0) + d.quantity);
    price.set(d.menuItemId, Math.max(price.get(d.menuItemId) ?? 0, d.dishPaise));
  }
  const need = new Map<string, number>();
  for (const u of uses) if (u.menuItemId) need.set(u.menuItemId, (need.get(u.menuItemId) ?? 0) + 1);
  for (const [id, n] of need) if ((units.get(id) ?? 0) < n) return { ok: false, menuItemId: id, meals: n };
  return {
    ok: true,
    covers: uses.map((u) => {
      // a meal with no dish link (old data) keeps what it covered
      if (!u.menuItemId) return { id: u.id, coverPaise: u.coveredPaise };
      return { id: u.id, coverPaise: Math.max(0, Math.min(price.get(u.menuItemId)!, u.capPaise)) };
    }),
  };
}
