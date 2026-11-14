"use client";

import { useEffect, useState } from "react";
import { IconThumbDown, IconThumbUp } from "./icons";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/core";

export function VoteWidget({
  slug,
  initialUse,
  initialWork,
  locale = "en",
}: {
  slug: string;
  initialUse: number;
  initialWork: number;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [use, setUse] = useState(initialUse);
  const [work, setWork] = useState(initialWork);
  const [myVote, setMyVote] = useState<0 | 1 | -1>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with the server once on mount: a returning voter's prior vote is
  // recorded under their fingerprint, and the toggle must reflect it (finding #6).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/words/${slug}/vote`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setUse(d.use_votes);
        setWork(d.work_votes);
        const v = d.my_vote;
        if (v === 1 || v === -1) setMyVote(v);
      })
      .catch(() => {
        /* state stays as rendered */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function cast(vote: 1 | -1) {
    if (busy) return;
    setBusy(true);
    setError(null);
    // optimistic: clicking the same button again withdraws the vote
    const next = myVote === vote ? 0 : vote;
    try {
      const res = await fetch(`/api/words/${slug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Vote failed");
      }
      const data = (await res.json()) as { use_votes: number; work_votes: number };
      setUse(data.use_votes);
      setWork(data.work_votes);
      setMyVote(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => cast(1)}
        disabled={busy}
        aria-pressed={myVote === 1}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 ${
          myVote === 1 ? "border-good bg-good-soft text-good" : "border-border bg-card text-foreground hover:border-good hover:text-good"
        }`}
      >
        <IconThumbUp />
        {t.voteUse}
        <span aria-label={t.voteUseAria(use)} className="tabular-nums">
          {use}
        </span>
      </button>
      <button
        type="button"
        onClick={() => cast(-1)}
        disabled={busy}
        aria-pressed={myVote === -1}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 ${
          myVote === -1 ? "border-warn bg-warn-soft text-warn" : "border-border bg-card text-foreground hover:border-warn hover:text-warn"
        }`}
      >
        <IconThumbDown />
        {t.voteWork}
        <span aria-label={t.voteWorkAria(work)} className="tabular-nums">
          {work}
        </span>
      </button>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
