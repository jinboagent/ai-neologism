"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, StatusPill } from "@/components/badge";
import { EMPTY_FORM, WordForm, type FormState, type RefRow } from "@/components/word-form";

type AdminWord = {
  slug: string;
  word: string;
  definition: string;
  part_of_speech: string;
  pronunciation: string | null;
  explanation: string;
  why_this_word: string;
  alternatives: { word: string; rationale: string }[];
  verification: { verdict: string; note?: string; checked_at?: string };
  references: { type: string; title: string; url?: string; author?: string; outlet?: string; date?: string; excerpt?: string }[];
  related_words: string[];
  categories: string[];
  ai_assisted: boolean;
  badge: string;
  input_type: string | null;
  contact_email: string | null;
  created_at: string;
};

const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
const PAGE_SIZE = 12;

export default function AdminPage() {
  const [session, setSession] = useState<"checking" | "out" | "in">("checking");
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [queue, setQueue] = useState<AdminWord[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminWord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/admin/review");
    if (res.status === 401) {
      setSession("out");
      return;
    }
    const data = await res.json();
    setQueue(data.queue ?? []);
    setPage(1);
  }, []);

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured ?? false);
        if (d.admin) {
          setSession("in");
          loadQueue();
        } else {
          setSession("out");
        }
      })
      .catch(() => setSession("out"));
  }, [loadQueue]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.message ?? data.error ?? "Login failed");
      return;
    }
    setPassword("");
    setSession("in");
    loadQueue();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSession("out");
    setQueue([]);
    setSelected(null);
  }

  function select(w: AdminWord) {
    setSelected(w);
    setReason("");
    setNotice(null);
    setError(null);
    setForm({
      ...EMPTY_FORM,
      word: w.word,
      definition: w.definition,
      pronunciation: w.pronunciation ?? "",
      part_of_speech: w.part_of_speech,
      explanation: w.explanation,
      why_this_word: w.why_this_word,
      categories: w.categories,
      references: w.references.map((r) => ({
        type: r.type,
        title: r.title,
        url: r.url ?? "",
        author: r.author ?? "",
        outlet: r.outlet ?? "",
        date: r.date ?? "",
        excerpt: r.excerpt ?? "",
      })),
      related: w.related_words.join(", "),
      ai_assisted: w.ai_assisted,
    });
  }

  function editsFromForm() {
    return {
      definition: form.definition,
      explanation: form.explanation,
      why_this_word: form.why_this_word,
      pronunciation: form.pronunciation,
      part_of_speech: form.part_of_speech,
      categories: form.categories,
      references: form.references.filter((r) => r.title.trim()),
      related_words: form.related.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  async function decide(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && reason.trim().length < 3) {
      setError("A reason (≥3 chars) is required for rejection — it goes to the submitter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selected.slug,
          action,
          reason,
          ...(action === "approve" ? { edits: editsFromForm() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Decision failed");
      const mail = data.notified as { sent: boolean; detail: string } | undefined;
      setNotice(
        action === "approve"
          ? `Published: ${selected.word}${data.edits_applied ? " (with your edits)" : ""}.`
          : `Rejected: ${selected.word}. Notification: ${mail ? mail.detail : "no contact email provided"}.`
      );
      setSelected(null);
      setReason("");
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  if (session === "checking") {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading…</div>;
  }

  if (session === "out") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="word-title text-3xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The background gate for third-party API submissions. Browser submissions are reviewed by the community{" "}
          <Link href="/review" className="text-primary hover:underline">
            here
          </Link>
          .
        </p>
        {!configured && (
          <p className="mt-4 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
            Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local and restart the
            server.
          </p>
        )}
        <form onSubmit={login} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Username</span>
            <input className={`${inputCls} mt-1`} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input type="password" className={`${inputCls} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {loginError && (
            <p role="alert" className="rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary-deep transition-colors cursor-pointer"
          >
            Log in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="word-title text-3xl font-bold">Admin — API submissions</h1>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground hover:text-bad cursor-pointer">
          Log out
        </button>
      </div>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Third-party API submissions wait here for you alone. You can edit before publishing; rejections notify the
        submitter at their contact address with your reason.
      </p>

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

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section aria-label="API submission queue">
          <h2 className="text-lg font-bold">Queue ({queue.length})</h2>
          {queue.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No API submissions waiting.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-3">
                {queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => (
                  <li key={w.slug}>
                    <button
                      type="button"
                      onClick={() => select(w)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected?.slug === w.slug ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="word-title font-bold text-primary">{w.word}</span>
                        <Badge kind={w.badge} />
                        <StatusPill status="in_review" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{w.definition}</p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        submitted {w.created_at.slice(0, 10)} · contact: {w.contact_email ?? "none provided"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              {queue.length > PAGE_SIZE && (
                <nav aria-label="Queue pages" className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-border px-4 py-2 hover:border-primary transition-colors cursor-pointer disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-muted-foreground">
                    Page {page} of {Math.ceil(queue.length / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(Math.ceil(queue.length / PAGE_SIZE), p + 1))}
                    disabled={page >= Math.ceil(queue.length / PAGE_SIZE)}
                    className="rounded-lg border border-border px-4 py-2 hover:border-primary transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        <section aria-label="Submission under review">
          {!selected ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Select a submission to review it.
            </p>
          ) : (
            <div className="rounded-xl border border-primary/40 bg-card p-5">
              <h2 className="word-title text-2xl font-bold">
                {selected.word}{" "}
                <span className="text-sm font-normal italic text-muted-foreground">{selected.part_of_speech}</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Submitter contact: <strong>{selected.contact_email ?? "none provided"}</strong> · source:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selected.input_type}</code> ·{" "}
                {selected.ai_assisted ? "AI-assisted" : "human-coined"}
              </p>
              <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                <strong>Verification: {selected.verification.verdict.replace("_", " ")}</strong>
                {selected.verification.checked_at && ` · ${selected.verification.checked_at}`}
                {selected.verification.note && <p className="mt-1 text-muted-foreground">{selected.verification.note}</p>}
              </div>

              <div className="mt-4 rounded-lg border border-border bg-card p-3">
                <label className="block">
                  <span className="text-sm font-medium">Reason (required for rejection — emailed to the submitter; optional on approve)</span>
                  <textarea className={`${inputCls} mt-1`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("reject")}
                  className="mt-2 min-h-11 rounded-lg border border-bad bg-bad-soft px-5 text-sm font-medium text-bad hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  Reject & notify
                </button>
              </div>

              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted-foreground">Edit before publish (optional)</h3>
              <div className="mt-3">
                <WordForm form={form} setForm={setForm} onSubmit={() => decide("approve")} submitting={busy} submitLabel="Approve & publish" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
