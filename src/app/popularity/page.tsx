import Link from "next/link";
import { Badge } from "@/components/badge";
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
  const words = popularity(lens, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Popularity</h1>
      <p className="mt-1 text-muted-foreground">Four lenses, so new words can still surface.</p>

      <nav aria-label="Popularity lenses" className="mt-6 flex flex-wrap gap-2">
        {LENSES.map((l) => (
          <Link
            key={l.key}
            href={`/popularity?lens=${l.key}`}
            aria-current={l.key === lens ? "page" : undefined}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              l.key === lens
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-muted-foreground">{active.blurb}</p>

      {words.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground">
          Nothing here yet. Votes and fresh words will fill this page.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {words.map((w, i) => (
            <li key={w.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <span className="word-title text-2xl font-bold text-muted-foreground/50 tabular-nums w-8 text-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/words/${w.slug}`} className="word-title text-lg font-bold text-primary hover:underline">
                    {w.word}
                  </Link>
                  <Badge kind={w.badge} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{w.definition}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {w.use_votes} would use · {w.work_votes} needs work
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
