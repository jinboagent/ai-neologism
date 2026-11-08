"use client";

import Link from "next/link";
import { useState } from "react";
import { CoinAi } from "@/components/coin-ai";
import {
  EMPTY_FORM,
  ResultPanel,
  WordForm,
  type FormState,
  type SubmitResult,
} from "@/components/word-form";

export default function ContributePage() {
  const [tab, setTab] = useState<"manual" | "ai" | "api">("manual");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Contribute a word</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Only the word and its definition are required — everything else can be filled in later by you or the community.
        Every submission passes novelty verification and a human review.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/sources" className="text-primary hover:underline">
          Hunting for phenomena?
        </Link>{" "}
        <span className="text-muted-foreground">
          The Sources guide lists where new concepts surface — and you can park candidate links in your{" "}
          <Link href="/seeds" className="text-primary hover:underline">
            seed queue
          </Link>
          .
        </span>
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
          className={`min-h-11 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "ai" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          Coin with AI
        </button>
        <button
          role="tab"
          aria-selected={tab === "api"}
          onClick={() => setTab("api")}
          className={`min-h-11 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "api" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          Via API
        </button>
      </div>

      <div className="mt-6">{tab === "manual" ? <ManualPath /> : tab === "ai" ? <CoinAi /> : <ApiDocs />}</div>
    </div>
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

/* -------------------------------- API docs -------------------------------- */

function ApiDocs() {
  return (
    <div>
      <p className="max-w-3xl">
        The whole collection is programmable — the same structured schema the word pages render. Submissions via API
        enter the same review queue as web submissions (the API is a doorway, not a bypass).
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pr-4 font-medium">Method &amp; path</th>
            <th className="font-medium">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["GET /api/words", "list published words (page, limit)"],
            ["POST /api/words", "submit a word package (X-Contribution-Key header; returns 202 in_review; a new key is issued if absent). API submissions are reviewed by the admin alone — add an optional contact_email to be notified of the decision"],
            ["GET /api/words/{slug}", "one full structured entry"],
            ["PUT /api/words/{slug}", "edit (owner or reviewer); returned words re-enter the queue"],
            ["GET /api/words/{slug}/revisions", "revision history"],
            ["GET /api/search?q=", "full-text search"],
            ["GET /api/popularity?lens=trending|endorsed|contested|verified", "popularity lenses"],
            ["POST /api/words/{slug}/vote", "vote {vote: 1 | -1} (rate-limited)"],
            ["POST /api/coin/candidates", "{text | url} → AI candidate words"],
            ["POST /api/coin/verify", "{word, definition} → novelty verdict + evidence"],
            ["GET /api/key", "your key status (accepted words, review rights)"],
            ["GET /api/review · POST /api/review", "review queue & decisions (review rights required)"],
            ["POST /api/cron/coin", "daily auto-coiner: coins up to AUTO_COIN_COUNT words from seeds + feeds into the review queue (CRON_SECRET-protected in production)"],
          ].map(([route, purpose]) => (
            <tr key={route} className="border-t border-border/60">
              <td className="py-1.5 pr-4 font-mono text-xs">{route}</td>
              <td className="py-1.5">{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted-foreground">
        Lost your key? A fresh one is issued automatically the first time you submit without one — the response carries
        it, and the cookie keeps it for next time.
      </p>
    </div>
  );
}
