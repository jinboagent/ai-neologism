import Link from "next/link";
import { WordTable } from "@/components/word-table";
import { alphabetWithCounts, listByLetter } from "@/lib/words";
import type { Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

export async function IndexPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const letters = await alphabetWithCounts(locale);

  const sections = await Promise.all(
    letters.map(async (l) => ({ letter: l.letter, words: await listByLetter(l.letter, locale) }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="word-title text-2xl font-bold">{t.indexTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.indexSub}</p>

      {letters.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">{t.indexEmpty}</p>
          <Link href="/contribute" className="mt-2 inline-block text-primary hover:underline">
            {t.indexCoinFirst}
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
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{t.indexCount(words.length)}</span>
                </h2>
                <div className="mt-1">
                  <WordTable words={words} showDate={false} locale={locale} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
