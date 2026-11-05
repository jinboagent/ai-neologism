import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { WordTable } from "@/components/word-table";
import { CATEGORIES } from "@/lib/categories";
import { alphabetWithCounts, countPublished, popularity } from "@/lib/words";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const total = await countPublished();
  const letters = await alphabetWithCounts();
  const trending = await popularity("trending", 8);
  const show = trending.length > 0 ? trending : await popularity("verified", 8);

  return (
    <div>
      {/* Slim hero band: title, search and actions in one compact strip so the
          dictionary itself starts almost immediately. */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center">
          <h1 className="word-title text-2xl font-bold text-foreground">
            Words for what we feel but can&apos;t name yet.
          </h1>
          <p className="mx-auto mt-1 max-w-3xl text-sm text-muted-foreground">
            AI coins new English words for emerging social phenomena. Novelty is search-verified. Humans review. The
            community votes on which words deserve to exist.
          </p>
          <div className="mx-auto mt-3 max-w-2xl">
            <SearchBox />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contribute"
              className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-deep transition-colors"
            >
              Coin a word
            </Link>
            <Link
              href="/index"
              className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary transition-colors"
            >
              Browse the A–Z index
            </Link>
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                {total} word{total === 1 ? "" : "s"} in the collection
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">{trending.length > 0 ? "Trending this week" : "Recently verified"}</h2>
          <Link href="/popularity" className="text-sm text-primary hover:underline">
            All popularity lenses →
          </Link>
        </div>
        {show.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-card p-5 text-muted-foreground">
            No words yet — <Link href="/contribute" className="text-primary hover:underline">coin the first one</Link>.
          </p>
        ) : (
          <div className="mt-2">
            <WordTable words={show} />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="text-lg font-bold">Browse by category</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/search?q=${encodeURIComponent(c)}`}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {letters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8">
          <h2 className="text-lg font-bold">A–Z</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {letters.map((l) => (
              <Link
                key={l.letter}
                href={`/index#letter-${l.letter}`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {l.letter}
                <span className="ml-1 text-xs text-muted-foreground">{l.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
