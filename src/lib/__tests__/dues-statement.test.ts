import { describe, expect, it } from "vitest";

import { statementGroups } from "@/lib/dues-statement";

const item = (itemName: string, unitPricePaise: number, quantity = 1) => ({
  itemName,
  unitPricePaise,
  quantity,
  addOns: [],
});

describe("dues statement", () => {
  it("groups a bill's orders together, keeps unbilled orders apart, oldest first", () => {
    const { groups, totalPaise } = statementGroups([
      {
        number: 41,
        createdAt: new Date("2026-10-20T10:00:00Z"),
        totalPaise: 9900,
        items: [item("Sprouts chaat", 9900)],
        bill: null,
      },
      {
        number: 30,
        createdAt: new Date("2026-10-12T09:00:00Z"),
        totalPaise: 15000,
        items: [item("Paneer wrap", 15000)],
        bill: { number: 12, createdAt: new Date("2026-10-12T09:30:00Z") },
      },
      {
        number: 31,
        createdAt: new Date("2026-10-12T09:10:00Z"),
        totalPaise: 30000,
        items: [item("Paneer wrap", 15000, 2)],
        bill: { number: 12, createdAt: new Date("2026-10-12T09:30:00Z") },
      },
    ]);
    expect(totalPaise).toBe(54900);
    expect(groups.map((g) => [g.label, g.amountPaise, g.orderNumbers])).toEqual([
      ["Bill #12", 45000, [30, 31]],
      ["Order #41", 9900, [41]],
    ]);
    expect(groups[0].lines).toEqual([
      { name: "Paneer wrap", addOns: [], unitPricePaise: 15000, quantity: 3, amountPaise: 45000 },
    ]);
  });

  it("is empty when nothing is owed", () => {
    expect(statementGroups([])).toEqual({ groups: [], totalPaise: 0 });
  });
});
