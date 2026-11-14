import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, StatusPill } from "@/components/badge";
import { IconExternal } from "@/components/icons";
import { VoteWidget } from "@/components/vote-widget";
import { isSafeHttpUrl } from "@/lib/sanitize";
import { qAll } from "@/lib/db";
import { hashKey } from "@/lib/keys";
import { getWord, getWordFamily } from "@/lib/words";
import { localePath, LOCALE_NAMES, splitLinks, type Locale } from "@/lib/i18n/core";
import { familyAlternates } from "@/lib/i18n/meta";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Meta descriptions read best under ~160 characters; cut on a word boundary
// rather than mid-word, and never shorten below that if no space is found.
function metaDescription(text: string): string {
  if (text.length <= 160) return text;
  const slice = text.slice(0, 157);
  const space = slice.lastIndexOf(" ");
  return `${space > 100 ? slice.slice(0, space) : slice}…`;
}

/** Metadata for the word entry — shared by the root (EN) and [locale] routes. */
export async function buildWordMetadata(slug: string, locale: Locale, cookieKey?: string | null): Promise<Metadata> {
  const t = getDictionary(locale);
  const word = await getWord(slug, cookieKey ? hashKey(cookieKey) : null, locale);
  if (!word) return { title: t.wordNotFoundTitle, robots: { index: false } };
  const family = await getWordFamily(word.concept_id);
  return {
    title: word.word,
    description: metaDescription(word.definition),
    alternates: familyAlternates(locale, slug, family),
    openGraph: {
      type: "website",
      url: localePath(locale, `/words/${slug}`),
      title: word.word,
      description: metaDescription(word.definition),
    },
  };
}

/**
 * Dictionary-compact entry (option B): the headword line carries IPA, part of
 * speech and status; the definition is numbered; every further fact hangs off
 * a run-in bold label instead of a full-width section header, so the whole
 * entry fits in roughly one screen instead of four. Style-D adds the family
 * language row under the headword — the link layer for the concept family.
 */
export async function WordPage({ slug, locale, cookieKey }: { slug: string; locale: Locale; cookieKey?: string | null }) {
  const t = getDictionary(locale);
  const word = await getWord(slug, cookieKey ? hashKey(cookieKey) : null, locale);
  if (!word) notFound();

  const revisions = await qAll<{ id: number; summary: string; created_at: string }>(
    "SELECT id, summary, created_at FROM revisions WHERE word_id = ? ORDER BY id DESC",
    [word.id]
  );
  const family = word.status === "published" ? await getWordFamily(word.concept_id) : [];

  const v = word.verification;
  const whyParas = word.why_this_word.split(/\n\s*\n/).filter((p) => p.trim());
  const evidenceCount = v.closest_matches?.length ?? 0;
  const siblings = family.filter((f) => f.language !== locale);

  return (
    <article className="mx-auto max-w-4xl px-4 py-6">
      {word.status !== "published" && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft p-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={word.status} />
            <span className="text-sm text-warn">{t.wordPending}</span>
          </div>
          {word.status === "returned" && word.return_notes && (
            <p className="mt-2 text-sm">
              <strong>{t.wordReviewerNotes}</strong> {word.return_notes}
            </p>
          )}
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="word-title text-3xl font-bold text-foreground">{word.word}</h1>
          {word.pronunciation && <span className="text-muted-foreground">{word.pronunciation}</span>}
          <span className="text-sm italic text-muted-foreground">{word.part_of_speech}</span>
          <Badge kind={word.badge} />
        </div>
        {word.categories.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            {word.categories.map((c) => (
              <Link
                key={c}
                href={`/search?q=${encodeURIComponent(c)}`}
                className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary hover:underline"
              >
                {c}
              </Link>
            ))}
          </p>
        )}
      </header>

      {/* Style-D, entry half: which languages already have this concept — the
          family row. Only languages with a published sibling appear. */}
      {siblings.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t.alsoIn}:{" "}
          {siblings.map((f, i) => (
            <span key={f.language}>
              {i > 0 && " · "}
              <Link
                href={localePath(f.language as Locale, `/words/${f.slug}`)}
                className="font-medium text-primary hover:underline"
              >
                {f.word} <span className="text-muted-foreground">({LOCALE_NAMES[f.language as Locale]})</span>
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <div className="flex gap-2">
          <span className="word-title font-bold leading-[1.55]" aria-hidden="true">
            1.
          </span>
          <p className="definition-lead font-semibold">{word.definition}</p>
        </div>

        {word.explanation && (
          <div className="reading-col mt-2 text-[15px]">
            <Paragraphs text={word.explanation} />
          </div>
        )}

        {whyParas.length > 0 && (
          <div className="reading-col mt-3 text-[15px] text-muted-foreground">
            <p>
              <strong className="text-foreground">{t.wordEtym} </strong>
              {whyParas[0]}
            </p>
            {whyParas.slice(1).map((p, i) => (
              <p key={i} className="mt-1">
                {p}
              </p>
            ))}
          </div>
        )}

        {word.alternatives.length > 0 && (
          <p className="reading-col mt-3 text-sm leading-relaxed">
            <strong>{t.wordAlso} </strong>
            {word.alternatives.map((a, i) => (
              <span key={a.word}>
                {i > 0 && " · "}
                <span className="word-title font-bold">{a.word}</span>
                <span className="text-muted-foreground"> ({a.rationale})</span>
              </span>
            ))}
          </p>
        )}

        {word.related_words.length > 0 && (
          <p className="mt-3 text-sm leading-relaxed">
            <strong>{t.wordRel} </strong>
            {word.related_words.map((s, i) => (
              <span key={s}>
                {i > 0 && " · "}
                <Link href={localePath(locale, `/words/${s}`)} className="word-title font-bold text-primary hover:underline">
                  {s.replace(/-/g, " ")}
                </Link>
              </span>
            ))}
          </p>
        )}

        {word.references.length > 0 && (
          <div className="mt-3 text-sm leading-relaxed">
            <strong>{t.wordRefs}</strong>
            <ol className="mt-0.5 space-y-0.5">
              {word.references.map((r, i) => (
                <li key={i} className="pl-7 -indent-7">
                  <span className="tabular-nums text-muted-foreground">[{i + 1}]</span>{" "}
                  <span className="rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">
                    {t.refLabels[r.type] ?? r.type}
                  </span>{" "}
                  {r.url && isSafeHttpUrl(r.url) ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {r.title}
                    </a>
                  ) : (
                    <span className="font-medium">{r.title}</span>
                  )}
                  {r.outlet && <span className="text-muted-foreground"> · {r.outlet}</span>}
                  {r.author && <span className="text-muted-foreground"> · {r.author}</span>}
                  {r.date && <span className="text-muted-foreground"> · {r.date}</span>}
                  {r.excerpt && (
                    <span className="block border-l-2 border-border pl-3 text-xs italic text-muted-foreground">
                      {r.excerpt}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Novelty evidence: one compact line plus a collapsible log — the full
            query table and closest matches stay available but out of the way. */}
        <div className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <p>
            <strong>
              {t.wordNovelty} {v.verdict.replace("_", " ")}
            </strong>
            {v.checked_at && <span className="text-muted-foreground"> · {t.wordChecked} {v.checked_at}</span>}
          </p>
          {v.note && <p className="text-muted-foreground">{v.note}</p>}
          <details className="mt-1">
            <summary className="text-sm text-primary">{t.wordEvidence(evidenceCount)}</summary>
            {evidenceCount > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {v.closest_matches!.map((m, i) => (
                  <li key={i} className="pl-7 -indent-7 text-muted-foreground">
                    {m.url && isSafeHttpUrl(m.url) ? (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                        {safeHost(m.url)}
                        <IconExternal className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      "— "
                    )}
                    {m.note}
                  </li>
                ))}
              </ul>
            )}
            {v.queries && v.queries.length > 0 ? (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-4 font-medium">{t.thQuery}</th>
                    <th className="pr-4 font-medium">{t.thChecked}</th>
                    <th className="font-medium">{t.thSame}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.queries.map((q, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="pr-4 py-1 font-mono text-xs">{q.query}</td>
                      <td className="pr-4 py-1 tabular-nums">{q.results_checked}</td>
                      <td className="py-1 tabular-nums">{q.meaningful_matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t.wordNoQueryLog}</p>
            )}
            {v.method && <p className="mt-2 text-xs text-muted-foreground">{t.wordMethod} {v.method}</p>}
          </details>
        </div>

        {word.status === "published" && (
          <div className="mt-4 border-y border-border py-3">
            <VoteWidget slug={word.slug} initialUse={word.use_votes} initialWork={word.work_votes} locale={locale} />
          </div>
        )}
      </div>

      <footer className="mt-6 border-t border-border pt-3 text-sm text-muted-foreground">
        <p>
          {t.wordCoinedBy}
          {word.ai_assisted && ` · ${t.wordAiAssisted}`} · {t.wordFirstSubmitted} {word.created_at.slice(0, 10)}
          {word.published_at && ` · ${t.wordPublishedOn} ${word.published_at.slice(0, 10)}`}
        </p>
        <details className="mt-1">
          <summary className="text-primary">{t.wordRevisions(revisions.length)}</summary>
          <ul className="mt-2 space-y-1">
            {revisions.map((r) => (
              <li key={r.id}>
                <span className="tabular-nums text-muted-foreground/80">{r.created_at.slice(0, 16).replace("T", " ")}</span>{" "}
                — {r.summary}
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </article>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className={`mt-1 ${className}`}>
          {p}
        </p>
      ))}
    </>
  );
}

/** Renders dictionary prose that may embed [[label|href]] link tokens. */
export function Prose({ locale, text }: { locale: Locale; text: string }) {
  return (
    <>
      {splitLinks(text).map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <Link key={i} href={localePath(locale, seg.href)} className="text-primary hover:underline">
            {seg.label}
          </Link>
        )
      )}
    </>
  );
}
