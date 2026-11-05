import Link from "next/link";
import { WordTable } from "@/components/word-table";
import { alphabetWithCounts, listByLetter } from "@/lib/words";

export const dynamic = "force-dynamic";

export const metadata = { title: "A–Z Index" };

export default async function IndexPage() {
  const letters = await alphabetWithCounts();

  const sections = await Promise.all(
    letters.map(async (l) => ({ letter: l.letter, words: await listByLetter(l.letter) }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="word-title text-2xl font-bold">Index of words</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every published word, alphabetically.</p>

      {letters.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">The dictionary is still empty.</p>
          <Link href="/contribute" className="mt-2 inline-block text-primary hover:underline">
            Coin the first word →
          </Link>
        </div>
      ) : (
        <>
          <nav aria-label="Alphabet" className="mt-4 flex flex-wrap gap-1.5">
            {letters.map((l) => (
              <a
                key={l.letter}
                href={`#letter-${l.letter}`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {l.letter}
              </a>
            ))}
          </nav>

          {sections.map((l) => {
            const words = l.words;
            return (
              <section key={l.letter} id={`letter-${l.letter}`} className="mt-6 scroll-mt-20">
                <h2 className="word-title text-xl font-bold text-primary">
                  {l.letter}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {words.length} word{words.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <div className="mt-1">
                  <WordTable words={words} showDate={false} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
