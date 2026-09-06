"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, StatusPill } from "@/components/badge";

type QueueWord = {
  slug: string;
  word: string;
  definition: string;
  part_of_speech: string;
  pronunciation: string | null;
  explanation: string;
  why_this_word: string;
  alternatives: { word: string; rationale: string }[];
  verification: { verdict: string; note?: string; checked_at?: string };
  references: { type: string; title: string; url?: string }[];
  ai_assisted: boolean;
  badge: string;
  created_at: string;
  is_own: boolean;
};

type KeyStatus = { has_key: boolean; accepted_words?: number; review_threshold: number; can_review?: boolean };

const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export default function ReviewPage() {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [queue, setQueue] = useState<QueueWord[]>([]);
  const [selected, setSelected] = useState<QueueWord | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // The first statement has to be the await. Clearing the error synchronously here
    // means setState runs inside the effect body that calls load(), which cascades
    // renders (react-hooks/set-state-in-effect).
    let keyRes: KeyStatus;
    try {
      keyRes = (await fetch("/api/key").then((r) => r.json())) as KeyStatus;
    } catch {
      setError("Could not reach the server.");
      return;
    }
    setError(null);
    setKeyStatus(keyRes);
    if (!keyRes.can_review) return;
    try {
      const qRes = await fetch("/api/review");
      if (qRes.ok) {
        const data = await qRes.json();
        setQueue(data.queue ?? []);
      } else {
        setError("Could not load the review queue.");
      }
    } catch {
      setError("Could not load the review queue.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(action: "approve" | "request_changes" | "decline") {
    if (!selected || reason.trim().length < 3) {
      setError("A reason (at least 3 characters) is required for every decision — it is public transparency.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selected.slug, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Review failed");
      setNotice(
        action === "approve"
          ? `Published: ${selected.word}.`
          : action === "request_changes"
            ? `Returned to contributor with notes: ${selected.word}.`
            : `Declined: ${selected.word}.`
      );
      setSelected(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  if (!keyStatus) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">Review</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        The gate between submission and publication. One reviewer is enough. Checklist, in order: novelty evidence
        plausible · not a duplicate · definition readable · references real.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        {keyStatus.has_key ? (
          <>
            Contribution key active — accepted words:{" "}
            <strong>
              {keyStatus.accepted_words}/{keyStatus.review_threshold}
            </strong>
            {keyStatus.can_review ? " · review rights unlocked" : " · keep coining to unlock review rights"}
          </>
        ) : (
          <>
            No contribution key in this browser. Submit a word first — a key is issued automatically.{" "}
            <Link href="/contribute" className="text-primary hover:underline">
              Contribute →
            </Link>
          </>
        )}
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-lg border border-good/40 bg-good-soft p-3 text-sm text-good">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
          {error}
        </p>
      )}

      {keyStatus.can_review ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
          <section aria-label="Review queue">
            <h2 className="text-lg font-bold">Queue ({queue.length})</h2>
            {queue.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                The queue is empty. Well done, everyone.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {queue.map((w) => (
                  <li key={w.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(w);
                        setReason("");
                        setNotice(null);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected?.slug === w.slug ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="word-title font-bold text-primary">{w.word}</span>
                        <Badge kind={w.badge} />
                        {w.is_own && <span className="text-xs text-bad">your own — cannot review</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{w.definition}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Submission under review">
            {!selected ? (
              <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                Select a word from the queue to review it.
              </p>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="word-title text-2xl font-bold">
                  {selected.word} <span className="text-sm font-normal italic text-muted-foreground">{selected.part_of_speech}</span>
                </h2>
                <p className="definition-lead mt-2 font-semibold">{selected.definition}</p>
                {selected.explanation && <p className="mt-3 text-sm whitespace-pre-line">{selected.explanation}</p>}
                {selected.why_this_word && (
                  <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground whitespace-pre-line">
                    {selected.why_this_word}
                  </p>
                )}
                {selected.alternatives.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Alternatives considered: {selected.alternatives.map((a) => a.word).join(", ")}
                  </p>
                )}
                <div className="mt-4 rounded-lg border border-border p-3 text-sm">
                  <strong>Verification: {selected.verification.verdict.replace("_", " ")}</strong>
                  {selected.verification.checked_at && ` · ${selected.verification.checked_at}`}
                  {selected.verification.note && <p className="mt-1 text-muted-foreground">{selected.verification.note}</p>}
                </div>
                {selected.references.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {selected.references.map((r, i) => (
                      <li key={i}>
                        [{i + 1}]{" "}
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {r.title}
                          </a>
                        ) : (
                          r.title
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  <StatusPill status="in_review" /> · submitted {selected.created_at.slice(0, 10)} ·{" "}
                  {selected.ai_assisted ? "AI-assisted" : "human-coined"}
                </p>

                {selected.is_own ? (
                  <p className="mt-4 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
                    This is your own submission — you cannot review it.
                  </p>
                ) : (
                  <>
                    <label className="mt-4 block">
                      <span className="text-sm font-medium">Reason (required, public)</span>
                      <textarea
                        className={`${inputCls} mt-1`}
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Evidence log looks thorough; no prior usage found."
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide("approve")}
                        className="min-h-11 rounded-lg bg-good px-5 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        Approve &amp; publish
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide("request_changes")}
                        className="min-h-11 rounded-lg border border-warn bg-warn-soft px-5 text-sm font-medium text-warn hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        Request changes
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide("decline")}
                        className="min-h-11 rounded-lg border border-bad bg-bad-soft px-5 text-sm font-medium text-bad hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Review rights unlock after {keyStatus.review_threshold} accepted words from the same contribution key. Keep
          coining.
        </div>
      )}
    </div>
  );
}
