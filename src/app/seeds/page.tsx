"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IconSparkle } from "@/components/icons";
import {
  EMPTY_FORM,
  ResultPanel,
  WordForm,
  type Candidate,
  type FormState,
  type SubmitResult,
} from "@/components/word-form";

type Seed = {
  id: number;
  url: string;
  note: string;
  status: string;
  slug: string | null;
  created_at: string;
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<Seed[] | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [keyNotice, setKeyNotice] = useState<string | null>(null);

  // one coining flow active at a time
  const [coiningId, setCoiningId] = useState<number | null>(null);
  const [coinError, setCoinError] = useState<string | null>(null);
  const [activeSeed, setActiveSeed] = useState<Seed | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alternatives, setAlternatives] = useState<Candidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/seeds");
    if (res.ok) {
      const data = await res.json();
      setSeeds(data.seeds ?? []);
    } else {
      setSeeds([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSeed(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    setKeyNotice(null);
    try {
      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.message ?? data.error ?? "Could not add the seed.");
        return;
      }
      if (data.key) setKeyNotice(data.key);
      setUrl("");
      setNote("");
      await load();
    } catch {
      setAddError("Network error — try again.");
    } finally {
      setAdding(false);
    }
  }

  async function coin(seed: Seed) {
    setCoiningId(seed.id);
    setCoinError(null);
    setResult(null);
    setCandidates([]);
    setActiveSeed(seed);
    setForm(EMPTY_FORM);
    try {
      const res = await fetch("/api/coin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: seed.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Coining failed");
      setCandidates(data.candidates ?? []);
    } catch (e) {
      setCoinError(e instanceof Error ? e.message : "Coining failed");
    } finally {
      setCoiningId(null);
    }
  }

  function pick(c: Candidate) {
    setAlternatives(candidates.filter((x) => x.word !== c.word));
    setForm({
      ...EMPTY_FORM,
      word: c.word,
      definition: c.suggested_definition,
      why_this_word: `${c.rationale}\n\nEtymology: ${c.etymology}`,
      ai_assisted: true,
    });
  }

  async function submit() {
    if (!activeSeed) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: form.word,
          definition: form.definition,
          pronunciation: form.pronunciation,
          part_of_speech: form.part_of_speech,
          explanation: form.explanation,
          why_this_word: form.why_this_word,
          categories: form.categories,
          references: form.references.filter((r) => r.title.trim()),
          related_words: form.related.split(",").map((s) => s.trim()).filter(Boolean),
          ai_assisted: true,
          input_type: "ai",
          alternatives: alternatives.map((c) => ({ word: c.word, rationale: c.rationale })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, word: form.word, slug: data.slug, badge: data.badge, key: data.key });
        await fetch(`/api/seeds/${activeSeed.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "coined", slug: data.slug }),
        });
        await load();
      } else {
        setResult({ ok: false, error: data.error ?? "SUBMIT_FAILED", message: data.message, verification: data.verification });
      }
    } catch {
      setResult({ ok: false, error: "NETWORK", message: "Network error — try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function dismiss(seed: Seed) {
    await fetch(`/api/seeds/${seed.id}`, { method: "DELETE" });
    if (activeSeed?.id === seed.id) resetFlow();
    await load();
  }

  function resetFlow() {
    setActiveSeed(null);
    setCandidates([]);
    setForm(EMPTY_FORM);
    setAlternatives([]);
    setResult(null);
    setCoinError(null);
  }

  const pending = (seeds ?? []).filter((s) => s.status === "pending");
  const coined = (seeds ?? []).filter((s) => s.status === "coined");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Seed queue</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Your private harvest list. Park links to naming-gap articles, slang threads, and papers here — then coin them
        one at a time. Not sure where to hunt?{" "}
        <Link href="/sources" className="text-primary hover:underline">
          Read the Sources guide
        </Link>
        .
      </p>

      <form onSubmit={addSeed} className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="sr-only">Link to harvest</span>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… article, thread, or paper"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="sr-only">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this coinable? (optional)"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="min-h-11 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add seed"}
        </button>
      </form>
      {addError && (
        <p role="alert" className="mt-2 rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
          {addError}
        </p>
      )}
      {keyNotice && (
        <div className="mt-2 rounded-lg border border-warn/40 bg-warn-soft p-3">
          <p className="text-sm font-medium text-warn">Contribution key issued (shown once — save it):</p>
          <code className="mt-1 block break-all rounded bg-card px-2 py-1 text-xs">{keyNotice}</code>
        </div>
      )}

      {/* ------------------------------ coining flow ------------------------------ */}
      {activeSeed && (
        <section aria-label="Coining flow" className="mt-8 rounded-xl border border-primary/40 bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              Coining from <span className="text-primary">{domainOf(activeSeed.url)}</span>
            </h2>
            <button type="button" onClick={resetFlow} className="text-sm text-muted-foreground hover:text-bad cursor-pointer">
              Cancel ✕
            </button>
          </div>

          {coinError && (
            <p role="alert" className="mt-3 rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
              {coinError}
              {coinError.includes("not configured") && " — set AI_API_KEY in .env.local, or coin this seed manually via Contribute."}
            </p>
          )}

          {candidates.length > 0 && !form.word && !result?.ok && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {candidates.length} candidates proposed. Pick one — the rest are recorded as “alternatives considered”.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {candidates.map((c) => (
                  <button
                    key={c.word}
                    type="button"
                    onClick={() => pick(c)}
                    className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary transition-colors cursor-pointer"
                  >
                    <p className="word-title text-lg font-bold text-primary">{c.word}</p>
                    <p className="mt-1 text-sm">{c.suggested_definition}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{c.rationale}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.word && !result?.ok && (
            <div className="mt-4">
              <WordForm form={form} setForm={setForm} onSubmit={submit} submitting={submitting} submitLabel="Submit for review" />
            </div>
          )}

          {result && (
            <>
              <ResultPanel result={result} />
              {result.ok && (
                <button type="button" onClick={resetFlow} className="mt-3 text-sm text-primary hover:underline cursor-pointer">
                  ← Back to the seed queue
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* -------------------------------- seed list ------------------------------- */}
      {seeds === null ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : seeds.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No seeds yet. Harvest a few links from the{" "}
            <Link href="/sources" className="text-primary hover:underline">
              Sources guide
            </Link>{" "}
            and park them here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section aria-label="Pending seeds">
            <h2 className="text-lg font-bold">Pending ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                All coined. Time for another harvest.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {pending.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-medium text-primary">{domainOf(s.url)}</p>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-primary">
                      {s.url}
                    </a>
                    {s.note && <p className="mt-1 text-sm">{s.note}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => coin(s)}
                        disabled={coiningId !== null}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-medium text-primary hover:bg-primary-soft transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <IconSparkle /> {coiningId === s.id ? "Reading the page…" : "Coin with AI"}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss(s)}
                        className="min-h-11 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:border-bad hover:text-bad transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Coined seeds">
            <h2 className="text-lg font-bold">Coined ({coined.length})</h2>
            {coined.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                Words you coin from seeds will be listed here.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {coined.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-medium text-primary">{domainOf(s.url)}</p>
                    {s.slug ? (
                      <Link href={`/words/${s.slug}`} className="word-title mt-0.5 inline-block text-sm font-bold text-primary hover:underline">
                        {s.slug.replace(/-/g, " ")} →
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">coined</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
