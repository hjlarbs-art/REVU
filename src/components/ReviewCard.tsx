import type { Review } from "@/types/review";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
      {"★".repeat(full)}
      <span className="text-black/20 dark:text-white/20">
        {"★".repeat(Math.max(0, 5 - full))}
      </span>
    </span>
  );
}

export default function ReviewCard({
  review,
  label,
}: {
  review: Review;
  label?: string;
}) {
  return (
    <article className="rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-2">
      {label && (
        <span className="self-start rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-black/60 dark:text-white/60">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <Stars rating={review.rating} />
        <span className="text-xs text-black/45 dark:text-white/45">
          {SOURCE_LABELS[review.source] ?? review.source} · {formatDate(review.date)}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{review.text}</p>
      <div className="flex items-center justify-between text-xs text-black/45 dark:text-white/45">
        <span>{review.author}</span>
        {review.url && (
          <a
            href={review.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            View on {SOURCE_LABELS[review.source] ?? review.source}
          </a>
        )}
      </div>
    </article>
  );
}
