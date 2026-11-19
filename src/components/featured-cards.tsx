import Link from "next/link";
import type { Word } from "@/lib/words";
import { localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

/**
 * Editor's-picks wall for the homepage: the curated entries with their full
 * definitions on first paint, so a first-time visitor understands what the
 * site is without clicking. Complements (does not replace) the dense
 * dictionary table further down — cards carry the colour, the table carries
 * the dictionary's compact identity.
 */
export function FeaturedCards({ words, locale = "en" }: { words: Word[]; locale?: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {words.map((w) => (
        <div key={w.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={localePath(locale, `/words/${w.slug}`)}
              className="word-title text-lg font-bold text-primary hover:underline"
            >
              {w.word}
            </Link>
            {w.pronunciation && <span className="text-xs text-muted-foreground">{w.pronunciation}</span>}
            <span className="text-xs uppercase tracking-wide text-muted-foreground/70">{w.part_of_speech}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{w.definition}</p>
          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="tabular-nums text-muted-foreground" aria-hidden>
              <span className="text-good">✓ {w.use_votes}</span>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-warn/80">✗ {w.work_votes}</span>
            </span>
            <Link href={localePath(locale, `/words/${w.slug}`)} className="text-primary hover:underline">
              {t.homeFeaturedCta}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
