import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { WordCard } from "@/components/word-card";
import { CATEGORIES } from "@/lib/categories";
import { alphabetWithCounts, countPublished, popularity } from "@/lib/words";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const total = countPublished();
  const letters = alphabetWithCounts();
  const trending = popularity("trending", 6);
  const show = trending.length > 0 ? trending : popularity("verified", 6);

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h1 className="word-title text-3xl sm:text-4xl font-bold text-foreground">
            Words for what we feel but can&apos;t name yet.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            AI coins new English words for emerging social phenomena. Novelty is search-verified. Humans review. The
            community votes on which words deserve to exist.
          </p>
          <div className="mx-auto mt-6 max-w-2xl">
            <SearchBox />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-deep transition-colors"
            >
              Coin a word
            </Link>
            <Link
              href="/index"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-medium hover:border-primary transition-colors"
            >
              Browse the A–Z index
            </Link>
          </div>
          {total > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {total} word{total === 1 ? "" : "s"} in the collection
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">{trending.length > 0 ? "Trending this week" : "Recently verified"}</h2>
          <Link href="/popularity" className="text-sm text-primary hover:underline">
            All popularity lenses →
          </Link>
        </div>
        {show.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground">
            No words yet — <Link href="/contribute" className="text-primary hover:underline">coin the first one</Link>.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {show.map((w) => (
              <WordCard key={w.id} word={w} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="text-xl font-bold">Browse by category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/search?q=${encodeURIComponent(c)}`}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {letters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-xl font-bold">A–Z</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {letters.map((l) => (
              <Link
                key={l.letter}
                href={`/index#letter-${l.letter}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary transition-colors"
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
