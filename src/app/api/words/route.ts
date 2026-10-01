import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { acceptedWordsCount, issueKey, KEY_COOKIE, resolveKeyHash, REVIEW_THRESHOLD } from "@/lib/keys";
import { rateLimit } from "@/lib/ratelimit";
import { badgeFromVerdict, verifyNovelty } from "@/lib/verify";
import { hydrate, LIMITS, listPublished, toPublic, uniqueSlug, type Reference, type Verification } from "@/lib/words";

export const dynamic = "force-dynamic";

/** Parse a query param into an integer, falling back instead of yielding NaN. */
function intParam(raw: string | null, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Number("abc") is NaN, and NaN survives Math.min/Math.max — passing it to LIMIT
  // made better-sqlite3 throw "datatype mismatch", turning ?limit=abc into a 500.
  const page = Math.max(1, intParam(url.searchParams.get("page"), 1));
  const limit = Math.min(50, Math.max(1, intParam(url.searchParams.get("limit"), 20)));
  const mine = url.searchParams.get("mine") === "1";

  if (mine) {
    const keyHash = await resolveKeyHash(req);
    if (!keyHash) return NextResponse.json({ error: "NO_KEY", words: [] }, { status: 401 });
    const rows = getDb()
      .prepare("SELECT * FROM words WHERE contributor_key_hash = ? ORDER BY updated_at DESC")
      .all(keyHash) as never[];
    return NextResponse.json({ words: rows.map(hydrate).map(toPublic) });
  }

  const words = listPublished({ limit, offset: (page - 1) * limit });
  return NextResponse.json({ words: words.map(toPublic), page, count: words.length });
}

type Submission = {
  word?: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
  explanation?: string;
  why_this_word?: string;
  alternatives?: { word: string; rationale: string }[];
  references?: Reference[];
  related_words?: string[];
  categories?: string[];
  ai_assisted?: boolean;
  input_type?: string;
  verification?: Verification;
};

export async function POST(req: Request) {
  let body: Submission;
  try {
    body = (await req.json()) as Submission;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const word = (body.word ?? "").trim();
  const definition = (body.definition ?? "").trim();
  if (word.length < LIMITS.word.min || word.length > LIMITS.word.max) {
    return NextResponse.json(
      { error: "INVALID_WORD", message: `Word must be ${LIMITS.word.min}–${LIMITS.word.max} characters.` },
      { status: 400 }
    );
  }
  if (definition.length < LIMITS.definition.min || definition.length > LIMITS.definition.max) {
    return NextResponse.json(
      { error: "INVALID_DEFINITION", message: `Definition must be ${LIMITS.definition.min}–${LIMITS.definition.max} characters.` },
      { status: 400 }
    );
  }

  // Resolve or issue a contribution key (browser cookie or X-Contribution-Key header).
  let keyHash = await resolveKeyHash(req);
  let newKey: string | undefined;
  if (!keyHash) {
    const issued = issueKey();
    keyHash = issued.keyHash;
    newKey = issued.key;
  }
  if (!rateLimit(`submit:${keyHash}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many submissions this hour." }, { status: 429 });
  }

  const db = getDb();
  const dup = db
    .prepare("SELECT slug, status FROM words WHERE LOWER(word) = LOWER(?)")
    .get(word) as { slug: string; status: string } | undefined;
  if (dup && dup.status !== "declined") {
    return NextResponse.json(
      { error: "DUPLICATE_WORD", message: `The word "${word}" already exists (${dup.slug}, ${dup.status}).` },
      { status: 409 }
    );
  }

  // Novelty verification: trust a supplied evidence package, otherwise run it now.
  let verification = body.verification;
  if (!verification || !verification.verdict) {
    verification = await verifyNovelty(word, definition);
  }
  if (verification.verdict === "EXISTS") {
    return NextResponse.json(
      {
        error: "NAME_COLLISION",
        message: "This word already exists with this meaning. Try an alternative coinage.",
        verification,
      },
      { status: 409 }
    );
  }

  // Slug selection, the duplicate check and both inserts run in one synchronous
  // transaction. Two concurrent submissions of the same word can both pass the
  // fast-path check above and would otherwise land as two rows differing only by
  // case, each with its own auto-suffixed slug.
  type InsertOutcome = { conflict: { slug: string; status: string } } | { slug: string };
  const insertSubmission = db.transaction((): InsertOutcome => {
    const race = db
      .prepare("SELECT slug, status FROM words WHERE LOWER(word) = LOWER(?)")
      .get(word) as { slug: string; status: string } | undefined;
    if (race && race.status !== "declined") return { conflict: race };

    const newSlug = uniqueSlug(word);
    const info = db
      .prepare(
        `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
          alternatives_json, verification_json, references_json, related_words, categories_json,
          ai_assisted, status, badge, input_type, contributor_key_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', ?, ?, ?)`
      )
      .run(
        newSlug,
        word,
        body.pronunciation?.trim() || null,
        body.part_of_speech?.trim() || "noun",
        definition,
        body.explanation?.trim() ?? "",
        body.why_this_word?.trim() ?? "",
        JSON.stringify((body.alternatives ?? []).slice(0, LIMITS.alternatives)),
        JSON.stringify(verification),
        JSON.stringify((body.references ?? []).slice(0, LIMITS.references)),
        JSON.stringify((body.related_words ?? []).slice(0, LIMITS.relatedWords)),
        JSON.stringify((body.categories ?? []).slice(0, LIMITS.categories)),
        body.ai_assisted ? 1 : 0,
        badgeFromVerdict(verification.verdict),
        body.input_type ?? "form",
        keyHash
      );

    db.prepare("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, ?, 'Initial submission', ?)").run(
      info.lastInsertRowid,
      keyHash,
      JSON.stringify({ word, definition })
    );
    return { slug: newSlug };
  });

  const outcome = insertSubmission();
  if ("conflict" in outcome) {
    return NextResponse.json(
      {
        error: "DUPLICATE_WORD",
        message: `The word "${word}" already exists (${outcome.conflict.slug}, ${outcome.conflict.status}).`,
      },
      { status: 409 }
    );
  }
  const slug = outcome.slug;

  const res = NextResponse.json(
    {
      slug,
      status: "in_review",
      badge: badgeFromVerdict(verification.verdict),
      verification,
      key: newKey,
      // acceptedWordsCount tolerates a key hash that was never issued — reading the row
      // directly threw on the documented `X-Contribution-Key: ck_...` curl path.
      accepted_words: acceptedWordsCount(keyHash),
      review_threshold: REVIEW_THRESHOLD,
    },
    { status: 202 }
  );
  if (newKey) {
    res.cookies.set(KEY_COOKIE, newKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
