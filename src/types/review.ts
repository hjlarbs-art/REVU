// Shared domain types for REVU. These are the common shapes every platform's
// raw response is normalized into (see lib/normalize.ts, added in phase 2).

export type Source = "google" | "yelp" | "tripadvisor";

export type Tag = "overall" | "service" | "food";

export interface Review {
  source: Source;
  author: string;
  rating: number; // normalized 1–5
  text: string;
  date: string; // ISO 8601; recency is critical to REVU
  url?: string;
}

export interface PerSourceRating {
  source: Source;
  rating: number;
  count: number;
}

export interface BusinessResult {
  name: string;
  address?: string;
  blendedRating: number; // recency-weighted average across sources
  rawAverage: number; // simple cross-source mean
  perSource: PerSourceRating[];
  // Representative reviews: best case / typical case / worst case.
  buckets: {
    positive: Review;
    mixed: Review;
    negative: Review;
  };
}

// What /api/search returns. `reviews` is the surfaced, ranked feed the results
// page renders and the tag filter re-ranks; `buckets` (inside business) are the
// three representative picks.
export interface SearchResult {
  business: BusinessResult;
  reviews: Review[];
}
