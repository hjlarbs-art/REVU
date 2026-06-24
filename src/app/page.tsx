import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl flex flex-col items-center text-center gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight">REVU</h1>
          <p className="text-lg text-black/60 dark:text-white/60">
            One honest, current picture of a place — reviews from Google, Yelp,
            and more, blended and weighted for recency.
          </p>
        </div>
        <SearchBar autoFocus />
        <p className="text-sm text-black/40 dark:text-white/40">
          Single-platform reviews are stale and fragmented. We combine sources
          and surface what actually matters.
        </p>
      </div>
    </main>
  );
}
