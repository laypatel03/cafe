import { describe, expect, it } from "vitest";

import { statementGroups, withShortBills } from "@/lib/dues-statement";

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

describe("withShortBills", () => {
  const r = (p: number) => `₹${p / 100}`;
  const item = (name: string, paise: number) => ({
    itemName: name,
    unitPricePaise: paise,
    quantity: 1,
    addOns: [],
  });
  it("adds what's left of short bills by date, plus a hand-entered balance", () => {
    const base = statementGroups([
      {
        number: 7,
        createdAt: new Date(2026, 10, 3),
        totalPaise: 26900,
        items: [item("Bowl", 26900)],
        bill: { number: 5, createdAt: new Date(2026, 10, 3) },
      },
    ]);
    const out = withShortBills(
      base,
      [
        {
          number: 4,
          createdAt: new Date(2026, 10, 2),
          totalPaise: 14900,
          paidPaise: 900,
          leftPaise: 14000,
          orderNumbers: [6],
          items: [item("Soy", 14900)],
        },
      ],
      5000,
      r,
    );
    expect(out.groups.map((g) => [g.label, g.amountPaise, g.note ?? ""])).toEqual([
      ["Earlier balance", 5000, ""],
      ["Bill #4", 14000, "Paid ₹9 of ₹149 – rest still to pay"],
      ["Bill #5", 26900, ""],
    ]);
    expect(out.totalPaise).toBe(5000 + 14000 + 26900);
  });
});
