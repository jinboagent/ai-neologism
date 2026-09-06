"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, StatusPill } from "@/components/badge";

type MyWord = {
  slug: string;
  word: string;
  definition: string;
  status: string;
  badge: string;
  return_notes: string | null;
  use_votes: number;
  work_votes: number;
  updated_at: string;
};

export default function MyWordsPage() {
  const [words, setWords] = useState<MyWord[] | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/words?mine=1")
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .then((d) => setWords(d.words ?? []));
  }, []);

  async function issueKey() {
    const res = await fetch("/api/key", { method: "POST" });
    const data = await res.json();
    setNewKey(data.key);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="word-title text-3xl font-bold">My words</h1>
      <p className="mt-1 text-muted-foreground">
        Your submissions and their review status, tied to this browser&apos;s contribution key.
      </p>

      {newKey && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn-soft p-4">
          <p className="text-sm font-medium text-warn">New contribution key (shown once — save it):</p>
          <code className="mt-1 block break-all rounded bg-card px-2 py-1 text-xs">{newKey}</code>
        </div>
      )}

      {words === null ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : words.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No submissions from this browser yet.</p>
          <Link href="/contribute" className="mt-2 inline-block text-primary hover:underline">
            Coin your first word →
          </Link>
          <div className="mt-4">
            <button
              type="button"
              onClick={issueKey}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary transition-colors cursor-pointer"
            >
              Issue a fresh contribution key
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {words.map((w) => (
            <li key={w.slug} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/words/${w.slug}`} className="word-title text-lg font-bold text-primary hover:underline">
                  {w.word}
                </Link>
                <StatusPill status={w.status} />
                {w.status === "published" && <Badge kind={w.badge} />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{w.definition}</p>
              {w.return_notes && (
                <p className="mt-2 rounded-lg bg-warn-soft p-2 text-sm text-warn">
                  <strong>Reviewer notes:</strong> {w.return_notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
