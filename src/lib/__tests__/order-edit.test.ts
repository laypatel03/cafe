import { describe, expect, it } from "vitest";

import {
  customerTotals,
  fromCafeInput,
  type KeptLine,
  lineKey,
  priceEditedLines,
  toCafeInput,
} from "@/lib/order-edit";
import type { MenuItemPrice } from "@/lib/pricing";
import { DeleteOrderSchema, EditOrderSchema, PastOrderSchema } from "@/lib/validators/order-edit";

const menu = new Map<string, MenuItemPrice>([
  [
    "salad",
    {
      name: "Chatpata Salad",
      pricePaise: 26900, // the price went up since
      available: false, // and it's sold out today
      addOns: new Map([["paneer", { name: "Extra paneer", pricePaise: 5000, available: false }]]),
    },
  ],
  ["tea", { name: "Lemon Iced Tea", pricePaise: 9900, available: true, addOns: new Map() }],
]);

describe("priceEditedLines", () => {
  it("keeps the price the guest paid for lines already on the order", () => {
    const kept = new Map<string, KeptLine>([
      [
        lineKey("salad", ["paneer"]),
        {
          itemName: "Chatpata Salad",
          unitPricePaise: 29900,
          addOns: [{ id: "paneer", name: "Extra paneer", pricePaise: 5000 }],
        },
      ],
    ]);
    const res = priceEditedLines([{ itemId: "salad", addOnIds: ["paneer"], quantity: 3 }], menu, kept);
    expect(res).toMatchObject({ ok: true, subtotalPaise: 89700 });
  });

  it("prices new lines from today's menu, even if sold out now", () => {
    const res = priceEditedLines(
      [
        { itemId: "salad", addOnIds: ["paneer"], quantity: 1 },
        { itemId: "tea", addOnIds: [], quantity: 2 },
      ],
      menu,
    );
    expect(res).toMatchObject({ ok: true, subtotalPaise: 26900 + 5000 + 2 * 9900 });
  });

  it("matches kept lines whatever order the add-ons are in", () => {
    expect(lineKey("x", ["b", "a"])).toBe(lineKey("x", ["a", "b"]));
  });

  it("rejects items no longer on the menu, bad quantities and an empty list", () => {
    expect(priceEditedLines([{ itemId: "gone", addOnIds: [], quantity: 1 }], menu)).toMatchObject({
      ok: false,
    });
    expect(priceEditedLines([{ itemId: "tea", addOnIds: [], quantity: 0 }], menu)).toMatchObject({
      ok: false,
    });
    expect(priceEditedLines([], menu)).toMatchObject({ ok: false });
  });
});

describe("typed prices", () => {
  it("a typed price wins over the kept and the menu price", () => {
    const kept = new Map<string, KeptLine>([
      [lineKey("tea", []), { itemName: "Lemon Iced Tea", unitPricePaise: 9900, addOns: [] }],
    ]);
    const res = priceEditedLines(
      [
        { itemId: "tea", addOnIds: [], quantity: 2, unitPricePaise: 5000 },
        { itemId: "salad", addOnIds: [], quantity: 1, unitPricePaise: 0 },
      ],
      menu,
      kept,
    );
    expect(res).toMatchObject({ ok: true, subtotalPaise: 10000 });
  });

  it("rejects negative or huge prices", () => {
    expect(
      priceEditedLines([{ itemId: "tea", addOnIds: [], quantity: 1, unitPricePaise: -1 }], menu),
    ).toMatchObject({ ok: false });
    expect(
      priceEditedLines([{ itemId: "tea", addOnIds: [], quantity: 1, unitPricePaise: 10_000_001 }], menu),
    ).toMatchObject({ ok: false });
  });

  it("turns typed rupees into paise in the form", () => {
    const res = EditOrderSchema.safeParse({
      when: "2026-01-05T13:15",
      takeaway: false,
      name: "Riya",
      phone: "",
      orderId: "o1",
      items: [{ itemId: "tea", addOnIds: [], quantity: 1, unitPrice: 49.5 }],
    });
    expect(res.success && res.data.items[0]).toMatchObject({ unitPricePaise: 4950 });
  });

  it("needs a reason to delete", () => {
    expect(DeleteOrderSchema.safeParse({ orderId: "o1", reason: " " }).success).toBe(false);
    expect(DeleteOrderSchema.safeParse({ orderId: "o1", reason: "Test order" }).success).toBe(true);
  });
});

describe("café time", () => {
  it("reads and writes datetime-local values in IST", () => {
    const d = fromCafeInput("2026-10-01T01:30")!;
    expect(d.toISOString()).toBe("2026-09-30T20:00:00.000Z");
    expect(toCafeInput(d)).toBe("2026-10-01T01:30");
  });

  it("rejects dates that don't exist", () => {
    expect(fromCafeInput("2026-02-30T10:00")).toBeNull();
    expect(fromCafeInput("2026-10-01T24:00")).toBeNull();
    expect(fromCafeInput("yesterday")).toBeNull();
  });
});

describe("customerTotals", () => {
  const at = (s: string) => new Date(s);
  it("counts one visit per bill and the spend on bills made out to them", () => {
    const t = customerTotals("c1", [
      {
        totalPaise: 50000,
        paidAt: at("2026-10-02T10:00:00Z"),
        customerPhone: "9800000001",
        orders: [{ customerId: "c1", customerPhone: "9800000001" }],
      },
      {
        // shared table, bill made out to a friend: a visit, but not their spend
        totalPaise: 80000,
        paidAt: at("2026-10-05T10:00:00Z"),
        customerPhone: "9800000002",
        orders: [
          { customerId: "c1", customerPhone: "9800000001" },
          { customerId: "c2", customerPhone: "9800000002" },
        ],
      },
      {
        totalPaise: 99900,
        paidAt: at("2026-10-06T10:00:00Z"),
        customerPhone: "9800000003",
        orders: [{ customerId: "c3", customerPhone: "9800000003" }],
      },
    ]);
    expect(t).toEqual({ orderCount: 2, totalSpendPaise: 50000, lastVisitAt: at("2026-10-05T10:00:00Z") });
  });

  it("is empty with no bills", () => {
    expect(customerTotals("c1", [])).toEqual({ orderCount: 0, totalSpendPaise: 0, lastVisitAt: null });
  });
});

describe("order forms", () => {
  const base = {
    when: "2026-01-05T13:15",
    takeaway: false,
    name: "Riya",
    phone: "+91 98765 43210",
    items: [{ itemId: "tea", addOnIds: [], quantity: 1 }],
  };

  it("cleans the phone and needs a payment method for a past order", () => {
    const ok = PastOrderSchema.safeParse({ ...base, method: "UPI" });
    expect(ok.success && ok.data.phone).toBe("9876543210");
    expect(PastOrderSchema.safeParse(base).success).toBe(false);
  });

  it("allows an empty phone, but not a future time", () => {
    expect(EditOrderSchema.safeParse({ ...base, orderId: "o1", phone: "" }).success).toBe(true);
    expect(
      EditOrderSchema.safeParse({
        ...base,
        orderId: "o1",
        when: toCafeInput(new Date(Date.now() + 3_600_000)),
      }).success,
    ).toBe(false);
  });
});
