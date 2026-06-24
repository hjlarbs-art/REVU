import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ResultsView from "@/components/ResultsView";

// In Next 16, searchParams is a Promise and must be awaited.
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const location = typeof params.loc === "string" ? params.loc : undefined;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link href="/" className="text-2xl font-bold tracking-tight w-fit">
          REVU
        </Link>
        <SearchBar initialQuery={query} initialLocation={location ?? ""} />
      </header>

      {query ? (
        <ResultsView query={query} location={location} />
      ) : (
        <p className="text-black/60 dark:text-white/60">
          Enter a business name or type above to see blended reviews.
        </p>
      )}
    </main>
  );
}
