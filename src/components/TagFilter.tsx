"use client";

import type { Tag } from "@/types/review";

const TAGS: { key: Tag; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "service", label: "Service" },
  { key: "food", label: "Food" },
];

export default function TagFilter({
  active,
  onChange,
}: {
  active: Tag;
  onChange: (tag: Tag) => void;
}) {
  return (
    <div role="tablist" aria-label="Filter reviews by topic" className="flex gap-2">
      {TAGS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors " +
              (isActive
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
