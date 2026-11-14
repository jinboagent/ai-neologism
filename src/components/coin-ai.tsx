"use client";

// The three-step "Coin with AI" wizard: paste material → pick a candidate →
// refine & verify → submit. Extracted from the contribute page so the front
// page can host the same widget (both places stay in sync by construction).

import { useState } from "react";
import { Badge } from "@/components/badge";
import { IconSparkle } from "@/components/icons";
import { isSafeHttpUrl } from "@/lib/sanitize";
import type { Locale } from "@/lib/i18n/core";
import {
  EMPTY_FORM,
  Field,
  inputCls,
  ResultPanel,
  WordForm,
  type Candidate,
  type FormState,
  type SubmitResult,
  type Verification,
} from "@/components/word-form";

export function CoinAi({ locale = "en" }: { locale?: Locale }) {
  // grammar facts of the picked candidate (gender/plural on the localized editions)
  const [grammar, setGrammar] = useState<{ gender?: string; plural?: string } | undefined>(undefined);
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
        body: JSON.stringify({ text: material, url, locale }),
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
    setGrammar(c.gender || c.plural ? { gender: c.gender, plural: c.plural } : undefined);
    setForm({
      ...EMPTY_FORM,
      word: c.word,
      pronunciation: c.pronunciation,
      definition: c.suggested_definition,
      why_this_word: `${c.rationale}\n\nEtymology: ${c.etymology}`,
      related: c.related_concepts.join(", "),
      categories: c.categories,
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
        body: JSON.stringify({ word: form.word, definition: form.definition, locale }),
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
          language: locale,
          grammar,
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
              {error}
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
                    {m.url && isSafeHttpUrl(m.url) && (
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
