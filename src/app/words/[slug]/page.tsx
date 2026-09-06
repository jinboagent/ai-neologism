import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, StatusPill } from "@/components/badge";
import { IconExternal } from "@/components/icons";
import { VoteWidget } from "@/components/vote-widget";
import { getDb } from "@/lib/db";
import { KEY_COOKIE, hashKey } from "@/lib/keys";
import { getWord } from "@/lib/words";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const jar = await cookies();
  const cookieKey = jar.get(KEY_COOKIE)?.value;
  const word = getWord(slug, cookieKey ? hashKey(cookieKey) : null);
  if (!word) return { title: "Word not found" };
  return { title: word.word, description: word.definition };
}

const REF_LABEL: Record<string, string> = {
  news: "News article",
  academic: "Academic",
  essay: "Essay",
  social: "Social post",
  internal: "On this site",
};

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className="mt-4">
          {p}
        </p>
      ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-border pb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function WordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jar = await cookies();
  const cookieKey = jar.get(KEY_COOKIE)?.value;
  const word = getWord(slug, cookieKey ? hashKey(cookieKey) : null);
  if (!word) notFound();

  const revisions = getDb()
    .prepare("SELECT id, summary, created_at FROM revisions WHERE word_id = ? ORDER BY id DESC")
    .all(word.id) as { id: number; summary: string; created_at: string }[];

  const v = word.verification;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {word.status !== "published" && (
        <div className="mb-6 rounded-xl border border-warn/40 bg-warn-soft p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={word.status} />
            <span className="text-sm text-warn">
              Only you (and reviewers) can see this page until it is published.
            </span>
          </div>
          {word.status === "returned" && word.return_notes && (
            <p className="mt-2 text-sm">
              <strong>Reviewer notes:</strong> {word.return_notes}
            </p>
          )}
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="word-title text-4xl font-bold text-foreground">{word.word}</h1>
          {word.pronunciation && <span className="text-lg text-muted-foreground">{word.pronunciation}</span>}
          <span className="text-sm italic text-muted-foreground">{word.part_of_speech}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge kind={word.badge} />
          {word.categories.map((c) => (
            <span key={c} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary">
              {c}
            </span>
          ))}
        </div>
      </header>

      <Section title="Definition">
        <p className="definition-lead font-semibold">{word.definition}</p>
      </Section>

      {word.explanation && (
        <Section title="Explanation">
          <div className="reading-col">
            <Paragraphs text={word.explanation} />
          </div>
        </Section>
      )}

      {word.why_this_word && (
        <Section title="Why this word">
          <div className="reading-col rounded-xl border border-border bg-card p-4 text-muted-foreground">
            <Paragraphs text={word.why_this_word} />
          </div>
        </Section>
      )}

      {word.alternatives.length > 0 && (
        <Section title="Alternatives considered">
          <ul className="space-y-2">
            {word.alternatives.map((a) => (
              <li key={a.word} className="text-sm">
                <span className="word-title font-bold">{a.word}</span>
                <span className="text-muted-foreground"> — {a.rationale}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Verification">
        <div className="rounded-xl border border-border bg-card p-4">
          <p>
            <strong>Verdict: {v.verdict.replace("_", " ")}</strong>
            {v.checked_at && <span className="text-muted-foreground"> · checked {v.checked_at}</span>}
          </p>
          {v.note && <p className="mt-1 text-sm text-muted-foreground">{v.note}</p>}
          {v.closest_matches && v.closest_matches.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {v.closest_matches.map((m, i) => (
                <li key={i} className="text-muted-foreground">
                  {m.url ? (
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
          <details className="mt-3">
            <summary className="text-sm text-primary">View full search-evidence log</summary>
            {v.queries && v.queries.length > 0 ? (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-4 font-medium">Query</th>
                    <th className="pr-4 font-medium">Results checked</th>
                    <th className="font-medium">Same-sense matches</th>
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
              <p className="mt-2 text-sm text-muted-foreground">No query log recorded.</p>
            )}
            {v.method && <p className="mt-2 text-xs text-muted-foreground">Method: {v.method}</p>}
          </details>
        </div>
      </Section>

      {word.references.length > 0 && (
        <Section title="References">
          <ol className="space-y-3">
            {word.references.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {REF_LABEL[r.type] ?? r.type}
                </span>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                    {r.title}
                  </a>
                ) : (
                  <span className="font-medium">{r.title}</span>
                )}
                {r.outlet && <span className="text-muted-foreground"> · {r.outlet}</span>}
                {r.author && <span className="text-muted-foreground"> · {r.author}</span>}
                {r.date && <span className="text-muted-foreground"> · {r.date}</span>}
                {r.excerpt && <p className="mt-1 border-l-2 border-border pl-3 italic text-muted-foreground">{r.excerpt}</p>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {word.status === "published" && (
        <Section title="Community">
          <VoteWidget slug={word.slug} initialUse={word.use_votes} initialWork={word.work_votes} />
        </Section>
      )}

      {word.related_words.length > 0 && (
        <Section title="Related words">
          <div className="flex flex-wrap gap-2">
            {word.related_words.map((slug) => (
              <Link
                key={slug}
                href={`/words/${slug}`}
                className="word-title rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold text-primary hover:border-primary transition-colors"
              >
                {slug.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        </Section>
      )}

      <footer className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
        <p>
          Coined by an anonymous contributor{word.ai_assisted && " · AI-assisted"} · first submitted {word.created_at.slice(0, 10)}
          {word.published_at && ` · published ${word.published_at.slice(0, 10)}`}
        </p>
        <details className="mt-2">
          <summary className="text-primary">Revision history ({revisions.length})</summary>
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
