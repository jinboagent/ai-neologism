import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canReview, resolveKeyHash } from "@/lib/keys";
import { rateLimit } from "@/lib/ratelimit";
import { getWord, LIMITS, parseJsonColumn, toPublic, type WordRow } from "@/lib/words";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const keyHash = await resolveKeyHash(req);
  const word = getWord(slug, keyHash);
  if (!word) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ word: toPublic(word) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ error: "NO_KEY" }, { status: 401 });
  if (!rateLimit(`edit:${keyHash}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM words WHERE slug = ?").get(slug) as WordRow | undefined;
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // Editing requires ownership or review rights. The previous check also allowed any
  // key holder to edit any *published* word, because "status !== 'published'" made the
  // whole condition false and skipped the owner comparison entirely.
  const isOwner = row.contributor_key_hash === keyHash;
  if (!isOwner && !canReview(keyHash)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Only the contributor or a reviewer may edit this word." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const text = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
  const definition = text(body.definition, row.definition);
  if (definition.length < LIMITS.definition.min || definition.length > LIMITS.definition.max) {
    return NextResponse.json(
      {
        error: "INVALID_DEFINITION",
        message: `Definition must be ${LIMITS.definition.min}–${LIMITS.definition.max} characters.`,
      },
      { status: 400 }
    );
  }

  const pronunciation = text(body.pronunciation, row.pronunciation ?? "");
  const partOfSpeech = text(body.part_of_speech, row.part_of_speech);
  const explanation = text(body.explanation, row.explanation);
  const whyThisWord = text(body.why_this_word, row.why_this_word);

  const bounds: [string, number, number][] = [
    ["pronunciation", pronunciation.length, LIMITS.pronunciation.max],
    ["part_of_speech", partOfSpeech.length, LIMITS.partOfSpeech.max],
    ["explanation", explanation.length, LIMITS.explanation.max],
    ["why_this_word", whyThisWord.length, LIMITS.whyThisWord.max],
  ];
  const tooLong = bounds.find(([, len, max]) => len > max);
  if (tooLong) {
    return NextResponse.json(
      { error: "FIELD_TOO_LONG", message: `${tooLong[0]} must be at most ${tooLong[2]} characters.` },
      { status: 400 }
    );
  }

  // Arrays only, matching POST. parseJsonColumn keeps a corrupt stored column from
  // throwing where the previous bare JSON.parse would have produced a 500.
  const jsonList = (v: unknown, current: string, max: number): string => {
    const list = Array.isArray(v) ? v : parseJsonColumn<unknown[]>(current, []);
    return JSON.stringify(list.slice(0, max));
  };

  db.prepare("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, ?, ?, ?)").run(
    row.id,
    keyHash,
    String(body.summary ?? "Edited").slice(0, 200),
    JSON.stringify({
      definition: row.definition,
      explanation: row.explanation,
      why_this_word: row.why_this_word,
    })
  );

  db.prepare(
    `UPDATE words SET pronunciation=?, part_of_speech=?, definition=?, explanation=?, why_this_word=?,
     alternatives_json=?, references_json=?, related_words=?, categories_json=?, updated_at=datetime('now'),
     status = CASE WHEN status='returned' THEN 'in_review' ELSE status END,
     return_notes = CASE WHEN status='returned' THEN NULL ELSE return_notes END
     WHERE id=?`
  ).run(
    pronunciation,
    partOfSpeech,
    definition,
    explanation,
    whyThisWord,
    jsonList(body.alternatives, row.alternatives_json, LIMITS.alternatives),
    jsonList(body.references, row.references_json, LIMITS.references),
    jsonList(body.related_words, row.related_words, LIMITS.relatedWords),
    jsonList(body.categories, row.categories_json, LIMITS.categories),
    row.id
  );

  const updated = getWord(slug, keyHash);
  return NextResponse.json({ word: updated ? toPublic(updated) : null });
}
