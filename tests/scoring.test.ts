import { describe, expect, it } from "vitest";
import { recencyWeight, scoreReviews } from "@/lib/scoring";
import type { Review } from "@/types/review";

const NOW = new Date("2026-06-25T00:00:00Z");

function review(rating: number, date: string, text = "x"): Review {
  return { source: "google", author: "A", rating, text, date };
}

describe("recencyWeight", () => {
  it("is ~1.0 for a brand-new review", () => {
    expect(recencyWeight("2026-06-25T00:00:00Z", NOW)).toBeCloseTo(1, 5);
  });

  it("is ~0.5 for a review aged one half-life (365 days)", () => {
    expect(recencyWeight("2025-06-25T00:00:00Z", NOW)).toBeCloseTo(0.5, 2);
  });

  it("gives older reviews less weight than newer ones", () => {
    const older = recencyWeight("2024-06-25T00:00:00Z", NOW);
    const newer = recencyWeight("2026-01-01T00:00:00Z", NOW);
    expect(newer).toBeGreaterThan(older);
  });

  it("caps weight at 1.0 for future-dated reviews", () => {
    expect(recencyWeight("2027-06-25T00:00:00Z", NOW)).toBeCloseTo(1, 5);
  });
});

describe("scoreReviews", () => {
  it("rawAverage is the plain arithmetic mean", () => {
    const r = [
      review(2, "2026-06-25T00:00:00Z"),
      review(4, "2026-06-25T00:00:00Z"),
    ];
    expect(scoreReviews(r, NOW).rawAverage).toBe(3);
  });

  it("blendedRating pulls toward recent reviews", () => {
    const r = [
      review(2, "2026-06-25T00:00:00Z"), // fresh, low
      review(5, "2021-06-25T00:00:00Z"), // very stale, high
    ];
    const { blendedRating, rawAverage } = scoreReviews(r, NOW);
    expect(rawAverage).toBe(3.5);
    expect(blendedRating).toBeLessThan(rawAverage);
  });

  it("returns zeros for empty input", () => {
    expect(scoreReviews([], NOW)).toEqual({ blendedRating: 0, rawAverage: 0 });
  });
});
