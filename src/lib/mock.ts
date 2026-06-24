import type { Review, SearchResult } from "@/types/review";

// Phase 1 mock data. This stands in for the Apify aggregation + scoring +
// bucketing pipeline (phases 3–4) so the full UI flow works end-to-end on
// fake data. Replace the call site in /api/search with the real pipeline later.

const MOCK_REVIEWS: Review[] = [
  {
    source: "google",
    author: "Dana R.",
    rating: 5,
    text: "Best slice in the neighborhood. The crust is perfectly crisp and the staff remembered my order from last week. Fast even at lunch rush.",
    date: "2026-06-02T14:30:00Z",
    url: "https://maps.google.com/?cid=1",
  },
  {
    source: "yelp",
    author: "Marcus T.",
    rating: 4,
    text: "Solid spot. Food came out quick and the portions are generous. Service was a little slow when it got busy but the waiter was friendly about it.",
    date: "2026-05-18T19:05:00Z",
    url: "https://yelp.com/biz/example#1",
  },
  {
    source: "google",
    author: "Priya S.",
    rating: 3,
    text: "Decent food, nothing special. The flavor was fine but the dish was lukewarm by the time it reached the table. Average experience overall.",
    date: "2026-04-27T12:10:00Z",
    url: "https://maps.google.com/?cid=2",
  },
  {
    source: "tripadvisor",
    author: "Henry K.",
    rating: 4,
    text: "Came here on a trip and was pleasantly surprised. Great atmosphere, attentive staff, reasonable prices. Would come back.",
    date: "2026-03-30T20:45:00Z",
    url: "https://tripadvisor.com/example#1",
  },
  {
    source: "yelp",
    author: "Alex M.",
    rating: 2,
    text: "Disappointing. Waited 40 minutes and the server was rude when I asked about the delay. The food itself was okay but the service ruined it.",
    date: "2026-05-30T18:20:00Z",
    url: "https://yelp.com/biz/example#2",
  },
  {
    source: "google",
    author: "Sofia L.",
    rating: 1,
    text: "Worst experience. Cold food, dismissive staff, and they got the order wrong twice. Will not be returning.",
    date: "2026-06-10T13:00:00Z",
    url: "https://maps.google.com/?cid=3",
  },
  {
    source: "tripadvisor",
    author: "Omar B.",
    rating: 5,
    text: "Hidden gem. Every dish bursting with flavor, generous portions, and the friendliest staff you'll meet. A must-visit.",
    date: "2026-06-15T21:30:00Z",
    url: "https://tripadvisor.com/example#2",
  },
  {
    source: "yelp",
    author: "Jen W.",
    rating: 4,
    text: "Reliable and tasty. The service is what keeps me coming back — always welcoming and quick to refill drinks.",
    date: "2026-02-14T17:50:00Z",
    url: "https://yelp.com/biz/example#3",
  },
];

export function buildMockResult(query: string, location?: string): SearchResult {
  const name = titleCase(query.trim() || "Joe's Pizza");
  const address = location?.trim()
    ? `${location.trim()}`
    : "123 Example St, New York, NY";

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
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}
