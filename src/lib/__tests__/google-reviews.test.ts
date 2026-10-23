import { describe, expect, it } from "vitest";

import { markDishes, parsePlace } from "@/lib/google-reviews";

describe("parsePlace", () => {
  it("maps a Places (New) response to rating, count and reviews", () => {
    const out = parsePlace({
      rating: 4.7,
      userRatingCount: 128,
      googleMapsUri: "https://maps.google.com/?cid=1",
      reviews: [
        {
          rating: 5,
          relativePublishTimeDescription: "a week ago",
          text: { text: "  Great sprouts chaat!  ", languageCode: "en" },
          authorAttribution: {
            displayName: "Asha",
            uri: "https://www.google.com/maps/contrib/1",
            photoUri: "https://lh3.googleusercontent.com/a/x",
          },
        },
      ],
    });
    expect(out).toEqual({
      rating: 4.7,
      count: 128,
      mapsUrl: "https://maps.google.com/?cid=1",
      reviews: [
        {
          author: "Asha",
          authorUrl: "https://www.google.com/maps/contrib/1",
          photo: "https://lh3.googleusercontent.com/a/x",
          rating: 5,
          text: "Great sprouts chaat!",
          when: "a week ago",
        },
      ],
    });
  });

  it("drops star-only reviews, reviews under 4 stars and links that aren't https", () => {
    const out = parsePlace({
      rating: 4,
      userRatingCount: 2,
      googleMapsUri: "javascript:alert(1)",
      reviews: [
        { rating: 4 },
        {
          rating: 4,
          originalText: { text: "Okay" },
          authorAttribution: { displayName: "R", uri: "http://x" },
        },
        { rating: 3, text: { text: "Too salty" } },
      ],
    });
    expect(out.mapsUrl).toBe("");
    expect(out.reviews).toHaveLength(1);
    expect(out.reviews[0]).toMatchObject({ text: "Okay", authorUrl: "", photo: "" });
  });

  it("copes with a place that has no reviews yet", () => {
    expect(parsePlace({})).toEqual({ rating: 0, count: 0, mapsUrl: "", reviews: [] });
  });
});

describe("markDishes", () => {
  const menu = [
    { id: "a", name: "Mexican Rice Bowl" },
    { id: "b", name: "Sote Veg Plate" },
    { id: "c", name: "Tea" },
  ];
  const review = (text: string) => ({ author: "R", authorUrl: "", photo: "", rating: 5, text, when: "" });

  it("marks dish names in any case without changing the text", () => {
    const { reviews, lovedFor } = markDishes(
      [
        review("Food mast, especially Mexican  rice bowl!"),
        review("The sote veg plate and mexican rice bowl"),
      ],
      menu,
    );
    expect(reviews[0].parts).toEqual([
      { text: "Food mast, especially " },
      { text: "Mexican  rice bowl", dish: "a" },
      { text: "!" },
    ]);
    expect(reviews[0].parts.map((p) => p.text).join("")).toBe("Food mast, especially Mexican  rice bowl!");
    expect(reviews[1].dishes.map((d) => d.id)).toEqual(["b", "a"]);
    expect(lovedFor.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("only matches whole words", () => {
    const { reviews, lovedFor } = markDishes([review("Steady team, great tea.")], menu);
    expect(reviews[0].parts.filter((p) => p.dish)).toEqual([{ text: "tea", dish: "c" }]);
    expect(lovedFor).toHaveLength(1);
  });

  it("leaves reviews as one part when no dish is named", () => {
    expect(markDishes([review("Lovely place")], []).reviews[0].parts).toEqual([{ text: "Lovely place" }]);
  });
});
