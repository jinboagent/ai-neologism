import Link from "next/link";
import { Badge } from "@/components/badge";
import { alphabetWithCounts, listByLetter } from "@/lib/words";

export const dynamic = "force-dynamic";

export const metadata = { title: "A–Z Index" };

export default async function IndexPage() {
  const letters = alphabetWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Index of words</h1>
      <p className="mt-1 text-muted-foreground">Every published word, alphabetically.</p>

      {letters.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">The dictionary is still empty.</p>
          <Link href="/contribute" className="mt-2 inline-block text-primary hover:underline">
            Coin the first word →
          </Link>
        </div>
      ) : (
        <>
          <nav aria-label="Alphabet" className="mt-6 flex flex-wrap gap-2">
            {letters.map((l) => (
              <a
                key={l.letter}
                href={`#letter-${l.letter}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {l.letter}
              </a>
            ))}
          </nav>

          {letters.map((l) => {
            const words = listByLetter(l.letter);
            return (
              <section key={l.letter} id={`letter-${l.letter}`} className="mt-10 scroll-mt-20">
                <h2 className="word-title text-2xl font-bold text-primary">{l.letter}</h2>
                <ul className="mt-3 divide-y divide-border/70">
                  {words.map((w) => (
                    <li key={w.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                      <Link href={`/words/${w.slug}`} className="word-title text-lg font-bold hover:text-primary">
                        {w.word}
                      </Link>
                      <Badge kind={w.badge} />
                      <span className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1">{w.definition}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
