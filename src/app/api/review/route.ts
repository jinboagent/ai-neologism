import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canReview, resolveKeyHash } from "@/lib/keys";
import { hydrate, type WordRow } from "@/lib/words";

export const dynamic = "force-dynamic";

async function requireReviewer(req: Request): Promise<string | null> {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash || !canReview(keyHash)) return null;
  return keyHash;
}

export async function GET(req: Request) {
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json(
      { error: "REVIEW_RIGHTS_REQUIRED", message: "Review rights unlock after 3 accepted words (same contribution key)." },
      { status: 403 }
    );
  }
  const rows = getDb()
    .prepare("SELECT * FROM words WHERE status = 'in_review' ORDER BY created_at ASC")
    .all() as WordRow[];
  // A reviewer cannot review their own submissions.
  const queue = rows.map(hydrate).map((w) => ({ ...w, is_own: w.contributor_key_hash === reviewer }));
  return NextResponse.json({ queue });
}

export async function POST(req: Request) {
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ error: "REVIEW_RIGHTS_REQUIRED" }, { status: 403 });
  }

  let body: { slug?: string; action?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const { slug, action, reason } = body;
  const cleanReason = (reason ?? "").trim();
  if (!slug || !action || cleanReason.length < 3) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "slug, action and a reason (≥3 chars) are required." }, { status: 400 });
  }
  if (!["approve", "request_changes", "decline"].includes(action)) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const db = getDb();
  const word = db.prepare("SELECT * FROM words WHERE slug = ? AND status = 'in_review'").get(slug) as WordRow | undefined;
  if (!word) return NextResponse.json({ error: "NOT_FOUND", message: "Word not found or not in review." }, { status: 404 });
  if (word.contributor_key_hash === reviewer) {
    return NextResponse.json({ error: "SELF_REVIEW", message: "You cannot review your own submission." }, { status: 403 });
  }

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO reviews (word_id, reviewer_key_hash, action, reason) VALUES (?, ?, ?, ?)").run(
      word.id,
      reviewer,
      action,
      cleanReason
    );
    if (action === "approve") {
      db.prepare("UPDATE words SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(word.id);
      if (word.contributor_key_hash) {
        db.prepare("UPDATE keys SET accepted_words = accepted_words + 1 WHERE key_hash = ?").run(word.contributor_key_hash);
      }
    } else if (action === "request_changes") {
      db.prepare("UPDATE words SET status='returned', return_notes=?, updated_at=datetime('now') WHERE id=?").run(cleanReason, word.id);
    } else {
      db.prepare("UPDATE words SET status='declined', return_notes=?, updated_at=datetime('now') WHERE id=?").run(cleanReason, word.id);
    }
  });
  tx();

  return NextResponse.json({
    slug,
    action,
    status: action === "approve" ? "published" : action === "request_changes" ? "returned" : "declined",
  });
}
