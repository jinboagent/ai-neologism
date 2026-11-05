import Link from "next/link";
import { WordTable } from "@/components/word-table";
import { popularity, type PopularityLens } from "@/lib/words";

export const dynamic = "force-dynamic";

export const metadata = { title: "Popularity" };

const LENSES: { key: PopularityLens; label: string; blurb: string }[] = [
  { key: "trending", label: "Trending this week", blurb: "Words gaining the most votes in the last 7 days." },
  { key: "endorsed", label: "Most endorsed", blurb: "Words the most people would actually use." },
  { key: "contested", label: "Most contested", blurb: "High would-use AND needs-work — often the most interesting words." },
  { key: "verified", label: "Recently verified", blurb: "The newest published words." },
];

export default async function PopularityPage({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: raw } = await searchParams;
  const lens = (LENSES.some((l) => l.key === raw) ? raw : "trending") as PopularityLens;
  const active = LENSES.find((l) => l.key === lens)!;
  const words = await popularity(lens, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="word-title text-2xl font-bold">Popularity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Four lenses, so new words can still surface.</p>

      <nav aria-label="Popularity lenses" className="mt-4 flex flex-wrap gap-1.5">
        {LENSES.map((l) => (
          <Link
            key={l.key}
            href={`/popularity?lens=${l.key}`}
            aria-current={l.key === lens ? "page" : undefined}
            className={`min-h-9 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              l.key === lens
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-sm text-muted-foreground">{active.blurb}</p>

      {words.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-border bg-card p-5 text-muted-foreground">
          Nothing here yet. Votes and fresh words will fill this page.
        </p>
      ) : (
        <div className="mt-4">
          <WordTable words={words} numbered />
        </div>
      )}
    </div>
  );
}
