import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { sendRejectionEmail } from "@/lib/mailer";
import { hydrate, LIMITS, parseJsonColumn, type WordRow } from "@/lib/words";

export const dynamic = "force-dynamic";

/**
 * Admin-only gate for third-party API submissions. Community reviewers never see
 * these (input_type 'api' is excluded from GET /api/review); the admin approves,
 * edits-then-approves, or rejects (with an optional notification email to the
 * submitter's contact address).
 */

type Editable = {
  pronunciation?: string;
  part_of_speech?: string;
  definition?: string;
  explanation?: string;
  why_this_word?: string;
  alternatives?: unknown;
  references?: unknown;
  related_words?: unknown;
  categories?: unknown;
};

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }
  const rows = getDb()
    .prepare("SELECT * FROM words WHERE status = 'in_review' AND input_type = 'api' ORDER BY created_at ASC")
    .all() as WordRow[];
  return NextResponse.json({ queue: rows.map(hydrate) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }

  let body: { slug?: string; action?: string; reason?: string; edits?: Editable };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const { slug, action } = body;
  const reason = (body.reason ?? "").trim();
  if (!slug || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "slug and action ('approve' | 'reject') are required." }, { status: 400 });
  }
  // A written reason is required only for rejection — it is what travels to the
  // submitter. Approvals are one-click; the audit trail records a default note.
  if (action === "reject" && reason.length < 3) {
    return NextResponse.json({ error: "REASON_REQUIRED", message: "A reason (≥3 chars) is required for rejection — it goes to the submitter and the audit trail." }, { status: 400 });
  }
  const auditReason = reason || "Approved by admin.";

  const db = getDb();
  const row = db.prepare("SELECT * FROM words WHERE slug = ? AND status = 'in_review' AND input_type = 'api'").get(slug) as
    | WordRow
    | undefined;
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND", message: "API submission not found or already decided." }, { status: 404 });
  }

  // Apply the admin's edits before publishing (edit-before-publish). Same bounds as PUT.
  let editsApplied = false;
  if (action === "approve" && body.edits) {
    const e = body.edits;
    const text = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
    const definition = text(e.definition, row.definition);
    if (definition.length < LIMITS.definition.min || definition.length > LIMITS.definition.max) {
      return NextResponse.json(
        { error: "INVALID_DEFINITION", message: `Definition must be ${LIMITS.definition.min}–${LIMITS.definition.max} characters.` },
        { status: 400 }
      );
    }
    const pronunciation = text(e.pronunciation, row.pronunciation ?? "");
    const partOfSpeech = text(e.part_of_speech, row.part_of_speech);
    const explanation = text(e.explanation, row.explanation);
    const whyThisWord = text(e.why_this_word, row.why_this_word);
    const tooLong: [string, number, number][] = [
      ["pronunciation", pronunciation.length, LIMITS.pronunciation.max],
      ["part_of_speech", partOfSpeech.length, LIMITS.partOfSpeech.max],
      ["explanation", explanation.length, LIMITS.explanation.max],
      ["why_this_word", whyThisWord.length, LIMITS.whyThisWord.max],
    ];
    const over = tooLong.find(([, len, max]) => len > max);
    if (over) {
      return NextResponse.json({ error: "FIELD_TOO_LONG", message: `${over[0]} must be at most ${over[2]} characters.` }, { status: 400 });
    }
    const jsonList = (v: unknown, current: string, max: number): string => {
      const list = Array.isArray(v) ? v : parseJsonColumn<unknown[]>(current, []);
      return JSON.stringify(list.slice(0, max));
    };

    db.prepare(
      `UPDATE words SET pronunciation=?, part_of_speech=?, definition=?, explanation=?, why_this_word=?,
       alternatives_json=?, references_json=?, related_words=?, categories_json=?, updated_at=datetime('now')
       WHERE id=?`
    ).run(
      pronunciation,
      partOfSpeech,
      definition,
      explanation,
      whyThisWord,
      jsonList(e.alternatives, row.alternatives_json, LIMITS.alternatives),
      jsonList(e.references, row.references_json, LIMITS.references),
      jsonList(e.related_words, row.related_words, LIMITS.relatedWords),
      jsonList(e.categories, row.categories_json, LIMITS.categories),
      row.id
    );
    editsApplied = true;
  }

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO reviews (word_id, reviewer_key_hash, action, reason) VALUES (?, 'admin', ?, ?)").run(
      row.id,
      action === "approve" ? "approve" : "decline",
      auditReason
    );
    if (action === "approve") {
      db.prepare("UPDATE words SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(row.id);
      if (row.contributor_key_hash) {
        db.prepare("UPDATE keys SET accepted_words = accepted_words + 1 WHERE key_hash = ?").run(row.contributor_key_hash);
      }
    } else {
      db.prepare("UPDATE words SET status='declined', return_notes=?, updated_at=datetime('now') WHERE id=?").run(reason, row.id);
    }
  });
  tx();

  // Notify the submitter on rejection (only if they provided an address and mail is configured).
  let email: { sent: boolean; detail: string } | null = null;
  if (action === "reject" && row.contact_email) {
    email = await sendRejectionEmail(row.contact_email, row.word, reason);
  }
  let notified: { sent: boolean; detail: string };
  if (!row.contact_email) {
    notified = { sent: false, detail: "no contact email provided" };
  } else if (action === "approve") {
    notified = { sent: false, detail: "not applicable — approved" };
  } else {
    notified = email ?? { sent: false, detail: "mail failed" };
  }

  return NextResponse.json({
    slug,
    action,
    status: action === "approve" ? "published" : "declined",
    edits_applied: editsApplied,
    notified,
  });
}
