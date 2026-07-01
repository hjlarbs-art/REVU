import { describe, expect, it } from "vitest";
import { selectBuckets } from "@/lib/bucketing";
import type { Review } from "@/types/review";

const NOW = new Date("2026-06-25T00:00:00Z");

function review(rating: number, date: string, text = "a review"): Review {
  return { source: "google", author: "A", rating, text, date };
}

describe("selectBuckets", () => {
  it("picks highest for positive, lowest for negative, mid for mixed", () => {
    const reviews = [
      review(5, "2026-06-01T00:00:00Z"),
      review(4, "2026-06-01T00:00:00Z"),
      review(3, "2026-06-01T00:00:00Z"),
      review(1, "2026-06-01T00:00:00Z"),
    ];
    const { positive, mixed, negative } = selectBuckets(reviews, NOW);
    expect(positive.rating).toBe(5);
    expect(negative.rating).toBe(1);
    // target 3.5: ratings 4 and 3 are equidistant — one of them wins
    expect([3, 4]).toContain(mixed.rating);
  });

  it("breaks ties toward the more recent review", () => {
    const recent = review(5, "2026-06-20T00:00:00Z", "recent");
    const stale = review(5, "2020-01-01T00:00:00Z", "stale");
    const { positive } = selectBuckets([stale, recent], NOW);
    expect(positive.date).toBe("2026-06-20T00:00:00Z");
  });

  it("breaks remaining ties toward the longer (more substantive) review", () => {
    const shortR = review(5, "2026-06-20T00:00:00Z", "short");
    const longR = review(
      5,
      "2026-06-20T00:00:00Z",
      "a much longer more substantive review",
    );
    const { positive } = selectBuckets([shortR, longR], NOW);
    expect(positive.text).toBe("a much longer more substantive review");
  });
});
