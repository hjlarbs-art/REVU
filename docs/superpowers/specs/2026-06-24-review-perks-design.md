# Review Perks Page — Design Spec

**Date:** 2026-06-24
**Feature:** A separate page listing nearby restaurants that offer perks for leaving honest reviews.
**Status:** Approved, pending implementation plan.

## Summary

Add a standalone `/incentives` page to REVU that shows nearby restaurants
offering a perk (free appetizer, discount, etc.) in exchange for leaving an
**honest** review on any platform. Restaurants are sorted nearest-first using
browser geolocation, with a city-label fallback when location is unavailable.

The page is explicitly framed and disclosed as incentivized so it does not
undercut REVU's core positioning ("one honest, current picture of a place").

## Motivation & positioning

Incentivized reviews are in tension with REVU's honesty pitch, and pay-for-review
incentives conflict with Google's and Yelp's terms of service; the FTC also
requires disclosure of material connections. This feature therefore:

- Frames perks as rewards for **honest** reviews, not positive ones.
- Carries a persistent disclosure banner.
- Stays clearly separated from the main blended-rating search flow.

## Scope

### In scope

- New route `/incentives`.
- Static mock dataset of NYC restaurants with perks (in `/lib`, like the rest of
  the app's current phase-1 state).
- Geolocation-driven "nearby": compute distance from the user's coordinates and
  sort nearest-first, displaying e.g. "0.3 mi away".
- City/label fallback when geolocation is denied or unavailable: list the
  restaurants (ordered by name) with a prompt to enable location.
- Per-restaurant card: name, cuisine, address, the perk + its condition, an
  "Incentivized" badge, and distance when known.
- Persistent FTC/honesty disclosure banner.
- Nav links to the page from the landing page and the results header.
- Unit tests for the distance/sort logic.

### Out of scope

- Any real backend (Apify, DB, curated live list) — mock only for now.
- A map view.
- An actual review-submission or redemption flow.
- Tracking, accounts, or saving favorites.

## Architecture & data flow

```
/incentives (server page)
        │  renders
        ▼
<IncentivesView> (client)
        │  reads getIncentiveRestaurants() (static mock)
        │  requests browser geolocation
        ▼
  geolocation states:
    locating → ready  → sortByDistance(restaurants, coords) → cards with distance
    locating → denied → restaurants by name + "enable location" prompt
```

No network calls and no API route — the mock data is imported directly, matching
the "Mock data in /lib" decision. (If a real source is wired later, it would
become a `/api/incentives` route mirroring `/api/search`; noted but not built.)

## Components & modules

### `src/types/review.ts` (extend)

```ts
export interface Incentive {
  perk: string;        // e.g. "Free appetizer"
  condition: string;   // e.g. "for an honest review on any platform"
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
  blendedRating?: number; // optional tie-back to REVU's rating
}

export interface Coords {
  lat: number;
  lng: number;
}
```

### `src/lib/incentives.ts` (new)

- `getIncentiveRestaurants(): IncentiveRestaurant[]` — returns a static array of
  ~7 NYC restaurants with realistic coordinates and varied perks/conditions.

### `src/lib/geo.ts` (new, pure & tested)

- `haversineMiles(a: Coords, b: Coords): number` — great-circle distance in miles.
- `sortByDistance<T extends Coords>(items: T[], from: Coords): (T & { distanceMi: number })[]`
  — returns a new array annotated with `distanceMi`, sorted ascending.
- `formatDistance(mi: number): string` — e.g. `"0.3 mi"`, `"1.2 mi"`.

These are the only pieces with real logic and get Vitest unit tests
(`tests/geo.test.ts`), satisfying the "each lib module independently testable"
convention.

### `src/components/IncentivesView.tsx` (new, client)

Owns geolocation state and rendering:

- State machine: `locating` → `ready` (coords obtained) or `denied`
  (permission denied / unavailable / timeout).
- `ready`: annotate + sort via `sortByDistance`, render cards with distance.
- `denied`: render cards ordered by name, no distance, plus a "Turn on location
  to sort by nearest" prompt with a retry button.
- Reuses the geolocation request pattern already in `SearchBar.tsx`.

### `src/components/IncentiveCard.tsx` (new)

- Restaurant name, cuisine, address.
- Perk + condition (e.g. "Free appetizer — for an honest review on any platform").
- "Incentivized" badge.
- Distance ("0.3 mi away") when known; omitted otherwise.
- Optional rating if `blendedRating` is present.

### `src/app/incentives/page.tsx` (new, server)

- Page shell: REVU header (link home), the disclosure banner, and
  `<IncentivesView>`.

### Navigation (edits)

- `src/app/page.tsx` — add a link to `/incentives` ("Review perks nearby").
- `src/app/results/page.tsx` header — add the same link.

## Error & edge handling

- **Geolocation denied / unavailable / timeout:** fall back to name-ordered list
  with a prompt; never block the page.
- **No restaurants (defensive):** show "No review perks near you yet." (cold-start
  parity with the search page's honesty about empty results).
- **Invalid coordinates in mock data:** `haversineMiles` is pure math; mock data
  is controlled, so no runtime guard needed beyond normal typing.

## Testing

- `tests/geo.test.ts`: known-distance assertions for `haversineMiles` (e.g. two
  NYC points), correct ascending order from `sortByDistance`, and `formatDistance`
  output.
- Components and the page are verified manually via the running dev server
  (geolocation states can't be meaningfully unit-tested without a browser).

## Open questions

None outstanding. Route confirmed as `/incentives`; disclosure banner confirmed.
