"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchResult, Tag, Review } from "@/types/review";
import RatingSummary from "@/components/RatingSummary";
import ReviewCard from "@/components/ReviewCard";
import TagFilter from "@/components/TagFilter";

// Lightweight keyword sets so the tag tabs do something on mock data. The real
// tag matching + re-ranking lands in phase 5 (lib/tags.ts).
const TAG_KEYWORDS: Record<Tag, string[]> = {
  overall: [],
  service: ["staff", "service", "waiter", "server", "rude", "friendly", "slow", "attentive", "welcoming"],
  food: ["food", "dish", "flavor", "portion", "crust", "slice", "tasty", "cold", "lukewarm"],
};

function rankByTag(reviews: Review[], tag: Tag): Review[] {
  if (tag === "overall") return reviews;
  const kw = TAG_KEYWORDS[tag];
  // Surface matches first; don't hide non-matches (stable partition).
  const matches: Review[] = [];
  const rest: Review[] = [];
  for (const r of reviews) {
    const text = r.text.toLowerCase();
    (kw.some((k) => text.includes(k)) ? matches : rest).push(r);
  }
  return [...matches, ...rest];
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; data: SearchResult };

export default function ResultsView({
  query,
  location,
}: {
  query: string;
  location?: string;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [tag, setTag] = useState<Tag>("overall");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const params = new URLSearchParams({ q: query });
    if (location) params.set("loc", location);

    fetch(`/api/search?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Search failed (${res.status})`);
        }
        return res.json() as Promise<SearchResult>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.reviews || data.reviews.length === 0) {
          setState({ status: "empty" });
        } else {
          setState({ status: "ready", data });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [query, location]);

  const rankedReviews = useMemo(() => {
    if (state.status !== "ready") return [];
    return rankByTag(state.data.reviews, tag);
  }, [state, tag]);

  if (state.status === "loading") {
    return (
      <p className="text-black/50 dark:text-white/50">
        Pulling reviews across platforms for “{query}”…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-red-600 dark:text-red-400">
        Couldn’t load reviews: {state.message}
      </p>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="text-black/60 dark:text-white/60">
        No reviews found across platforms yet for “{query}”.
      </p>
    );
  }

  const { business } = state.data;

  return (
    <div className="flex flex-col gap-6">
      <RatingSummary business={business} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Best case · typical case · worst case
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <ReviewCard review={business.buckets.positive} label="Best case" />
          <ReviewCard review={business.buckets.mixed} label="Typical" />
          <ReviewCard review={business.buckets.negative} label="Worst case" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            All reviews
          </h3>
          <TagFilter active={tag} onChange={setTag} />
        </div>
        <div className="grid gap-3">
          {rankedReviews.map((r, i) => (
            <ReviewCard key={`${r.source}-${i}`} review={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
