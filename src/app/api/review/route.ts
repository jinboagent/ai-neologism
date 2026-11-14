import { NextResponse } from "next/server";
import { qAll, qGet, withTx } from "@/lib/db";
import { canReview, resolveKeyHash } from "@/lib/keys";
import { hydrate, toPublic, type WordRow } from "@/lib/words";

export const dynamic = "force-dynamic";

async function requireReviewer(req: Request): Promise<string | null> {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash || !await canReview(keyHash)) return null;
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
  // Community reviewers never see API submissions — those are gated by the admin
  // alone (input_type 'api' is set server-side at submission).
  const rows = await qAll<WordRow>(
    "SELECT * FROM words WHERE status = 'in_review' AND (input_type IS NULL OR input_type != 'api') ORDER BY created_at ASC"
  );
  // A reviewer cannot review their own submissions; strip the internal key hash
  // before anything leaves the server.
  const queue = rows
    .map(hydrate)
    .map((w) => ({ ...toPublic(w), is_own: w.contributor_key_hash === reviewer }));
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

  // Same channel exclusion as the queue: API submissions are decided by the admin
  // alone — knowing the slug must not let a community reviewer approve them.
  const word = await qGet<WordRow>(
    "SELECT * FROM words WHERE slug = ? AND status = 'in_review' AND (input_type IS NULL OR input_type != 'api')",
    [slug]
  );
  if (!word) return NextResponse.json({ error: "NOT_FOUND", message: "Word not found or not in review." }, { status: 404 });
  if (word.contributor_key_hash === reviewer) {
    return NextResponse.json({ error: "SELF_REVIEW", message: "You cannot review your own submission." }, { status: 403 });
  }

  // The word was read above, *outside* the transaction. Re-check its status
  // inside the transaction so two concurrent reviewers can't both read
  // 'in_review' and both approve the same word — which would double-write the
  // review log and double-credit the submitter's accepted_words.
  const alreadyDecided = await withTx(async (tx) => {
    const fresh = await tx.execute("SELECT status FROM words WHERE id = ?", [word.id]);
    const current = fresh.rows[0] as unknown as { status: string } | undefined;
    if (!current || current.status !== "in_review") return true;

    await tx.execute("INSERT INTO reviews (word_id, reviewer_key_hash, action, reason) VALUES (?, ?, ?, ?)", [
      word.id,
      reviewer,
      action,
      cleanReason,
    ]);
    if (action === "approve") {
      await tx.execute("UPDATE words SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?", [word.id]);
      if (word.contributor_key_hash) {
        await tx.execute("UPDATE keys SET accepted_words = accepted_words + 1 WHERE key_hash = ?", [word.contributor_key_hash]);
      }
    } else if (action === "request_changes") {
      await tx.execute("UPDATE words SET status='returned', return_notes=?, updated_at=datetime('now') WHERE id=?", [cleanReason, word.id]);
    } else {
      await tx.execute("UPDATE words SET status='declined', return_notes=?, updated_at=datetime('now') WHERE id=?", [cleanReason, word.id]);
    }
    return false;
  });
  if (alreadyDecided) {
    return NextResponse.json({ error: "ALREADY_DECIDED", message: "This word was already reviewed." }, { status: 409 });
  }

  return NextResponse.json({
    slug,
    action,
    status: action === "approve" ? "published" : action === "request_changes" ? "returned" : "declined",
  });
}
