# Recency-Weighted Scoring + Bucketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute REVU's blended (recency-weighted) rating, raw average, and representative review buckets from the surfaced reviews, replacing the hardcoded mock values.

**Architecture:** Two pure lib modules operating only on `Review[]` — `scoring.ts` (recency decay + weighted/plain means) and `bucketing.ts` (best/typical/worst representative selection, depends on `scoring`) — wired into `buildMockResult` in `mock.ts`. No UI, type, or API-shape changes.

**Tech Stack:** TypeScript (strict), Vitest 4. Path alias `@/*` → `./src/*`.

## Global Constraints

- TypeScript strict mode on — no `any`, all functions typed.
- Path alias `@/*` → `./src/*`.
- Each `/lib` module is pure and independently testable with mock data.
- Scoring basis: both `blendedRating` and `rawAverage` are computed from the surfaced `Review[]` (apples-to-apples).
- `perSource` stays unchanged (platforms' reported aggregates) — do NOT recompute it.
- No changes to `Review`/`BusinessResult` types, the `/api/search` route shape, or any UI component.
- Recency half-life: 365 days. Bucket target ratings: positive 5, mixed 3.5, negative 1.5.
- Ratings rounded to one decimal. `now` is an injectable param (default current time) for deterministic tests; every test injects a fixed `now`.

---

### Task 1: scoring.ts (recencyWeight + scoreReviews)

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `Review` type from `@/types/review`.
- Produces:
  - `recencyWeight(date: string, now?: Date, halfLifeDays?: number): number`
  - `scoreReviews(reviews: Review[], now?: Date): { blendedRating: number; rawAverage: number }`

- [ ] **Step 1: Write the failing test**

Create `tests/scoring.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/scoring.test.ts`
Expected: FAIL — cannot resolve `@/lib/scoring`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/scoring.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/scoring.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/lib/scoring.ts tests/scoring.test.ts
git commit -m "feat: add recency-weighted scoring"
```

---

### Task 2: bucketing.ts (selectBuckets)

**Files:**
- Create: `src/lib/bucketing.ts`
- Test: `tests/bucketing.test.ts`

**Interfaces:**
- Consumes: `Review` type from `@/types/review`; `recencyWeight` from `@/lib/scoring` (Task 1).
- Produces: `selectBuckets(reviews: Review[], now?: Date): { positive: Review; mixed: Review; negative: Review }`.

- [ ] **Step 1: Write the failing test**

Create `tests/bucketing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/bucketing.test.ts`
Expected: FAIL — cannot resolve `@/lib/bucketing`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/bucketing.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/bucketing.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/lib/bucketing.ts tests/bucketing.test.ts
git commit -m "feat: add review bucketing"
```

---

### Task 3: Wire scoring + bucketing into mock.ts

**Files:**
- Modify: `src/lib/mock.ts` (add imports; replace hardcoded values in `buildMockResult`)

**Interfaces:**
- Consumes: `scoreReviews` (Task 1), `selectBuckets` (Task 2).
- Produces: nothing new — `buildMockResult` keeps its existing signature and return type.

- [ ] **Step 1: Add the imports**

At the top of `src/lib/mock.ts`, the existing first import is:

```ts
import type { Review, SearchResult } from "@/types/review";
```

Add these two lines immediately after it:

```ts
import { scoreReviews } from "@/lib/scoring";
import { selectBuckets } from "@/lib/bucketing";
```

- [ ] **Step 2: Replace the hardcoded computation in `buildMockResult`**

Find this block:

```ts
  const reviews = MOCK_REVIEWS;

  // Representative picks for the three buckets (best / typical / worst case).
  const positive = reviews.find((r) => r.rating === 5) ?? reviews[0];
  const mixed = reviews.find((r) => r.rating === 3) ?? reviews[2];
  const negative = reviews.find((r) => r.rating === 1) ?? reviews[5];

  return {
    business: {
      name,
      address,
      blendedRating: 3.9,
      rawAverage: 3.5,
      perSource: [
        { source: "google", rating: 4.3, count: 412 },
        { source: "yelp", rating: 3.4, count: 88 },
        { source: "tripadvisor", rating: 4.1, count: 36 },
      ],
      buckets: { positive, mixed, negative },
    },
    reviews,
  };
```

Replace it with:

```ts
  const reviews = MOCK_REVIEWS;

  // Computed from the surfaced reviews (see lib/scoring.ts, lib/bucketing.ts).
  const { blendedRating, rawAverage } = scoreReviews(reviews);
  const buckets = selectBuckets(reviews);

  return {
    business: {
      name,
      address,
      blendedRating,
      rawAverage,
      // perSource stays as the platforms' own reported aggregates.
      perSource: [
        { source: "google", rating: 4.3, count: 412 },
        { source: "yelp", rating: 3.4, count: 88 },
        { source: "tripadvisor", rating: 4.1, count: 36 },
      ],
      buckets,
    },
    reviews,
  };
```

- [ ] **Step 3: Verify types and build**

Run: `cd /Users/harrylarbalestier/revu && npx tsc --noEmit && npm run build`
Expected: type check clean; build succeeds.

- [ ] **Step 4: Verify the full test suite still passes**

Run: `cd /Users/harrylarbalestier/revu && npm test`
Expected: PASS — scoring (7), bucketing (3), geo (6), incentives (3) = 19 tests.

- [ ] **Step 5: Verify the API returns computed values**

Run the dev server and confirm the response is no longer the old hardcoded shape:

```bash
cd /Users/harrylarbalestier/revu
(npm run dev > /tmp/revu-dev-p4.log 2>&1 &) && sleep 6
curl -s "http://localhost:3000/api/search?q=joes+pizza" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); b=d['business']; print('blended', b['blendedRating'], 'raw', b['rawAverage']); print('buckets', b['buckets']['positive']['rating'], b['buckets']['mixed']['rating'], b['buckets']['negative']['rating'])"
pkill -f "next dev"
```

Expected: prints numeric `blended`/`raw` values, and bucket ratings where positive is the highest (5), negative the lowest (1), mixed in between. Confirm `blended` and `raw` are real numbers (not literally the old 3.9).

- [ ] **Step 6: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/lib/mock.ts
git commit -m "feat: compute blended rating and buckets from reviews in mock"
```

---

## Self-Review Notes

- **Spec coverage:** `recencyWeight` + `scoreReviews` (Task 1) ✓; `selectBuckets` with targets 5/3.5/1.5 and recent/substantive tie-breaks (Task 2) ✓; integration into `buildMockResult`, `perSource` untouched (Task 3) ✓; both metrics from surfaced reviews ✓; half-life 365 ✓; round to one decimal ✓; empty-input zeros ✓; future-date clamp ✓; injectable `now` with fixed-time tests ✓; no UI/type/route changes ✓.
- **Type consistency:** `recencyWeight(date, now?, halfLifeDays?)` and `scoreReviews(reviews, now?)` defined in Task 1; `bucketing.ts` imports `recencyWeight` from `@/lib/scoring` (Task 1) and exports `selectBuckets(reviews, now?)` used by Task 3; `scoreReviews` returns `{ blendedRating, rawAverage }` destructured identically in Task 3. Consistent throughout.
- **Placeholders:** none — every code step shows full code; every command has expected output.
