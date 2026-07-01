# PROJECT SPEC — "The Current Truth About Any Place"

**Working name: TBD — do NOT use "REVU" (trademark conflict with Bluebeam Revu).**

This file is the source of truth — when in doubt, follow this file, not vibes.
Update it when decisions change. It supersedes the original REVU spec (removed
2026-06-25; see git history).

## The one-paragraph pitch

Reviews are stale and fragmented, and people only read the extremes anyway.
This app gives one honest, current answer about a business: a recency-weighted
blended score across platforms, a short synthesized verdict of what the place
is like right now, whether it's improving or declining, the top consistent
complaint and praise, and three representative reviews (best / typical /
worst). We are not an aggregator — we are a **synthesis layer**. Trend
detection ("this place declined in the last 6 months") is the flagship feature
no incumbent has.

## Strategy constraints (do not violate)

1. **Cache-first, never real-time-per-search.** We scrape a business once
   (batch), store everything, synthesize a verdict card, and serve reads from
   the cache instantly. Refresh when stale (default 45 days) or on user demand.
   Real-time scraping per search is banned: it costs ~$0.10–1.00 and 20–60s per
   query and builds no asset.
2. **One vertical, one geography.** MVP = salons & barbershops in a single
   neighborhood/borough (~200–500 businesses). Do not generalize the schema or
   UI to "all businesses" yet, but don't hard-code "salon" into table names
   either — use `businesses` with a `category` field.
3. **Every verdict is a public, indexable page.** SEO is the distribution
   engine. Server-render everything; each business gets `/[city]/[slug]` with
   proper meta tags and structured data (schema.org LocalBusiness +
   AggregateRating).
4. **Secrets never touch the client.** All scraping, LLM calls, and tokens live
   server-side.

## User experience

**Search page:** minimal — search bar + location (browser geolocation with
manual city fallback). Autocomplete against our cached `businesses` table
(instant), not against external APIs.

**Verdict card (the product):**

- Business name, address, category
- Blended score (recency-weighted) + raw average + per-source breakdown
  ("Google 4.3 · 412 · Yelp 3.7 · 89") — source disagreement is signal, show it
- **The Verdict:** 2–3 sentence LLM synthesis of what this place is like now
- **Trend line:** Improving / Stable / Declining, with one sentence of evidence
  ("recent reviews mention new ownership and longer waits")
- Consistent praise (one line) and consistent complaint (one line)
- Three representative reviews: best case (5★), typical case (~3–4★), worst
  case (1–2★) — each with source, date, and link out. Prefer recent +
  substantive.
- Tag filter: Service / Quality / Value / Overall — re-ranks reviews by topic
  relevance (don't hide non-matches, surface matches first)
- Freshness stamp: "Based on N reviews across M platforms, last updated [date]"
  + a "Request refresh" button (rate-limited)
- **Cold start:** if a business isn't cached, show "Analyzing this place —
  check back in ~2 minutes," enqueue a scrape+synthesis job. Email/notify is
  out of scope (they can revisit). Never fabricate.

## Tech stack

- **Frontend + API:** Next.js (App Router) + TypeScript strict + Tailwind,
  deployed on Vercel
- **DB:** Supabase Postgres (businesses, reviews, verdicts, scrape_jobs)
- **Scraping:** Apify actors (Google Maps reviews + Yelp reviews), run as batch
  jobs, triggered by a script or cron — never from the request path
- **Synthesis:** Claude API (claude-sonnet-4-6) — takes all cached reviews for
  a business, returns structured JSON verdict
- **Jobs/refresh:** Vercel cron (or a simple script run manually during MVP)
  that finds stale businesses and re-runs scrape → synthesize

## Data model (Postgres)

```sql
businesses (
  id uuid pk,
  slug text unique,           -- for /[city]/[slug]
  name text, address text, city text, lat float, lng float,
  category text,              -- 'salon' | 'barbershop' | ...
  created_at, last_scraped_at, last_synthesized_at
)

reviews (
  id uuid pk,
  business_id fk,
  source text,                -- 'google' | 'yelp'
  source_review_id text,      -- for dedupe; unique(source, source_review_id)
  author text, rating int,    -- normalized 1–5
  text text, review_date date,
  scraped_at timestamptz
)

verdicts (
  business_id pk fk,
  blended_score numeric,      -- recency-weighted
  raw_average numeric,
  per_source jsonb,           -- [{source, avg, count}]
  verdict_text text,          -- 2–3 sentences
  trend text,                 -- 'improving' | 'stable' | 'declining'
  trend_evidence text,
  top_praise text, top_complaint text,
  representative_reviews jsonb, -- {best: review_id, typical: review_id, worst: review_id}
  review_count int, source_count int,
  updated_at timestamptz
)

scrape_jobs (
  id uuid pk, business_id fk nullable, query text,
  status text,                -- 'queued' | 'running' | 'done' | 'failed'
  created_at, finished_at
)
```

## Core algorithms

### 1. Blended score (`lib/scoring.ts`)

- Exponential recency decay: weight = 0.5^(age_in_months / 12) (12-month
  half-life)
- Blended = weighted mean across ALL sources' reviews pooled together
- Also compute raw simple average; store both
- Per-source averages + counts for the breakdown row

### 2. Trend detection (`lib/trend.ts`) — flagship feature, get this right

- Window A = reviews from last 6 months; Window B = prior 24 months
- Require minimums (A ≥ 5 reviews, B ≥ 10) else trend = 'stable' with
  low-confidence flag
- If mean(A) − mean(B) ≥ +0.35 → improving; ≤ −0.35 → declining; else stable
- Pass both windows to the LLM synthesis step so trend_evidence cites actual
  recent content

### 3. Representative review selection (`lib/bucketing.ts`)

- Buckets: best (5★), typical (3–4★), worst (1–2★)
- Within bucket, score = recency weight × substance weight (text length capped,
  penalize <80 chars) — pick top scorer
- Never pick reviews older than 24 months if fresher options exist in-bucket

### 4. Verdict synthesis (`lib/synthesize.ts`)

- Input: business metadata + up to ~150 most recent reviews (truncate long
  ones) + computed stats + trend windows
- One Claude API call, temperature low, force JSON output matching the
  `verdicts` shape (verdict_text, trend_evidence, top_praise, top_complaint)
- Guardrails in prompt: only claim what reviews support; no invented specifics;
  neutral tone; mention recency explicitly when relevant
- Parse defensively (strip fences, validate with zod); on parse failure, retry
  once, then mark job failed

### 5. Tag relevance (`lib/tags.ts`)

- MVP: keyword sets per tag (Service: staff, rude, friendly, wait,
  appointment… / Quality: cut, color, style, results… / Value: price, worth,
  overpriced…)
- Active tag re-ranks reviews by keyword-match density; upgrade to
  embedding/LLM classification post-MVP

## Pipeline (batch, not request-path)

```
seed script: Apify Google Maps search "salons in [neighborhood]"
    → upsert businesses (200–500 rows)
for each business (batched, respect Apify concurrency):
    Apify reviews actors (Google + Yelp) → normalize → upsert reviews (dedupe on source_review_id)
    → scoring + trend + bucketing
    → Claude synthesis → upsert verdict
site reads ONLY from businesses/verdicts/reviews tables — zero external calls at request time
cron (weekly during MVP): refresh businesses where last_scraped_at > 45 days OR refresh requested
```

## File structure

```
/app
  /page.tsx                     # search
  /[city]/[slug]/page.tsx       # verdict page (SSR, indexable)
  /api/search/route.ts          # autocomplete against our DB
  /api/refresh/route.ts         # rate-limited refresh request → enqueue job
/lib
  /apify.ts /normalize.ts /scoring.ts /trend.ts /bucketing.ts /synthesize.ts /tags.ts /db.ts
/scripts
  /seed.ts                      # discover + scrape + synthesize one neighborhood
  /refresh.ts                   # stale-business refresh pass
/types/domain.ts                # Business, Review, Verdict types (mirror SQL)
.env.local                      # APIFY_TOKEN, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
```

(This repo keeps its existing `src/` prefix: `src/app`, `src/lib`, `src/types`,
plus root-level `scripts/` and `tests/`.)

## Build order (follow strictly)

1. **Scaffold + mock:** Next.js/TS/Tailwind, domain types, verdict page +
   search rendering from hardcoded mock verdicts. Full UX visible on fake data.
2. **DB:** Supabase schema + `db.ts`; swap mocks for DB reads with seeded fake
   rows.
3. **Pipeline offline:** `normalize`, `scoring`, `trend`, `bucketing` as pure,
   unit-testable functions run against fixture JSON (copy real Apify output
   shapes into `/fixtures`).
4. **Apify integration:** `seed.ts` end-to-end for ~10 businesses. Verify
   dedupe and cost per business before scaling to the full neighborhood.
5. **Synthesis:** Claude call + zod validation; generate real verdicts for the
   10, then the full set.
6. **Polish:** geolocation, loading/empty states, refresh button, SEO meta +
   schema.org, sitemap.

## Cost & risk ledger (revisit each phase)

- **Apify:** batch scrape of ~300 salons ≈ tens of dollars one-time; refresh
  monthly ≈ similar. Log actual cost-per-business in step 4 and write it here.
- **Claude API:** ~150 reviews ≈ 15–25k input tokens → cents per business per
  synthesis. Negligible at MVP scale.
- **ToS risk:** scraping Google/Yelp violates their ToS. Acceptable risk for a
  student project with no revenue; MUST revisit before monetization or scale.
  Official APIs (Yelp Fusion ~3 excerpts, Google Places ~5 reviews) cannot
  power this product — that's why scraping, that's why this ledger entry
  exists.
- **Trademark:** rename before buying domains; search USPTO for the chosen
  name.
- **Latency promise:** cached reads must render < 1s. If a page ever waits on
  Apify or Claude, the architecture has been violated — fix the architecture,
  not the spinner.

## Conventions

- TS strict; zod at every external boundary (Apify responses, LLM output)
- `/lib` functions pure and testable; fixtures over live calls in tests
- Never commit `.env.local`; never expose keys client-side
- Commit after each build-order step completes and passes
