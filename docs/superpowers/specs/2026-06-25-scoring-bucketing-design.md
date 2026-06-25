# Recency-Weighted Scoring + Bucketing — Design Spec

**Date:** 2026-06-25
**Feature:** REVU build phase 4 — compute the blended (recency-weighted) rating, raw average, and representative review buckets from real review data instead of hardcoded mock values.
**Status:** Approved, pending implementation plan.

## Summary

Implement the two pure-logic modules the REVU spec calls "the actual product
value": `scoring.ts` (recency-weighted blended rating + raw average) and
`bucketing.ts` (best / typical / worst representative review selection). Wire
them into `mock.ts` so `buildMockResult` computes `blendedRating`, `rawAverage`,
and `buckets` from the surfaced reviews rather than hardcoding them.

Both modules are pure and operate only on `Review[]`, so they are independently
unit-testable and will work unchanged when real Apify data replaces the mock
(phase 3).

## Design decisions (approved)

- **Scoring basis:** both `blendedRating` and `rawAverage` are computed from the
  surfaced individual reviews (each has a date), making the two numbers an
  apples-to-apples comparison over the same set.
- **`perSource` is unchanged:** it stays as the platforms' own reported
  aggregates (e.g. Google 4.3 / 412). These are realistic platform-level numbers
  independent of the handful of reviews we surface.
- **Recency half-life:** 12 months (365 days).
- **Bucket target ratings:** positive → 5, mixed → 3.5, negative → 1.5.

## Scope

### In scope

- `src/lib/scoring.ts`: `recencyWeight` and `scoreReviews`.
- `src/lib/bucketing.ts`: `selectBuckets`.
- Wire both into `src/lib/mock.ts` `buildMockResult`.
- Unit tests for scoring and bucketing.

### Out of scope

- No UI changes — the results page already renders whatever `/api/search`
  returns.
- No changes to `perSource`, the `Review`/`BusinessResult` types, or the API
  route shape.
- No Apify wiring (phase 3) and no normalize layer (phase 2).

## Modules & interfaces

### `src/lib/scoring.ts`

```ts
import type { Review } from "@/types/review";

// Exponential decay weight for a review's age. A review exactly halfLifeDays old
// has weight 0.5; brand-new ≈ 1.0. now/halfLifeDays injectable for determinism.
export function recencyWeight(
  date: string,
  now?: Date,
  halfLifeDays?: number, // default 365
): number;

// blendedRating: recency-weighted mean of ratings.
// rawAverage: simple arithmetic mean of ratings.
// Both rounded to one decimal. Empty input returns { blendedRating: 0, rawAverage: 0 }.
export function scoreReviews(
  reviews: Review[],
  now?: Date,
): { blendedRating: number; rawAverage: number };
```

- `recencyWeight` = `0.5 ** (ageDays / halfLifeDays)`, where
  `ageDays = (now - date) / 86_400_000`. Future-dated or zero-age reviews weight
  ~1.0. Negative ages (future dates) are clamped to age 0 so weight never
  exceeds 1.
- `scoreReviews` weighted mean: `Σ(weight_i · rating_i) / Σ(weight_i)`. If the
  weight sum is 0 (only possible with empty input), return zeros.

### `src/lib/bucketing.ts`

```ts
import type { Review } from "@/types/review";

// Selects one representative review per bucket: best case / typical / worst case.
// Candidates are scored by closeness to a target rating (5 / 3.5 / 1.5), with
// ties broken toward more recent and more substantive (longer text) reviews.
export function selectBuckets(
  reviews: Review[],
  now?: Date,
): { positive: Review; mixed: Review; negative: Review };
```

- For each bucket, score every review with a composite:
  `score = -|rating - target|` as the primary key (closer to target wins),
  then prefer higher `recencyWeight(date, now)` and longer `text.length` to
  break ties. Pick the max-scoring review per bucket.
- A review may win more than one bucket only when the pool has fewer than three
  distinct candidates (not possible with the 8-entry mock). Documented and
  acceptable for MVP.
- Assumes at least one review (the `/api/search` route already returns the empty
  state for zero reviews, so `selectBuckets` is never called with `[]`).

### `src/lib/mock.ts` (integration)

In `buildMockResult`, replace the hardcoded values:

- Remove the hand-picked `positive`/`mixed`/`negative` `find` lines and the
  literals `blendedRating: 3.9`, `rawAverage: 3.5`.
- Compute `const { blendedRating, rawAverage } = scoreReviews(reviews);` and
  `const buckets = selectBuckets(reviews);`.
- `perSource` and everything else stay the same.

## Data flow

```
buildMockResult(query, loc)
  reviews = MOCK_REVIEWS
  { blendedRating, rawAverage } = scoreReviews(reviews)   ← scoring.ts
  buckets = selectBuckets(reviews)                        ← bucketing.ts
  → SearchResult { business: { ...perSource (unchanged), blendedRating,
      rawAverage, buckets }, reviews }
```

## Error & edge handling

- Empty review list: `scoreReviews([])` → `{ blendedRating: 0, rawAverage: 0 }`;
  `selectBuckets` is not called for empty input (route short-circuits).
- Future-dated reviews: age clamped to 0, weight capped at 1.0.
- All ratings rounded to one decimal for display stability.

## Testing

`tests/scoring.test.ts`:
- `recencyWeight`: a review aged exactly 365 days (relative to an injected
  `now`) ≈ 0.5; a brand-new review ≈ 1.0; an older review weighs less than a
  newer one.
- `scoreReviews`: `rawAverage` equals the plain mean; `blendedRating` pulls
  toward recent reviews — e.g. a fresh 2★ among stale 5★ yields blended < raw;
  empty input returns zeros.

`tests/bucketing.test.ts`:
- `selectBuckets` picks the highest-rated review for `positive`, a mid review
  for `mixed`, and the lowest for `negative`.
- On two equally on-target candidates, the more recent (and longer) one wins.

Determinism: every test injects a fixed `now` Date so results never depend on
wall-clock time.

## Open questions

None. Half-life (365 days) and bucket targets (5 / 3.5 / 1.5) confirmed.
