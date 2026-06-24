import Link from "next/link";
import IncentivesView from "@/components/IncentivesView";

export default function IncentivesPage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-2xl font-bold tracking-tight w-fit">
          REVU
        </Link>
        <h1 className="text-xl font-semibold">Review perks nearby</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Restaurants offering a little something for leaving an honest review.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-400/10 dark:border-amber-400/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        These perks are for <strong>honest</strong> reviews, not positive ones.
        Incentivized reviews should be disclosed per FTC guidance and may conflict
        with some platforms&rsquo; terms of service.
      </div>

      <IncentivesView />
    </main>
  );
}
