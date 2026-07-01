import type { Review } from "@/types/review";

const DAY_MS = 86_400_000;
const DEFAULT_HALF_LIFE_DAYS = 365;

/**
 * Exponential decay weight for a review's age. A review exactly halfLifeDays old
 * weighs 0.5; a brand-new review ≈ 1.0. Future-dated reviews are clamped to age 0
 * so the weight never exceeds 1.
 */
export function recencyWeight(
  date: string,
  now: Date = new Date(),
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): number {
  const ageDays = Math.max(
    0,
    (now.getTime() - new Date(date).getTime()) / DAY_MS,
  );
  return 0.5 ** (ageDays / halfLifeDays);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * blendedRating: recency-weighted mean of ratings.
 * rawAverage: simple arithmetic mean. Both rounded to one decimal.
 * Empty input returns zeros.
 */
export function scoreReviews(
  reviews: Review[],
  now: Date = new Date(),
): { blendedRating: number; rawAverage: number } {
  if (reviews.length === 0) return { blendedRating: 0, rawAverage: 0 };

  const rawAverage =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  let weightSum = 0;
  let weightedRatingSum = 0;
  for (const r of reviews) {
    const w = recencyWeight(r.date, now);
    weightSum += w;
    weightedRatingSum += w * r.rating;
  }
  const blendedRating = weightSum === 0 ? 0 : weightedRatingSum / weightSum;

  return { blendedRating: round1(blendedRating), rawAverage: round1(rawAverage) };
}
