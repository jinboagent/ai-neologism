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

type ManagedWord = {
  id: number;
  slug: string;
  word: string;
  status: string;
  badge: string;
  input_type: string | null;
  use_votes: number;
  work_votes: number;
  published_at: string | null;
  created_at: string;
};

const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
const PAGE_SIZE = 12;

// Common rejection reasons — one click fills the textarea (still editable).
// Wording is self-contained: it is emailed to the submitter verbatim.
const REJECT_PRESETS: { label: string; text: string }[] = [
  {
    label: "Already exists",
    text: "The word already exists with this meaning — this is a name collision, not a new coinage.",
  },
  {
    label: "Similar word exists",
    text: "A very similar word already exists with this meaning; use or improve that entry instead of coining a rival.",
  },
  {
    label: "Not a real phenomenon",
    text: "The definition does not name a real, observable phenomenon — there is nothing here for a word to attach to.",
  },
  {
    label: "Unclear definition",
    text: "The definition is unclear or hard to read; the entry cannot be published as written.",
  },
  {
    label: "Weak evidence",
    text: "The novelty evidence is missing or implausible — the search log does not support the claim that the word is new.",
  },
  {
    label: "Craft rules",
    text: "The coinage breaks the craft rules: it is hard to pronounce, uses a brand name, or has malformed morphology.",
  },
  {
    label: "Joke coinage",
    text: "Joke coinage with no observable communicative need.",
  },
];

export default function AdminPage() {
  const [session, setSession] = useState<"checking" | "out" | "in">("checking");
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [queue, setQueue] = useState<AdminWord[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminWord | null>(null);
  const [tab, setTab] = useState<"queue" | "published">("queue");
  const [published, setPublished] = useState<ManagedWord[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Batch selection: slugs in the review queue, ids in the manage list. The
  // shared batch reason is optional — empty rejection falls back to a default.
  const [qSel, setQSel] = useState<Set<string>>(new Set());
  const [mSel, setMSel] = useState<Set<number>>(new Set());
  const [batchReason, setBatchReason] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);

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

  const loadPublished = useCallback(async () => {
    const res = await fetch("/api/admin/words");
    if (!res.ok) return;
    const data = await res.json();
    setPublished(data.words ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured ?? false);
        if (d.admin) {
          setSession("in");
          loadQueue();
          loadPublished();
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
    loadPublished();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setSession("out");
    setQueue([]);
    setSelected(null);
    setQSel(new Set());
    setMSel(new Set());
  }

  function toggleQ(slug: string) {
    setQSel((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleAllQ() {
    const pageSlugs = queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => w.slug);
    setQSel((prev) => {
      const allSelected = pageSlugs.length > 0 && pageSlugs.every((s) => prev.has(s));
      const next = new Set(prev);
      if (allSelected) pageSlugs.forEach((s) => next.delete(s));
      else pageSlugs.forEach((s) => next.add(s));
      return next;
    });
  }

  function toggleM(id: number) {
    setMSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllM() {
    setMSel((prev) => {
      const all = published ?? [];
      const allSelected = all.length > 0 && all.every((w) => prev.has(w.id));
      return allSelected ? new Set() : new Set(all.map((w) => w.id));
    });
  }

  async function batchDecide(action: "approve" | "reject") {
    if (qSel.size === 0) return;
    const shared = batchReason.trim();
    if (action === "reject" && shared && shared.length < 3) {
      setError("A shared reason (≥3 chars) is required for rejection — or clear it to use the default.");
      return;
    }
    const verb = action === "approve" ? "publish" : "reject";
    if (!window.confirm(`Batch-${verb} ${qSel.size} selected word(s)?`)) return;
    setBatchBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: [...qSel], action, reason: shared }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Batch decision failed");
      const skipped = (data.results as { ok: boolean }[]).filter((r) => !r.ok).length;
      const done = action === "approve" ? data.approved : data.rejected;
      setNotice(
        `Batch ${action}: ${done} ${done === 1 ? "word" : "words"} ${action === "approve" ? "published" : "declined"}` +
          `${skipped ? `, ${skipped} skipped (already decided)` : ""}.`
      );
      setQSel(new Set());
      setBatchReason("");
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch decision failed");
    } finally {
      setBatchBusy(false);
    }
  }

  async function batchManage(action: "delete" | "unpublish" | "republish") {
    if (mSel.size === 0) return;
    if (
      action === "delete" &&
      !window.confirm(
        `Permanently delete ${mSel.size} word(s)? Their votes, history, and review records are removed, and links to them on other entries are cleaned. This cannot be undone.`
      )
    )
      return;
    // The manage list includes in-review words, so a batch delete can remove the
    // submission currently open in the review panel — close it if so.
    const doomedSlugs = new Set((published ?? []).filter((w) => mSel.has(w.id)).map((w) => w.slug));
    setBatchBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/words/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...mSel], action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Batch action failed");
      setNotice(
        `Batch ${action}: ${data.succeeded} done` +
          `${data.failed ? `, ${data.failed} skipped (wrong state or missing)` : ""}.`
      );
      setMSel(new Set());
      if (selected && doomedSlugs.has(selected.slug)) setSelected(null);
      await loadPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch action failed");
    } finally {
      setBatchBusy(false);
    }
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

  async function unpublish(w: ManagedWord) {
    const res = await fetch(`/api/admin/words/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    if (res.ok) {
      setNotice(`Unpublished: ${w.word} — hidden from the public, history kept.`);
      await loadPublished();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "Unpublish failed");
    }
  }

  async function republish(w: ManagedWord) {
    const res = await fetch(`/api/admin/words/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    if (res.ok) {
      setNotice(`Republished: ${w.word}.`);
      await loadPublished();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "Republish failed");
    }
  }

  async function remove(w: ManagedWord) {
    if (
      !window.confirm(
        `Permanently delete "${w.word}"? Its votes, history, and review record are removed, and links to it on other entries are cleaned. This cannot be undone.`
      )
    )
      return;
    const res = await fetch(`/api/admin/words/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotice(`Deleted: ${w.word}.`);
      if (selected?.slug === w.slug) setSelected(null);
      await loadPublished();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "Delete failed");
    }
  }

  const statusLabel: Record<string, string> = {
    published: "Published",
    draft: "Unpublished",
    in_review: "In review",
    returned: "Returned",
    declined: "Declined",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="word-title text-3xl font-bold">Admin</h1>
        <button type="button" onClick={logout} className="text-sm text-muted-foreground hover:text-bad cursor-pointer">
          Log out
        </button>
      </div>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Third-party API submissions wait here for you alone. You can edit before publishing; rejections notify the
        submitter at their contact address with your reason. Published words are managed under “Manage words.”
      </p>

      <div role="tablist" aria-label="Admin sections" className="mt-5 flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={tab === "queue"}
          onClick={() => setTab("queue")}
          className={`min-h-11 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "queue" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          Review queue ({queue.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "published"}
          onClick={() => setTab("published")}
          className={`min-h-11 rounded-lg border px-5 text-sm font-medium transition-colors cursor-pointer ${
            tab === "published" ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:border-primary"
          }`}
        >
          Manage words{published ? ` (${published.length})` : ""}
        </button>
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

      {tab === "published" ? (
        <section aria-label="Published words" className="mt-6">
          <h2 className="text-lg font-bold">All words in the system</h2>
          {published !== null && published.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Select all words"
                  checked={published.length > 0 && published.every((w) => mSel.has(w.id))}
                  onChange={toggleAllM}
                  className="h-4 w-4 cursor-pointer"
                />
                <span className="text-muted-foreground">Select all</span>
              </label>
              {mSel.size > 0 && (
                <>
                  <span className="font-medium">{mSel.size} selected</span>
                  <button
                    type="button"
                    disabled={batchBusy}
                    onClick={() => batchManage("unpublish")}
                    className="min-h-9 rounded-lg border border-border px-4 text-muted-foreground transition-colors hover:border-warn hover:text-warn cursor-pointer disabled:opacity-50"
                  >
                    Batch unpublish
                  </button>
                  <button
                    type="button"
                    disabled={batchBusy}
                    onClick={() => batchManage("republish")}
                    className="min-h-9 rounded-lg border border-good bg-good-soft px-4 font-medium text-good transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    Batch republish
                  </button>
                  <button
                    type="button"
                    disabled={batchBusy}
                    onClick={() => batchManage("delete")}
                    className="min-h-9 rounded-lg border border-bad bg-bad-soft px-4 font-medium text-bad transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    Batch delete
                  </button>
                </>
              )}
            </div>
          )}
          {published === null ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : published.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Nothing in the system yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {published.map((w) => (
                <li key={w.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${w.word} for batch action`}
                      checked={mSel.has(w.id)}
                      onChange={() => toggleM(w.id)}
                      className="h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <Link href={`/words/${w.slug}`} className="word-title text-lg font-bold text-primary hover:underline">
                      {w.word}
                    </Link>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${w.status === "published" ? "border-good/30 bg-good-soft text-good" : "border-border bg-muted text-muted-foreground"}`}>
                      {statusLabel[w.status] ?? w.status}
                    </span>
                    <Badge kind={w.badge} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {w.use_votes} would use · {w.work_votes} needs work · {w.input_type ?? "unknown source"} · created{" "}
                    {w.created_at.slice(0, 10)}
                    {w.published_at ? ` · published ${w.published_at.slice(0, 10)}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {w.status === "published" && (
                      <button
                        type="button"
                        onClick={() => unpublish(w)}
                        className="min-h-11 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:border-warn hover:text-warn transition-colors cursor-pointer"
                      >
                        Unpublish
                      </button>
                    )}
                    {w.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => republish(w)}
                        className="min-h-11 rounded-lg border border-good bg-good-soft px-4 text-sm font-medium text-good hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Republish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      className="min-h-11 rounded-lg border border-bad bg-bad-soft px-4 text-sm font-medium text-bad hover:opacity-90 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section aria-label="API submission queue">
          <h2 className="text-lg font-bold">Queue ({queue.length})</h2>
          {queue.length > 0 && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={(() => {
                      const pageSlugs = queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => w.slug);
                      return pageSlugs.length > 0 && pageSlugs.every((s) => qSel.has(s));
                    })()}
                    onChange={toggleAllQ}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="text-muted-foreground">Select page</span>
                </label>
                {qSel.size > 0 && (
                  <>
                    <span className="font-medium">{qSel.size} selected</span>
                    <button
                      type="button"
                      disabled={batchBusy}
                      onClick={() => batchDecide("approve")}
                      className="min-h-9 rounded-lg border border-good bg-good-soft px-4 font-medium text-good transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      Batch approve &amp; publish
                    </button>
                    <button
                      type="button"
                      disabled={batchBusy}
                      onClick={() => batchDecide("reject")}
                      className="min-h-9 rounded-lg border border-bad bg-bad-soft px-4 font-medium text-bad transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      Batch reject &amp; notify
                    </button>
                  </>
                )}
              </div>
              {qSel.size > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <label className="block">
                    <span className="text-sm font-medium">
                      Shared reason for rejection — emailed to every selected submitter with a contact address. Leave
                      empty to use the default; presets fill it in.
                    </span>
                    <textarea
                      className={`${inputCls} mt-1`}
                      rows={2}
                      value={batchReason}
                      onChange={(e) => setBatchReason(e.target.value)}
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Common reasons:</span>
                    {REJECT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setBatchReason(p.text)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-warn hover:text-warn cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {queue.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No API submissions waiting.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-3">
                {queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => (
                  <li key={w.slug} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${w.word} for batch action`}
                      checked={qSel.has(w.slug)}
                      onChange={() => toggleQ(w.slug)}
                      className="mt-5 h-4 w-4 shrink-0 cursor-pointer"
                    />
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
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Common reasons:</span>
                  {REJECT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setReason(p.text)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-warn hover:text-warn cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
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
                <WordForm form={form} setForm={setForm} onSubmit={() => decide("approve")} submitting={busy} submitLabel="Approve & publish" lockWord />
              </div>
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
