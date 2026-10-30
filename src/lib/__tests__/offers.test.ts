import { describe, expect, it } from "vitest";

import type { MenuItem } from "@/lib/menu-types";
import { applyOffers, offerEndsLabel, offerPrice, offersOn } from "@/lib/offers";

const row = (menuItemId: string, pricePaise: number, startsOn: string, endsOn: string, title = "") => ({
  menuItemId,
  pricePaise,
  title,
  startsOn,
  endsOn,
});

describe("offersOn", () => {
  it("keeps offers running on the day, both ends included", () => {
    const rows = [
      row("a", 9900, "2026-10-29", "2026-10-29"),
      row("b", 5000, "2026-10-27", "2026-10-28"),
      row("c", 5000, "2026-10-30", "2026-10-31"),
      row("d", 7000, "2026-10-25", "2026-10-29"),
    ];
    expect([...offersOn(rows, "2026-10-29").keys()]).toEqual(["a", "d"]);
  });

  it("takes the lowest price when two offers overlap", () => {
    const rows = [
      row("a", 9900, "2026-10-29", "2026-10-30", "First"),
      row("a", 8900, "2026-10-29", "2026-10-29", "Low"),
    ];
    expect(offersOn(rows, "2026-10-29").get("a")).toEqual({
      pricePaise: 8900,
      title: "Low",
      endsOn: "2026-10-29",
    });
  });
});

describe("offerPrice", () => {
  it("never charges more than the regular price", () => {
    expect(offerPrice(14900, { pricePaise: 9900, title: "", endsOn: "" })).toBe(9900);
    expect(offerPrice(8000, { pricePaise: 9900, title: "", endsOn: "" })).toBe(8000);
    expect(offerPrice(8000, undefined)).toBe(8000);
  });
});

describe("applyOffers", () => {
  const item = (id: string, price: number) => ({ id, price, name: id }) as MenuItem;

  it("sets the offer price and keeps the regular one as wasPrice", () => {
    const active = new Map([["a", { pricePaise: 9900, title: "Today's deal", endsOn: "2026-10-29" }]]);
    const [a, b] = applyOffers([item("a", 149), item("b", 99)], active);
    expect(a).toMatchObject({
      price: 99,
      wasPrice: 149,
      offer: { title: "Today's deal", endsOn: "2026-10-29" },
    });
    expect(b).toEqual(item("b", 99));
  });

  it("ignores an offer that isn't lower than the menu price", () => {
    const active = new Map([["a", { pricePaise: 15000, title: "", endsOn: "2026-10-29" }]]);
    expect(applyOffers([item("a", 149)], active)[0]).toEqual(item("a", 149));
  });
});

describe("offerEndsLabel", () => {
  it("says when the offer ends", () => {
    expect(offerEndsLabel("2026-10-29", "2026-10-29")).toBe("Today only");
    expect(offerEndsLabel("2026-10-30", "2026-10-29")).toBe("Till tomorrow");
    expect(offerEndsLabel("2026-11-03", "2026-10-29")).toBe("Till 3 Nov");
    expect(offerEndsLabel("2026-11-01", "2026-10-31")).toBe("Till tomorrow");
    expect(offerEndsLabel("2026-11-02", "2026-10-31")).toBe("Till 2 Nov");
  });
});
