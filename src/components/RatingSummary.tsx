import type { BusinessResult } from "@/types/review";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
};

export default function RatingSummary({ business }: { business: BusinessResult }) {
  return (
    <section className="rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{business.name}</h2>
        {business.address && (
          <p className="text-sm text-black/50 dark:text-white/50">
            {business.address}
          </p>
        )}
      </div>

      <div className="flex items-end gap-6">
        <div>
          <div className="text-4xl font-bold">
            {business.blendedRating.toFixed(1)}
          </div>
          <div className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
            Recency-weighted
          </div>
        </div>
        <div className="text-sm text-black/50 dark:text-white/50">
          Raw cross-platform average:{" "}
          <span className="font-medium text-black/70 dark:text-white/70">
            {business.rawAverage.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60 dark:text-white/60">
        {business.perSource.map((s) => (
          <span key={s.source}>
            {SOURCE_LABELS[s.source] ?? s.source}{" "}
            <span className="font-medium text-black/80 dark:text-white/80">
              {s.rating.toFixed(1)}
            </span>{" "}
            · {s.count} reviews
          </span>
        ))}
      </div>
    </section>
  );
}
