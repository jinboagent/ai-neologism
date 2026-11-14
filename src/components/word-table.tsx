import Link from "next/link";
import type { Word } from "@/lib/words";
import { localePath, type Locale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";

/**
 * The dictionary-compact list row (option B): one line per word — serif
 * headword link, one-line gloss, both vote counts and the add date. Replaces
 * the card grid on the home, index, popularity and search pages so a screen
 * holds roughly four times as many words.
 */
export function WordTable({
  words,
  showDate = true,
  numbered = false,
  locale = "en",
}: {
  words: Word[];
  showDate?: boolean;
  numbered?: boolean;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
          {numbered && <th scope="col" className="w-8 py-1.5 pr-2 font-medium" aria-label={t.thRank} />}
          <th scope="col" className="py-1.5 pr-3 font-medium">{t.thWord}</th>
          <th scope="col" className="hidden py-1.5 pr-3 font-medium sm:table-cell">{t.thGloss}</th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium tabular-nums" aria-label={t.voteUse}>
            ✓
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium tabular-nums" aria-label={t.voteWork}>
            ✗
          </th>
          {showDate && <th scope="col" className="hidden py-1.5 font-medium md:table-cell">{t.thAdded}</th>}
        </tr>
      </thead>
      <tbody>
        {words.map((w, i) => (
          <tr key={w.id} className="border-b border-border/50 hover:bg-primary-soft/40">
            {numbered && (
              <td className="py-1.5 pr-2 tabular-nums text-muted-foreground/60">{i + 1}</td>
            )}
            <td className="py-1.5 pr-3 align-top">
              <Link
                href={localePath(locale, `/words/${w.slug}`)}
                className="word-title whitespace-nowrap font-bold text-primary hover:underline"
              >
                {w.word}
              </Link>
              {/* On narrow screens the gloss column is hidden; keep the text available to
                  screen readers and as the row's tap target title. */}
              <span className="sr-only sm:hidden"> — {w.definition}</span>
            </td>
            <td className="hidden max-w-[28rem] truncate py-1.5 pr-3 align-top text-muted-foreground sm:table-cell" title={w.definition}>
              {w.definition}
            </td>
            <td className="py-1.5 pr-3 text-right align-top tabular-nums text-good" aria-label={t.useAria(w.use_votes)}>
              {w.use_votes}
            </td>
            <td className="py-1.5 pr-3 text-right align-top tabular-nums text-warn/80" aria-label={t.workAria(w.work_votes)}>
              {w.work_votes}
            </td>
            {showDate && (
              <td className="hidden py-1.5 align-top tabular-nums text-muted-foreground/80 md:table-cell">
                {w.published_at ? w.published_at.slice(0, 10) : ""}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
