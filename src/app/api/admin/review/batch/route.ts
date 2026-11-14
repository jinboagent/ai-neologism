import { NextResponse } from "next/server";
import { qGet, withTx } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendRejectionEmail } from "@/lib/mailer";
import type { WordRow } from "@/lib/words";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;
const DEFAULT_REJECT_REASON = "Rejected in batch by admin.";

/**
 * Batch decisions for the API-submission queue — the same semantics as the
 * single POST /api/admin/review (approve publishes and credits the submitter's
 * key; reject declines, stores the reason and emails the submitter if they
 * left an address), applied per slug with no edits. Each word is decided in
 * its own transaction, so one bad slug cannot roll back the rest; the response
 * reports every item so the UI can show what actually happened.
 *
 * The shared reason is optional: approvals record a default audit note, and an
 * empty rejection reason falls back to the default below.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }

  let body: { slugs?: unknown; action?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const slugs = (Array.isArray(body.slugs) ? body.slugs : [])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  const action = body.action;
  if (slugs.length === 0 || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "slugs (non-empty array) and action ('approve' | 'reject') are required." },
      { status: 400 }
    );
  }
  if (slugs.length > MAX_BATCH) {
    return NextResponse.json({ error: "BATCH_TOO_LARGE", message: `At most ${MAX_BATCH} words per batch.` }, { status: 400 });
  }

  const given = (body.reason ?? "").trim();
  if (action === "reject" && given && given.length < 3) {
    return NextResponse.json(
      { error: "REASON_REQUIRED", message: "A shared reason (≥3 chars) is required for rejection — or leave it empty for the default." },
      { status: 400 }
    );
  }
  const reason = action === "reject" ? given || DEFAULT_REJECT_REASON : given || "Approved by admin.";

  type ItemResult = { slug: string; ok: boolean; status?: string; error?: string; notified?: { sent: boolean; detail: string } };
  const results: ItemResult[] = [];
  let approved = 0;
  let rejected = 0;

  for (const slug of slugs) {
    const row = await qGet<WordRow>(
      "SELECT * FROM words WHERE slug = ? AND status = 'in_review' AND input_type = 'api'",
      [slug]
    );
    if (!row) {
      results.push({ slug, ok: false, error: "NOT_FOUND" });
      continue;
    }

    const alreadyDecided = await withTx(async (tx) => {
      // Re-check status inside the transaction (the row was read outside it) so a
      // concurrent decision can't double-credit the submitter's accepted_words.
      const fresh = await tx.execute("SELECT status FROM words WHERE id = ?", [row.id]);
      const current = fresh.rows[0] as unknown as { status: string } | undefined;
      if (!current || current.status !== "in_review") return true;

      await tx.execute("INSERT INTO reviews (word_id, reviewer_key_hash, action, reason) VALUES (?, 'admin', ?, ?)", [
        row.id,
        action === "approve" ? "approve" : "decline",
        reason,
      ]);
      if (action === "approve") {
        await tx.execute("UPDATE words SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?", [row.id]);
        if (row.contributor_key_hash) {
          await tx.execute("UPDATE keys SET accepted_words = accepted_words + 1 WHERE key_hash = ?", [row.contributor_key_hash]);
        }
      } else {
        await tx.execute("UPDATE words SET status='declined', return_notes=?, updated_at=datetime('now') WHERE id=?", [reason, row.id]);
      }
      return false;
    });
    if (alreadyDecided) {
      results.push({ slug, ok: false, error: "ALREADY_DECIDED" });
      continue;
    }

    if (action === "approve") {
      approved += 1;
      results.push({ slug, ok: true, status: "published" });
    } else {
      rejected += 1;
      let notified: { sent: boolean; detail: string } = { sent: false, detail: "no contact email provided" };
      if (row.contact_email) {
        notified = (await sendRejectionEmail(row.contact_email, row.word, reason)) ?? { sent: false, detail: "mail failed" };
      }
      results.push({ slug, ok: true, status: "declined", notified });
    }
  }

  return NextResponse.json({ action, approved, rejected, results });
}
