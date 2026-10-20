import { describe, expect, it } from "vitest";

import { CustomLinesSchema, customRows, orderRows } from "@/lib/custom-lines";

const tea = {
  menuItemId: "tea",
  itemName: "Tea",
  addOns: [],
  unitPricePaise: 9900,
  quantity: 2,
  lineTotalPaise: 19800,
};

describe("other items", () => {
  it("takes a plus or minus price in rupees", () => {
    const parsed = CustomLinesSchema.parse([
      { name: " Birthday candle ", unitPrice: 20, quantity: 1 },
      { name: "Discount", unitPrice: -50.5, quantity: 1 },
    ]);
    expect(customRows(parsed)).toEqual([
      expect.objectContaining({
        menuItemId: null,
        itemName: "Birthday candle",
        lineTotalPaise: 2000,
        custom: true,
      }),
      expect.objectContaining({ itemName: "Discount", unitPricePaise: -5050, lineTotalPaise: -5050 }),
    ]);
  });

  it("refuses a zero price, a missing name or a huge amount", () => {
    expect(CustomLinesSchema.safeParse([{ name: "Discount", unitPrice: 0, quantity: 1 }]).success).toBe(
      false,
    );
    expect(CustomLinesSchema.safeParse([{ name: " ", unitPrice: 10, quantity: 1 }]).success).toBe(false);
    expect(CustomLinesSchema.safeParse([{ name: "Cake", unitPrice: 200_000, quantity: 1 }]).success).toBe(
      false,
    );
  });

  it("adds other items to the dishes but never below ₹0", () => {
    const discount = customRows(CustomLinesSchema.parse([{ name: "Discount", unitPrice: -50, quantity: 1 }]));
    const res = orderRows([tea], discount);
    expect(res).toEqual({ ok: true, rows: [{ ...tea, custom: false }, ...discount], subtotalPaise: 14800 });

    const big = customRows(CustomLinesSchema.parse([{ name: "Discount", unitPrice: -500, quantity: 1 }]));
    expect(orderRows([tea], big).ok).toBe(false);
    expect(orderRows([], []).ok).toBe(false);
    expect(
      orderRows([], customRows(CustomLinesSchema.parse([{ name: "Cake", unitPrice: 300, quantity: 1 }]))).ok,
    ).toBe(true);
  });
});
