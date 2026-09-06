"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/badge";
import { IconSparkle } from "@/components/icons";
import { CATEGORIES } from "@/lib/categories";

export default function ContributePage() {
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Contribute a word</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Only the word and its definition are required — everything else can be filled in later by you or the community.
        Every submission passes novelty verification and a human review.
      </p>

      <div role="tablist" aria-label="Contribution paths" className="mt-6 flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={tab === "manual"}
          onClick={() => setTab("manual")}
          className={`min-h-11 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "manual" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          I have a word
        </button>
        <button
          role="tab"
          aria-selected={tab === "ai"}
          onClick={() => setTab("ai")}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "ai" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          <IconSparkle /> Coin with AI
        </button>
      </div>

      <div className="mt-6">{tab === "manual" ? <ManualPath /> : <AiPath />}</div>
    </div>
  );
}

/* ---------------------------------- types --------------------------------- */

type Candidate = { word: string; etymology: string; rationale: string; suggested_definition: string };
type RefRow = { type: string; title: string; url: string; author: string; outlet: string; date: string; excerpt: string };
type Verification = {
  verdict: "NEW" | "NEAR_EXISTING" | "EXISTS" | "UNVERIFIED";
  checked_at?: string;
  note?: string;
  closest_matches?: { url?: string; note: string }[];
};

type FormState = {
  word: string;
  definition: string;
  pronunciation: string;
  part_of_speech: string;
  explanation: string;
  why_this_word: string;
  categories: string[];
  references: RefRow[];
  related: string;
  ai_assisted: boolean;
};

const EMPTY_FORM: FormState = {
  word: "",
  definition: "",
  pronunciation: "",
  part_of_speech: "noun",
  explanation: "",
  why_this_word: "",
  categories: [],
  references: [],
  related: "",
  ai_assisted: false,
};

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ------------------------------ result panel ------------------------------ */

function ResultPanel({ result }: { result: SubmitResult }) {
  if (result.ok) {
    return (
      <div className="mt-6 rounded-xl border border-good/40 bg-good-soft p-4">
        <p className="font-medium text-good">
          Submitted — <strong>{result.word}</strong> is now in the review queue.
        </p>
        <p className="mt-1 text-sm text-good/90">
          Badge: <Badge kind={result.badge ?? "unverified"} />
        </p>
        {result.key && (
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn-soft p-3">
            <p className="text-sm font-medium text-warn">
              Your contribution key (shown once — save it somewhere safe; lost key = lost standing):
            </p>
            <code className="mt-1 block break-all rounded bg-card px-2 py-1 text-xs">{result.key}</code>
            <p className="mt-1 text-xs text-warn/80">
              It is also stored in this browser. Review rights unlock after 3 accepted words.
            </p>
          </div>
        )}
        {result.slug && (
          <Link href={`/words/${result.slug}`} className="mt-3 inline-block text-sm text-primary hover:underline">
            View your word page →
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-xl border border-bad/40 bg-bad-soft p-4">
      <p className="font-medium text-bad">{result.error}</p>
      {result.message && <p className="mt-1 text-sm text-bad/90">{result.message}</p>}
      {result.verification && (
        <p className="mt-2 text-sm">
          Search verdict: <strong>{result.verification.verdict}</strong>
          {result.verification.note ? ` — ${result.verification.note}` : ""}
        </p>
      )}
    </div>
  );
}

type SubmitResult = {
  ok: boolean;
  word?: string;
  slug?: string;
  badge?: string;
  key?: string;
  error?: string;
  message?: string;
  verification?: Verification;
};

/* ------------------------------- shared form ------------------------------ */

function WordForm({
  form,
  setForm,
  onSubmit,
  submitting,
  submitLabel,
  children,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm({ ...form, [key]: value });
  const toggleCategory = (c: string) =>
    set("categories", form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      {children}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="Word" hint="required — 2 to 80 characters">
            <input className={inputCls} value={form.word} onChange={(e) => set("word", e.target.value)} required minLength={2} maxLength={80} />
          </Field>
        </div>
        <Field label="Part of speech">
          <select className={inputCls} value={form.part_of_speech} onChange={(e) => set("part_of_speech", e.target.value)}>
            {["noun", "verb", "adjective", "adverb", "phrase"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Definition" hint="required — one dictionary-style sentence">
        <textarea
          className={inputCls}
          rows={2}
          value={form.definition}
          onChange={(e) => set("definition", e.target.value)}
          required
          minLength={10}
          maxLength={600}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pronunciation" hint="IPA, optional">
          <input className={inputCls} value={form.pronunciation} onChange={(e) => set("pronunciation", e.target.value)} placeholder="/ˈɡreɪˌwɒʃɪŋ/" />
        </Field>
        <Field label="Related words" hint="slugs, comma-separated, optional">
          <input className={inputCls} value={form.related} onChange={(e) => set("related", e.target.value)} placeholder="impact-laundering" />
        </Field>
      </div>

      <Field label="Explanation" hint="the article body — 2 to 5 paragraphs, optional">
        <textarea className={inputCls} rows={5} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />
      </Field>

      <Field label="Why this word" hint="the news snippet or phenomenon that inspired it, optional">
        <textarea className={inputCls} rows={3} value={form.why_this_word} onChange={(e) => set("why_this_word", e.target.value)} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Categories</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCategory(c)}
              aria-pressed={form.categories.includes(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                form.categories.includes(c) ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">References</legend>
        <p className="text-xs text-muted-foreground">News articles, papers, essays… Excerpts preserve evidence when links rot.</p>
        {form.references.map((r, i) => (
          <div key={i} className="mt-3 grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-6">
            <select
              className={`${inputCls} sm:col-span-1`}
              value={r.type}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, type: e.target.value };
                set("references", refs);
              }}
            >
              {["news", "academic", "essay", "social", "internal"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Title"
              value={r.title}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, title: e.target.value };
                set("references", refs);
              }}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="URL"
              value={r.url}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, url: e.target.value };
                set("references", refs);
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-border px-3 text-sm text-muted-foreground hover:border-bad hover:text-bad transition-colors cursor-pointer"
              onClick={() => set("references", form.references.filter((_, j) => j !== i))}
            >
              Remove
            </button>
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Author"
              value={r.author}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, author: e.target.value };
                set("references", refs);
              }}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Outlet / site"
              value={r.outlet}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, outlet: e.target.value };
                set("references", refs);
              }}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Date (YYYY-MM-DD)"
              value={r.date}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, date: e.target.value };
                set("references", refs);
              }}
            />
            <textarea
              className={`${inputCls} sm:col-span-6`}
              rows={2}
              placeholder="Excerpt (preserves the evidence if the link rots)"
              value={r.excerpt}
              onChange={(e) => {
                const refs = [...form.references];
                refs[i] = { ...r, excerpt: e.target.value };
                set("references", refs);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("references", [...form.references, { type: "news", title: "", url: "", author: "", outlet: "", date: "", excerpt: "" }])}
          className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary transition-colors cursor-pointer"
        >
          + Add reference
        </button>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.ai_assisted} onChange={(e) => set("ai_assisted", e.target.checked)} className="h-4 w-4" />
        This word was coined with AI assistance
      </label>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="text-sm font-medium text-primary">Preview before publish</summary>
        <div className="mt-3">
          <p className="word-title text-2xl font-bold">{form.word || "your-word"}</p>
          <p className="definition-lead mt-2 font-semibold">{form.definition || "Your one-sentence definition appears here."}</p>
          {form.explanation && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{form.explanation}</p>}
        </div>
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-60"
      >
        {submitting ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}

/* ------------------------------ manual path ------------------------------- */

function ManualPath() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
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
          ai_assisted: form.ai_assisted,
          input_type: "form",
        }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? { ok: true, word: form.word, slug: data.slug, badge: data.badge, key: data.key }
          : { ok: false, error: data.error ?? "SUBMIT_FAILED", message: data.message, verification: data.verification }
      );
    } catch {
      setResult({ ok: false, error: "NETWORK", message: "Network error — try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <WordForm form={form} setForm={setForm} onSubmit={submit} submitting={submitting} submitLabel="Submit for review">
        <p className="rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary">
          The site will automatically run a novelty web search on your word before it enters the review queue. If the
          word already exists with this meaning, you&apos;ll see the evidence and can try a different coinage.
        </p>
      </WordForm>
      {result && <ResultPanel result={result} />}
    </>
  );
}

/* -------------------------------- AI path --------------------------------- */

function AiPath() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [material, setMaterial] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alternatives, setAlternatives] = useState<Candidate[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function coin() {
    setLoading(true);
    setError(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/coin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: material, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Coining failed");
      setCandidates(data.candidates ?? []);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coining failed");
    } finally {
      setLoading(false);
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
    setVerification(null);
    setResult(null);
    setStep(3);
  }

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/coin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: form.word, definition: form.definition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Verification failed");
      setVerification(data.verification);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const alternativesList = alternatives.map((c) => ({
        word: c.word,
        rationale: c.rationale,
      }));
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
          alternatives: alternativesList,
          verification: verification ?? undefined,
        }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? { ok: true, word: form.word, slug: data.slug, badge: data.badge, key: data.key }
          : { ok: false, error: data.error ?? "SUBMIT_FAILED", message: data.message, verification: data.verification }
      );
    } catch {
      setResult({ ok: false, error: "NETWORK", message: "Network error — try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const blockedByCollision = verification?.verdict === "EXISTS";

  return (
    <div>
      <ol className="flex flex-wrap gap-2 text-sm">
        {[
          [1, "Provide material"],
          [2, "Pick a candidate"],
          [3, "Refine & verify"],
        ].map(([n, label]) => (
          <li
            key={n as number}
            aria-current={step === n ? "step" : undefined}
            className={`rounded-full border px-3 py-1 ${
              step === n ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {n}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <Field label="Paste text" hint="a news article, an essay, or a description of the phenomenon">
            <textarea className={inputCls} rows={8} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Paste at least 60 characters of material…" />
          </Field>
          <Field label="…or paste a web link" hint="the site fetches the page for the AI">
            <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <button
            type="button"
            onClick={coin}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            <IconSparkle /> {loading ? "Coining…" : "Propose candidate words"}
          </button>
          {error && (
            <p role="alert" className="rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
              {error}{" "}
              <Link href="/contribute" className="underline" onClick={(e) => e.preventDefault()}>
                {" "}
              </Link>
              {error.includes("not configured") && " — you can still use the “I have a word” tab."}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            The AI proposed {candidates.length} candidates. Pick one — the others will be recorded as “alternatives
            considered” on the word page.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {candidates.map((c) => (
              <button
                key={c.word}
                type="button"
                onClick={() => pick(c)}
                className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary transition-colors cursor-pointer"
              >
                <p className="word-title text-lg font-bold text-primary">{c.word}</p>
                <p className="mt-1 text-sm">{c.suggested_definition}</p>
                <p className="mt-2 text-xs text-muted-foreground">Etymology: {c.etymology}</p>
                <p className="text-xs text-muted-foreground">{c.rationale}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(1)} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
            ← Back to material
          </button>
        </div>
      )}

      {step === 3 && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
            <button
              type="button"
              onClick={verify}
              disabled={verifying || !form.word || !form.definition}
              className="min-h-11 rounded-lg border border-primary px-5 text-sm font-medium text-primary hover:bg-primary-soft transition-colors cursor-pointer disabled:opacity-50"
            >
              {verifying ? "Searching the web…" : "Run novelty verification"}
            </button>
            {verification && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge
                  kind={
                    verification.verdict === "NEW"
                      ? "new"
                      : verification.verdict === "NEAR_EXISTING"
                        ? "near_existing"
                        : verification.verdict === "EXISTS"
                          ? "collision"
                          : "unverified"
                  }
                />
                <span className="text-muted-foreground">{verification.note}</span>
              </div>
            )}
            {verification?.closest_matches && verification.closest_matches.length > 0 && (
              <ul className="w-full text-xs text-muted-foreground">
                {verification.closest_matches.map((m, i) => (
                  <li key={i}>
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {m.url}
                      </a>
                    )}{" "}
                    {m.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <WordForm
            form={form}
            setForm={setForm}
            onSubmit={submit}
            submitting={submitting}
            submitLabel={blockedByCollision ? "Blocked — word exists (try another candidate)" : "Submit for review"}
          >
            {blockedByCollision && (
              <p className="rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">
                The search found this word already in use with this meaning. Go back and pick a different candidate.
              </p>
            )}
          </WordForm>
          <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
            ← Back to candidates
          </button>
        </>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}
