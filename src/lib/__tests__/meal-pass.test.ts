import { describe, expect, it } from "vitest";

import {
  checkPicks,
  type DishLine,
  mealOptions,
  mealsLeft,
  mealsSummary,
  passEndsOn,
  type PassRules,
  passStatus,
  readParts,
} from "@/lib/meal-pass";

const rules: PassRules = {
  parts: [
    { name: "Bowl", meals: 26, categoryIds: ["bowls", "salads"], capPaise: 19900 },
    { name: "Smoothie", meals: 26, categoryIds: ["smoothies"], capPaise: 15900 },
  ],
};
const FULL = [5, 5];
const line = (p: Partial<DishLine>): DishLine => ({
  orderId: "o1",
  menuItemId: "m1",
  categoryId: "bowls",
  name: "Paneer bowl",
  quantity: 1,
  dishPaise: 17900,
  ...p,
});

describe("passEndsOn", () => {
  it("counts the first day, across month ends", () => {
    expect(passEndsOn("2026-10-30", 30)).toBe("2026-11-28");
    expect(passEndsOn("2026-10-30", 1)).toBe("2026-10-30");
  });
});

describe("readParts and mealsSummary", () => {
  it("keeps well-formed meal types only", () => {
    expect(readParts([{ name: "Toast", meals: 4, categoryIds: ["t"], capPaise: 100 }, { name: 1 }])).toEqual([
      { name: "Toast", meals: 4, categoryIds: ["t"], capPaise: 100 },
    ]);
    expect(readParts(null)).toEqual([]);
  });

  it("names counts per type, skipping zeros", () => {
    expect(mealsSummary(rules.parts, [2, 1])).toBe("2 bowls + 1 smoothie");
    expect(mealsSummary([{ name: "Toast" }, { name: "Juice" }], [0, 3])).toBe("3 juices");
    expect(mealsSummary([{ name: "Toast" }], [0])).toBe("none");
  });
});

describe("mealsLeft and passStatus", () => {
  const pass = {
    parts: [
      { ...rules.parts[0], meals: 2 },
      { ...rules.parts[1], meals: 1 },
    ],
    startsOn: "2026-10-30",
    endsOn: "2026-11-28",
    refunded: false,
  };

  it("subtracts uses per meal type, never below zero", () => {
    expect(mealsLeft(pass, [{ part: 0 }, { part: 0 }, { part: 0 }])).toEqual([0, 1]);
  });

  it("is active, used up, lapsed, upcoming or refunded", () => {
    expect(passStatus(pass, [1, 0], "2026-10-30")).toBe("active");
    expect(passStatus(pass, [0, 0], "2026-11-01")).toBe("used up");
    expect(passStatus(pass, [2, 1], "2026-11-29")).toBe("lapsed");
    expect(passStatus(pass, [2, 1], "2026-10-29")).toBe("upcoming");
    expect(passStatus({ ...pass, refunded: true }, [2, 1], "2026-10-30")).toBe("refunded");
  });
});

describe("mealOptions", () => {
  it("covers dishes in each meal type's categories up to its cap", () => {
    const opts = mealOptions(
      rules,
      FULL,
      [
        line({}),
        line({ menuItemId: "m2", name: "Big bowl", dishPaise: 26900 }),
        line({ menuItemId: "s1", categoryId: "smoothies", name: "Mango smoothie", dishPaise: 12900 }),
        line({ menuItemId: "t1", categoryId: "toasts", name: "Toast", dishPaise: 12900 }),
      ],
      new Map(),
    );
    expect(opts.map((o) => [o.name, o.partName, o.coverPaise])).toEqual([
      ["Paneer bowl", "Bowl", 17900],
      ["Big bowl", "Bowl", 19900],
      ["Mango smoothie", "Smoothie", 12900],
    ]);
  });

  it("works with any number of meal types", () => {
    const three: PassRules = {
      parts: [...rules.parts, { name: "Toast", meals: 4, categoryIds: ["toasts"], capPaise: 9900 }],
    };
    const opts = mealOptions(three, [5, 5, 4], [line({ categoryId: "toasts", name: "Toast" })], new Map());
    expect(opts).toMatchObject([{ part: 2, partName: "Toast", coverPaise: 9900, swap: false }]);
  });

  it("uses another meal type sharing the category once one runs out", () => {
    const shared: PassRules = {
      parts: [
        { name: "Lunch", meals: 1, categoryIds: ["bowls"], capPaise: 19900 },
        { name: "Dinner", meals: 1, categoryIds: ["bowls"], capPaise: 19900 },
      ],
    };
    expect(mealOptions(shared, [1, 1], [line({})], new Map())[0].partName).toBe("Lunch");
    expect(mealOptions(shared, [0, 1], [line({})], new Map())[0].partName).toBe("Dinner");
  });

  it("offers swaps: none by default, within the cap for staff, any for the owner", () => {
    const lines = [
      line({ menuItemId: "t1", categoryId: "toasts", name: "Toast", dishPaise: 17900 }),
      line({ menuItemId: "t2", categoryId: "toasts", name: "Big toast", dishPaise: 24900 }),
    ];
    expect(mealOptions(rules, FULL, lines, new Map())).toEqual([]);
    expect(
      mealOptions(rules, FULL, lines, new Map(), "within cap").map((o) => [
        o.name,
        o.partName,
        o.coverPaise,
        o.swap,
      ]),
    ).toEqual([["Toast", "Bowl", 17900, true]]);
    expect(mealOptions(rules, FULL, lines, new Map(), "any").map((o) => [o.name, o.coverPaise])).toEqual([
      ["Toast", 17900],
      ["Big toast", 19900],
    ]);
  });

  it("swaps use the first meal type with meals left", () => {
    const opts = mealOptions(
      rules,
      [0, 3],
      [line({ categoryId: "drinks", dishPaise: 9900 })],
      new Map(),
      "any",
    );
    expect(opts).toMatchObject([{ partName: "Smoothie", swap: true, coverPaise: 9900 }]);
  });

  it("leaves out units already covered", () => {
    const covered = new Map([["o1:m1", 1]]);
    expect(mealOptions(rules, FULL, [line({ quantity: 2 })], covered)[0].units).toBe(1);
    expect(mealOptions(rules, FULL, [line({})], covered)).toEqual([]);
  });

  it("adds up the same dish on one order", () => {
    const opts = mealOptions(
      rules,
      FULL,
      [line({ quantity: 1 }), line({ quantity: 2, dishPaise: 15900 })],
      new Map(),
    );
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ units: 3, coverPaise: 17900 });
  });
});

describe("checkPicks", () => {
  const options = mealOptions(
    rules,
    FULL,
    [
      line({ quantity: 2 }),
      line({ menuItemId: "s1", categoryId: "smoothies", name: "Smoothie", dishPaise: 12900 }),
    ],
    new Map(),
  );

  it("turns picks into one use per dish", () => {
    const res = checkPicks(
      [
        { orderId: "o1", menuItemId: "m1", count: 2 },
        { orderId: "o1", menuItemId: "s1", count: 1 },
      ],
      options,
      FULL,
    );
    expect(res.ok && res.uses.map((u) => u.partName)).toEqual(["Bowl", "Bowl", "Smoothie"]);
  });

  it("refuses more than is on the order or left on the pass", () => {
    expect(checkPicks([{ orderId: "o1", menuItemId: "m1", count: 3 }], options, FULL)).toEqual({
      ok: false,
      error: "Only 2 × Paneer bowl can use the pass.",
    });
    expect(checkPicks([{ orderId: "o1", menuItemId: "m1", count: 2 }], options, [1, 5])).toEqual({
      ok: false,
      error: "Only 1 bowl left on the pass.",
    });
    expect(checkPicks([{ orderId: "o2", menuItemId: "m1", count: 1 }], options, FULL).ok).toBe(false);
    expect(checkPicks([], options, FULL).ok).toBe(false);
  });
});
