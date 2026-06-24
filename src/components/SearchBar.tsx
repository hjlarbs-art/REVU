"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  // Initial values, e.g. when rendered on the results page to allow re-search.
  initialQuery?: string;
  initialLocation?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  initialLocation = "",
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  const [locating, setLocating] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (location.trim()) params.set("loc", location.trim());
    router.push(`/results?${params.toString()}`);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocation("");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`${latitude.toFixed(5)},${longitude.toFixed(5)}`);
        setLocating(false);
      },
      () => {
        // Permission denied or unavailable — fall back to manual entry.
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-3">
      <input
        type="text"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Joe's Pizza, salon, coffee…"
        aria-label="Business name or type"
        className="w-full rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-neutral-900 px-4 py-3 text-lg outline-none focus:border-black/40 dark:focus:border-white/50"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City (or use your location)"
          aria-label="City or location"
          className="flex-1 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-neutral-900 px-4 py-2.5 outline-none focus:border-black/40 dark:focus:border-white/50"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="shrink-0 rounded-xl border border-black/15 dark:border-white/20 px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
        >
          {locating ? "Locating…" : "📍 Near me"}
        </button>
      </div>
      <button
        type="submit"
        disabled={!query.trim()}
        className="rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-3 font-medium hover:opacity-90 disabled:opacity-40"
      >
        Search reviews
      </button>
    </form>
  );
}
