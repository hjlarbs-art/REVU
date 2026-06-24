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
