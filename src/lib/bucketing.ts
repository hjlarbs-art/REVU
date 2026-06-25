import type { Review } from "@/types/review";
import { recencyWeight } from "@/lib/scoring";

const TARGETS = { positive: 5, mixed: 3.5, negative: 1.5 } as const;

/** Returns >0 if `a` is a better representative for `target` than `b`. */
function compareForTarget(
  a: Review,
  b: Review,
  target: number,
  now: Date,
): number {
  const da = Math.abs(a.rating - target);
  const db = Math.abs(b.rating - target);
  if (da !== db) return da < db ? 1 : -1; // closer to target wins

  const wa = recencyWeight(a.date, now);
  const wb = recencyWeight(b.date, now);
  if (wa !== wb) return wa > wb ? 1 : -1; // more recent wins

  if (a.text.length !== b.text.length) {
    return a.text.length > b.text.length ? 1 : -1; // more substantive wins
  }
  return 0;
}

function pickFor(reviews: Review[], target: number, now: Date): Review {
  return reviews.reduce((best, r) =>
    compareForTarget(r, best, target, now) > 0 ? r : best,
  );
}

/**
 * Picks one representative review per bucket: best case / typical / worst case.
 * Closeness to the bucket's target rating is primary; ties break toward more
 * recent, then more substantive (longer) reviews. Assumes at least one review.
 */
export function selectBuckets(
  reviews: Review[],
  now: Date = new Date(),
): { positive: Review; mixed: Review; negative: Review } {
  return {
    positive: pickFor(reviews, TARGETS.positive, now),
    mixed: pickFor(reviews, TARGETS.mixed, now),
    negative: pickFor(reviews, TARGETS.negative, now),
  };
}
