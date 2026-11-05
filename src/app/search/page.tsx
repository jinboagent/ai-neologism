import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { WordTable } from "@/components/word-table";
import { searchWords } from "@/lib/words";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchWords(query, 30) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="word-title text-2xl font-bold">Search</h1>
      <div className="mt-3 max-w-2xl">
        <SearchBox initial={query} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Full-text search across words, definitions, explanations, and coinage contexts — describe the phenomenon, not
        the word.
      </p>

      {query && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {results.length} result{results.length === 1 ? "" : "s"} for <strong>“{query}”</strong>
        </p>
      )}

      {query && results.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-card p-5 text-muted-foreground">
          No word names this yet.{" "}
          <Link href="/contribute" className="text-primary hover:underline">
            Coin it →
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4">
          <WordTable words={results} />
        </div>
      )}
    </div>
  );
}
