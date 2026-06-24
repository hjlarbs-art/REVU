# REVU — Project Spec

Drop this file at the root of your repo. Claude Code reads it on every session to
stay oriented. Keep it updated as decisions change.

## What we're building

A consumer-facing web app that aggregates business reviews from multiple
platforms (Google, Yelp, and others) in real time and presents one honest,
current picture of a place. The insight: single-platform reviews (especially
Yelp) are stale and fragmented. Combining sources + filtering for recency and
relevance beats any one platform.

User flow:

1. User lands on a minimal page with a search bar.
2. User enables location (or types a city).
3. User types a business name or type ("Joe's Pizza", "salon", "coffee").
4. App fetches reviews across platforms in real time, computes a blended rating,
   and shows the most useful reviews.
5. User can filter by what they care about (Service / Food / Overall) and by
   sentiment buckets.

## MVP scope

In scope:

- Single search page + results page.
- Location: browser geolocation API, with manual city fallback.
- Real-time fetch from an aggregation backend (no review storage — we pull on demand).
- Blended average star rating across sources, with per-source breakdown.
- Review surfacing logic: show the most useful reviews, weighted toward recent
  ones, bucketed into roughly 5-star / ~3.5-star / 1-star.
- Tag filter at top: Service / Food / Overall.
- Source attribution + timestamp on every review (recency is the whole point).

Out of scope for MVP (note but don't build):

- User accounts / login.
- Saving favorites or history.
- Writing/submitting reviews (we aggregate, we don't host).
- Apple Maps (no public review API — skip for now).
- Mobile native app (responsive web only).

Cold start: if no reviews exist for a place, show "No reviews found across
platforms yet" — don't fabricate or pad.

## Tech stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind.
- Backend / data: Apify pre-built review aggregator Actors, called from a
  Next.js API route. Migrate to direct Yelp Fusion + Google Business Profile
  APIs later if cost or control demands it.
- Sentiment / tag matching (MVP): simple keyword matching. Upgrade to an
  LLM-based classifier post-MVP if needed.
- Hosting: Vercel.

## Architecture & data flow

```
Browser (search + geolocation)
        │  query + lat/lng
        ▼
Next.js API route  /api/search      ← API keys live here, never client-side
        │  triggers Apify Actor run
        ▼
Apify review aggregator Actor       ← scrapes Google/Yelp/etc.
        │  returns raw reviews JSON
        ▼
API route: normalize → dedupe → score → bucket → tag
        │  clean, blended payload
        ▼
Results page (rating + bucketed reviews + filters)
```

Key principle: the client never talks to Apify directly and never sees a key.

## File structure (this repo uses `src/`)

```
/src/app/page.tsx              # search landing page
/src/app/results/page.tsx      # results view
/src/app/api/search/route.ts   # server-side: calls Apify, normalizes, scores
/src/lib/apify.ts              # Apify client wrapper            (phase 3)
/src/lib/normalize.ts          # map each source's shape → Review (phase 2)
/src/lib/scoring.ts            # blended rating + recency weighting (phase 4)
/src/lib/bucketing.ts          # split reviews into 5★ / ~3.5★ / 1★ (phase 4)
/src/lib/tags.ts               # Service / Food / Overall matching (phase 5)
/src/lib/mock.ts               # phase-1 mock data (remove once Apify is wired)
/src/types/review.ts           # shared Review + Business types
/src/components/SearchBar.tsx
/src/components/RatingSummary.tsx
/src/components/ReviewCard.tsx
/src/components/TagFilter.tsx
/src/components/ResultsView.tsx
.env.local                     # APIFY_TOKEN (never commit)
```

## Core logic to nail (the actual product value)

1. **Blended rating (`scoring.ts`)** — weight by recency (exponential decay,
   ~12-month half-life), then a weighted mean. Show the raw cross-platform
   average too. Always show per-source counts.
2. **Review bucketing (`bucketing.ts`)** — pick a strong positive (5★), a
   middling one (~3.5★), and a notable negative (1–2★). Prefer recent +
   substantive + helpful-voted.
3. **Tag filtering (`tags.ts`)** — Service / Food / Overall keyword sets. When a
   tag is active, re-rank by relevance; don't hide others.

## Build phases

1. **Scaffold** Next.js + TS + Tailwind. Stub search page + `/api/search`
   returning mock data. Get the full UI flow working on fake data. ← **done**
2. **Types + normalize.** Define `Review`/`BusinessResult`, write `normalize.ts`.
3. **Apify integration.** Wire `apify.ts`, replace mock with a real run.
4. **Scoring + bucketing.** Recency-weighted rating + 3-bucket selection.
5. **Tag filtering.** Service/Food/Overall keyword matching + re-ranking.
6. **Polish.** Geolocation, loading states, empty/cold-start state, attribution.

## Conventions

- TypeScript strict mode on.
- Keep all secrets server-side. No API tokens in client bundles, ever.
- Each `/lib` module should be independently testable with mock data.

> Environment note: this machine runs Next.js 16.2.9 (App Router), which has
> breaking changes from older docs — `searchParams`/`params` are Promises and
> must be awaited. Check `node_modules/next/dist/docs/` before relying on older
> API shapes.
