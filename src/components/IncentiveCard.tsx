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
