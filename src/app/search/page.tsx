import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { WordCard } from "@/components/word-card";
import { searchWords } from "@/lib/words";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? searchWords(query, 30) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Search</h1>
      <div className="mt-4 max-w-2xl">
        <SearchBox initial={query} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Full-text search across words, definitions, explanations, and coinage contexts — describe the phenomenon, not
        the word.
      </p>

      {query && (
        <p className="mt-6 text-sm text-muted-foreground" role="status">
          {results.length} result{results.length === 1 ? "" : "s"} for <strong>“{query}”</strong>
        </p>
      )}

      {query && results.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground">
          No word names this yet.{" "}
          <Link href="/contribute" className="text-primary hover:underline">
            Coin it →
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
      </div>
    </div>
  );
}
