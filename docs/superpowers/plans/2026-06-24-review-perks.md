# Review Perks Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/incentives` page to REVU listing nearby restaurants that offer perks for leaving honest reviews, sorted nearest-first via geolocation.

**Architecture:** A server-rendered page shell renders a client `IncentivesView` that imports a static mock dataset, requests browser geolocation, and uses pure distance helpers (`geo.ts`) to sort restaurants nearest-first. No backend or API route — mock data is imported directly. A persistent disclosure banner keeps the feature honest about incentivized reviews.

**Tech Stack:** Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind v4, Vitest 4.

## Global Constraints

- TypeScript strict mode on — no `any`, all functions typed.
- `searchParams`/`params` are Promises in Next 16 — must be awaited (not relevant here; no dynamic params, but pages stay server components where possible).
- Keep all secrets server-side — N/A here (no secrets), but never introduce client-side keys.
- Path alias `@/*` → `./src/*`.
- Each `/lib` module must be independently testable with mock data.
- Mock data only — no real backend, no API route, no map, no review-submission flow.
- Feature framed as perks for **honest** reviews, with a persistent FTC/honesty disclosure banner.
- Components live in `src/components`, libs in `src/lib`, types in `src/types`, tests in `tests/`.

---

### Task 1: Distance helpers (`geo.ts`) + shared types + Vitest config

**Files:**
- Create: `vitest.config.ts`
- Modify: `src/types/review.ts` (append new types)
- Create: `src/lib/geo.ts`
- Test: `tests/geo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types `Coords { lat: number; lng: number }`, `Incentive { perk: string; condition: string; details?: string }`, `IncentiveRestaurant { id: string; name: string; cuisine: string; address: string; lat: number; lng: number; incentive: Incentive; blendedRating?: number }`.
  - `haversineMiles(a: Coords, b: Coords): number`
  - `sortByDistance<T extends Coords>(items: T[], from: Coords): Array<T & { distanceMi: number }>`
  - `formatDistance(mi: number): string`

- [ ] **Step 1: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 2: Append shared types**

Append to `src/types/review.ts`:

```ts
export interface Coords {
  lat: number;
  lng: number;
}

export interface Incentive {
  perk: string; // e.g. "Free appetizer"
  condition: string; // e.g. "for an honest review on any platform"
  details?: string;
}

export interface IncentiveRestaurant {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  lat: number;
  lng: number;
  incentive: Incentive;
  blendedRating?: number;
}
```

- [ ] **Step 3: Write the failing test**

Create `tests/geo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { haversineMiles, sortByDistance, formatDistance } from "@/lib/geo";
import type { Coords } from "@/types/review";

// Union Square ~ Times Square, NYC: ~1.6 mi apart.
const unionSq: Coords = { lat: 40.7359, lng: -73.9911 };
const timesSq: Coords = { lat: 40.758, lng: -73.9855 };

describe("haversineMiles", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMiles(unionSq, unionSq)).toBeCloseTo(0, 5);
  });

  it("computes a known NYC distance within tolerance", () => {
    const d = haversineMiles(unionSq, timesSq);
    expect(d).toBeGreaterThan(1.4);
    expect(d).toBeLessThan(1.8);
  });

  it("is symmetric", () => {
    expect(haversineMiles(unionSq, timesSq)).toBeCloseTo(
      haversineMiles(timesSq, unionSq),
      6,
    );
  });
});

describe("sortByDistance", () => {
  it("annotates with distanceMi and sorts ascending", () => {
    const items = [
      { id: "far", lat: 40.8, lng: -73.95 },
      { id: "near", lat: 40.7361, lng: -73.9911 },
    ];
    const sorted = sortByDistance(items, unionSq);
    expect(sorted.map((i) => i.id)).toEqual(["near", "far"]);
    expect(sorted[0].distanceMi).toBeLessThan(sorted[1].distanceMi);
    expect(typeof sorted[0].distanceMi).toBe("number");
  });

  it("does not mutate the input array", () => {
    const items = [{ id: "a", lat: 40.8, lng: -73.95 }];
    const copy = [...items];
    sortByDistance(items, unionSq);
    expect(items).toEqual(copy);
  });
});

describe("formatDistance", () => {
  it("formats to one decimal with unit", () => {
    expect(formatDistance(0.32)).toBe("0.3 mi");
    expect(formatDistance(1.25)).toBe("1.3 mi");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/geo.test.ts`
Expected: FAIL — cannot resolve `@/lib/geo` (module not found).

- [ ] **Step 5: Write minimal implementation**

Create `src/lib/geo.ts`:

```ts
import type { Coords } from "@/types/review";

const EARTH_RADIUS_MI = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in miles. */
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.sqrt(h));
}

/** Returns a new array annotated with distanceMi, sorted nearest-first. */
export function sortByDistance<T extends Coords>(
  items: T[],
  from: Coords,
): Array<T & { distanceMi: number }> {
  return items
    .map((item) => ({ ...item, distanceMi: haversineMiles(from, item) }))
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

/** Formats a mile distance, e.g. 0.32 -> "0.3 mi". */
export function formatDistance(mi: number): string {
  return `${mi.toFixed(1)} mi`;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/geo.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 7: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add vitest.config.ts src/types/review.ts src/lib/geo.ts tests/geo.test.ts
git commit -m "feat: add geo distance helpers and incentive types"
```

---

### Task 2: Mock incentives dataset (`incentives.ts`)

**Files:**
- Create: `src/lib/incentives.ts`
- Test: `tests/incentives.test.ts`

**Interfaces:**
- Consumes: `IncentiveRestaurant` type from Task 1.
- Produces: `getIncentiveRestaurants(): IncentiveRestaurant[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/incentives.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getIncentiveRestaurants } from "@/lib/incentives";

describe("getIncentiveRestaurants", () => {
  const all = getIncentiveRestaurants();

  it("returns a non-empty list", () => {
    expect(all.length).toBeGreaterThanOrEqual(5);
  });

  it("every restaurant has unique id and valid coords", () => {
    const ids = new Set(all.map((r) => r.id));
    expect(ids.size).toBe(all.length);
    for (const r of all) {
      expect(r.lat).toBeGreaterThan(40);
      expect(r.lat).toBeLessThan(41);
      expect(r.lng).toBeLessThan(-73);
      expect(r.lng).toBeGreaterThan(-75);
    }
  });

  it("every restaurant has a perk and an honest-review condition", () => {
    for (const r of all) {
      expect(r.incentive.perk.length).toBeGreaterThan(0);
      expect(r.incentive.condition.toLowerCase()).toContain("honest");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/incentives.test.ts`
Expected: FAIL — cannot resolve `@/lib/incentives`.

- [ ] **Step 3: Write the dataset**

Create `src/lib/incentives.ts`:

```ts
import type { IncentiveRestaurant } from "@/types/review";

// Phase-1 mock dataset. Static NYC restaurants with perks for honest reviews.
// Replace with a real source (or /api/incentives) later — see REVU.md.
const RESTAURANTS: IncentiveRestaurant[] = [
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    cuisine: "Pizza",
    address: "7 Carmine St, New York, NY",
    lat: 40.7305,
    lng: -74.0027,
    incentive: { perk: "Free garlic knots", condition: "for an honest review on any platform" },
    blendedRating: 4.4,
  },
  {
    id: "lievito",
    name: "Lievito Bakery",
    cuisine: "Bakery",
    address: "112 Stanton St, New York, NY",
    lat: 40.7211,
    lng: -73.985,
    incentive: { perk: "10% off your order", condition: "for an honest review on any platform" },
    blendedRating: 4.1,
  },
  {
    id: "saigon-corner",
    name: "Saigon Corner",
    cuisine: "Vietnamese",
    address: "55 Mott St, New York, NY",
    lat: 40.7159,
    lng: -73.9982,
    incentive: { perk: "Free spring rolls", condition: "for an honest review on any platform" },
    blendedRating: 4.6,
  },
  {
    id: "el-farolito",
    name: "El Farolito",
    cuisine: "Mexican",
    address: "203 Ave A, New York, NY",
    lat: 40.7264,
    lng: -73.9818,
    incentive: { perk: "Free guacamole", condition: "for an honest review on any platform" },
    blendedRating: 4.0,
  },
  {
    id: "kettle-black",
    name: "Kettle & Black",
    cuisine: "Coffee",
    address: "88 Bedford Ave, Brooklyn, NY",
    lat: 40.7193,
    lng: -73.9566,
    incentive: { perk: "Free drip coffee", condition: "for an honest review on any platform" },
    blendedRating: 4.3,
  },
  {
    id: "tandoori-house",
    name: "Tandoori House",
    cuisine: "Indian",
    address: "342 E 6th St, New York, NY",
    lat: 40.7271,
    lng: -73.9869,
    incentive: { perk: "Free naan basket", condition: "for an honest review on any platform" },
    blendedRating: 4.2,
  },
  {
    id: "greenpoint-deli",
    name: "Greenpoint Deli",
    cuisine: "Sandwiches",
    address: "611 Manhattan Ave, Brooklyn, NY",
    lat: 40.7257,
    lng: -73.9512,
    incentive: { perk: "Free cookie with any sandwich", condition: "for an honest review on any platform" },
    blendedRating: 3.9,
  },
];

export function getIncentiveRestaurants(): IncentiveRestaurant[] {
  return RESTAURANTS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/harrylarbalestier/revu && npx vitest run tests/incentives.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/lib/incentives.ts tests/incentives.test.ts
git commit -m "feat: add mock review-perks restaurant dataset"
```

---

### Task 3: IncentiveCard component

**Files:**
- Create: `src/components/IncentiveCard.tsx`

**Interfaces:**
- Consumes: `IncentiveRestaurant` type (Task 1); `formatDistance` (Task 1).
- Produces: default-exported `IncentiveCard` taking `{ restaurant: IncentiveRestaurant; distanceMi?: number }`.

> No unit test — presentational component, verified manually in Task 5's dev-server check.

- [ ] **Step 1: Write the component**

Create `src/components/IncentiveCard.tsx`:

```tsx
import type { IncentiveRestaurant } from "@/types/review";
import { formatDistance } from "@/lib/geo";

export default function IncentiveCard({
  restaurant,
  distanceMi,
}: {
  restaurant: IncentiveRestaurant;
  distanceMi?: number;
}) {
  const { name, cuisine, address, incentive, blendedRating } = restaurant;
  return (
    <article className="rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-xs text-black/50 dark:text-white/50">
            {cuisine} · {address}
          </p>
        </div>
        {typeof distanceMi === "number" && (
          <span className="shrink-0 text-xs text-black/60 dark:text-white/60">
            {formatDistance(distanceMi)} away
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
          Incentivized
        </span>
        {typeof blendedRating === "number" && (
          <span className="text-xs text-black/60 dark:text-white/60">
            REVU {blendedRating.toFixed(1)}★
          </span>
        )}
      </div>

      <p className="text-sm">
        <span className="font-medium">{incentive.perk}</span>{" "}
        <span className="text-black/60 dark:text-white/60">
          {incentive.condition}
        </span>
      </p>
    </article>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/harrylarbalestier/revu && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/components/IncentiveCard.tsx
git commit -m "feat: add IncentiveCard component"
```

---

### Task 4: IncentivesView (client, geolocation state machine)

**Files:**
- Create: `src/components/IncentivesView.tsx`

**Interfaces:**
- Consumes: `getIncentiveRestaurants` (Task 2); `sortByDistance` (Task 1); `IncentiveCard` (Task 3); `Coords`, `IncentiveRestaurant` types (Task 1).
- Produces: default-exported `IncentivesView` (no props).

> No unit test — geolocation UI is verified manually in Task 5's dev-server check.

- [ ] **Step 1: Write the component**

Create `src/components/IncentivesView.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Coords } from "@/types/review";
import { getIncentiveRestaurants } from "@/lib/incentives";
import { sortByDistance } from "@/lib/geo";
import IncentiveCard from "@/components/IncentiveCard";

type GeoState =
  | { status: "locating" }
  | { status: "ready"; coords: Coords }
  | { status: "denied" };

export default function IncentivesView() {
  const restaurants = useMemo(() => getIncentiveRestaurants(), []);
  const [geo, setGeo] = useState<GeoState>({ status: "locating" });

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "denied" });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "ready",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }),
      () => setGeo({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  if (geo.status === "locating") {
    return (
      <p className="text-black/50 dark:text-white/50">
        Finding review perks near you…
      </p>
    );
  }

  if (restaurants.length === 0) {
    return (
      <p className="text-black/60 dark:text-white/60">
        No review perks near you yet.
      </p>
    );
  }

  if (geo.status === "denied") {
    const byName = [...restaurants].sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-black/10 dark:border-white/15 px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span className="text-black/60 dark:text-white/60">
            Turn on location to sort by nearest.
          </span>
          <button
            onClick={requestLocation}
            className="rounded-lg border border-black/15 dark:border-white/20 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Use my location
          </button>
        </div>
        <div className="grid gap-3">
          {byName.map((r) => (
            <IncentiveCard key={r.id} restaurant={r} />
          ))}
        </div>
      </div>
    );
  }

  const sorted = sortByDistance(restaurants, geo.coords);
  return (
    <div className="grid gap-3">
      {sorted.map((r) => (
        <IncentiveCard key={r.id} restaurant={r} distanceMi={r.distanceMi} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/harrylarbalestier/revu && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/components/IncentivesView.tsx
git commit -m "feat: add IncentivesView with geolocation distance sort"
```

---

### Task 5: Page, disclosure banner, and nav links

**Files:**
- Create: `src/app/incentives/page.tsx`
- Modify: `src/app/page.tsx` (add nav link)
- Modify: `src/app/results/page.tsx` (add nav link in header)

**Interfaces:**
- Consumes: `IncentivesView` (Task 4).
- Produces: the `/incentives` route.

- [ ] **Step 1: Write the page**

Create `src/app/incentives/page.tsx`:

```tsx
import Link from "next/link";
import IncentivesView from "@/components/IncentivesView";

export default function IncentivesPage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-2xl font-bold tracking-tight w-fit">
          REVU
        </Link>
        <h1 className="text-xl font-semibold">Review perks nearby</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Restaurants offering a little something for leaving an honest review.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        These perks are for <strong>honest</strong> reviews, not positive ones.
        Incentivized reviews should be disclosed per FTC guidance and may conflict
        with some platforms&rsquo; terms of service.
      </div>

      <IncentivesView />
    </main>
  );
}
```

- [ ] **Step 2: Add nav link on the landing page**

In `src/app/page.tsx`, the closing of the centered column currently ends with the tagline paragraph:

```tsx
        <p className="text-sm text-black/40 dark:text-white/40">
          Single-platform reviews are stale and fragmented. We combine sources
          and surface what actually matters.
        </p>
```

Add a link immediately after that paragraph (still inside the `div`), and add the `Link` import at the top of the file:

```tsx
import Link from "next/link";
```

```tsx
        <Link
          href="/incentives"
          className="text-sm underline text-black/60 dark:text-white/60 hover:no-underline"
        >
          See review perks nearby →
        </Link>
```

- [ ] **Step 3: Add nav link in the results header**

In `src/app/results/page.tsx`, the header currently is:

```tsx
      <header className="flex flex-col gap-4">
        <Link href="/" className="text-2xl font-bold tracking-tight w-fit">
          REVU
        </Link>
        <SearchBar initialQuery={query} initialLocation={location ?? ""} />
      </header>
```

Replace the `REVU` link line with a row that also links to perks:

```tsx
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-2xl font-bold tracking-tight w-fit">
            REVU
          </Link>
          <Link
            href="/incentives"
            className="text-sm underline text-black/60 dark:text-white/60 hover:no-underline"
          >
            Review perks
          </Link>
        </div>
        <SearchBar initialQuery={query} initialLocation={location ?? ""} />
      </header>
```

- [ ] **Step 4: Verify build and types**

Run: `cd /Users/harrylarbalestier/revu && npx tsc --noEmit && npm run build`
Expected: type check clean; build succeeds and the route list includes `○ /incentives` (or `ƒ`).

- [ ] **Step 5: Manual dev-server check**

Run: `cd /Users/harrylarbalestier/revu && npm run dev` (background), then:
- Visit `http://localhost:3000/incentives` — disclosure banner shows; on geolocation allow, cards show distances and are nearest-first; on deny, cards show name-ordered with a "Use my location" prompt.
- Visit `http://localhost:3000/` and `http://localhost:3000/results?q=pizza` — the perks link is present and navigates to `/incentives`.

Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
cd /Users/harrylarbalestier/revu
git add src/app/incentives/page.tsx src/app/page.tsx src/app/results/page.tsx
git commit -m "feat: add review perks page with disclosure and nav links"
```

---

## Self-Review Notes

- **Spec coverage:** route `/incentives` (Task 5) ✓; mock dataset in `/lib` (Task 2) ✓; geolocation + distance sort (Tasks 1, 4) ✓; city/denied fallback ordered by name (Task 4) ✓; per-restaurant card with perk/condition/badge/distance/rating (Task 3) ✓; disclosure banner (Task 5) ✓; nav links from landing + results (Task 5) ✓; cold-start empty state (Task 4) ✓; geo unit tests (Task 1) ✓; out-of-scope items (no API route, no map, no submission) honored ✓.
- **Type consistency:** `Coords`, `Incentive`, `IncentiveRestaurant` defined in Task 1 and consumed unchanged in Tasks 2–4; `sortByDistance` returns `T & { distanceMi }`, used as `r.distanceMi` in Task 4 ✓; `formatDistance` defined Task 1, used Task 3 ✓; `getIncentiveRestaurants` defined Task 2, used Task 4 ✓.
- **Placeholders:** none — every step has full code or an exact command.
