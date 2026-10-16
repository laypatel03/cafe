import { describe, expect, it } from "vitest";

import { clampPage, pageNumbers, rangeLabel, resolvePerPage } from "@/lib/paging";

describe("paging", () => {
  it("shows every page when there are few", () => {
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses long runs around the current page", () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, 3, 4, "…", 20]);
    expect(pageNumbers(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
    expect(pageNumbers(20, 20)).toEqual([1, "…", 17, 18, 19, 20]);
  });

  it("keeps the page inside the range", () => {
    expect(clampPage(9, 25, 10)).toEqual({ pages: 3, page: 3 });
    expect(clampPage(0, 0, 10)).toEqual({ pages: 1, page: 1 });
  });

  it("accepts only offered page sizes", () => {
    expect(resolvePerPage("25", 10)).toBe(25);
    expect(resolvePerPage("7", 10)).toBe(10);
    expect(resolvePerPage(undefined, 20)).toBe(20);
  });

  it("labels the range shown", () => {
    expect(rangeLabel(2, 10, 134)).toBe("11–20 of 134");
    expect(rangeLabel(14, 10, 134)).toBe("131–134 of 134");
    expect(rangeLabel(1, 10, 0)).toBe("0 of 0");
  });
});
