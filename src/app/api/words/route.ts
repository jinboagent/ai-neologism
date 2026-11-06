import { NextResponse } from "next/server";
import { qAll, qGet, withTx } from "@/lib/db";
import { acceptedWordsCount, issueKey, KEY_COOKIE, resolveKeyHash, REVIEW_THRESHOLD } from "@/lib/keys";
import { rateLimit } from "@/lib/ratelimit";
import { badgeFromVerdict, verifyNovelty } from "@/lib/verify";
import { CATEGORIES } from "@/lib/categories";
import {
  clampText,
  sanitizeAlternatives,
  sanitizeCategories,
  sanitizeReferences,
  sanitizeSlugList,
} from "@/lib/sanitize";
import { countPublished, hydrate, LIMITS, listPublished, slugify, toPublic, type Reference } from "@/lib/words";

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
    const rows = await qAll<never>("SELECT * FROM words WHERE contributor_key_hash = ? ORDER BY updated_at DESC", [keyHash]);
    return NextResponse.json({ words: rows.map(hydrate).map(toPublic) });
  }

  const words = await listPublished({ limit, offset: (page - 1) * limit });
  // `count` is the total number of published words (finding #9: it used to report
  // the current page's size); `page_size` is the number of items on this page.
  const total = await countPublished();
  return NextResponse.json({ words: words.map(toPublic), page, count: total, page_size: words.length });
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
  contact_email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const contactEmail = (body.contact_email ?? "").trim();
  if (contactEmail && (contactEmail.length > 200 || !EMAIL_RE.test(contactEmail))) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "contact_email must be a valid email address (or omitted)." },
      { status: 400 }
    );
  }

  // Field bounds enforced on every write path (finding #3): PUT and the admin
  // edit already did this; POST now matches instead of storing unbounded text.
  const pronunciation = clampText(body.pronunciation, LIMITS.pronunciation.max);
  const partOfSpeech = clampText(body.part_of_speech, LIMITS.partOfSpeech.max) || "noun";
  const explanation = clampText(body.explanation, LIMITS.explanation.max);
  const whyThisWord = clampText(body.why_this_word, LIMITS.whyThisWord.max);
  const tooLong: [string, number, number][] = [
    ["pronunciation", body.pronunciation?.trim().length ?? 0, LIMITS.pronunciation.max],
    ["part_of_speech", body.part_of_speech?.trim().length ?? 0, LIMITS.partOfSpeech.max],
    ["explanation", body.explanation?.trim().length ?? 0, LIMITS.explanation.max],
    ["why_this_word", body.why_this_word?.trim().length ?? 0, LIMITS.whyThisWord.max],
  ];
  const over = tooLong.find(([, len, max]) => len > max);
  if (over) {
    return NextResponse.json(
      { error: "FIELD_TOO_LONG", message: `${over[0]} must be at most ${over[2]} characters.` },
      { status: 400 }
    );
  }

  const references = sanitizeReferences(body.references);
  const alternatives = sanitizeAlternatives(body.alternatives);
  const relatedWords = sanitizeSlugList(body.related_words);
  const categories = sanitizeCategories(body.categories, CATEGORIES);

  // Channel detection: non-browser clients authenticate via the header, so their
  // submissions are flagged 'api' server-side (client-supplied input_type is not
  // trusted). API words go to the admin-only review queue.
  const viaApi = !!req.headers.get("x-contribution-key");
  const inputType = viaApi ? "api" : body.input_type ?? "form";

  // Resolve or issue a contribution key (browser cookie or X-Contribution-Key header).
  let keyHash = await resolveKeyHash(req);
  let newKey: string | undefined;
  if (!keyHash) {
    const issued = await issueKey();
    keyHash = issued.keyHash;
    newKey = issued.key;
  }
  if (!rateLimit(`submit:${keyHash}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many submissions this hour." }, { status: 429 });
  }

  const dup = await qGet<{ slug: string; status: string }>("SELECT slug, status FROM words WHERE LOWER(word) = LOWER(?)", [word]);
  if (dup && dup.status !== "declined") {
    return NextResponse.json(
      { error: "DUPLICATE_WORD", message: `The word "${word}" already exists (${dup.slug}, ${dup.status}).` },
      { status: 409 }
    );
  }

  // Novelty verification is server-authoritative (finding #4): a caller-supplied
  // verification package is never trusted for the verdict — the search always runs
  // here, so a fabricated "NEW" cannot mint a badge. The client package is discarded.
  const verification = await verifyNovelty(word, definition);
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
  const insertSubmission = (): Promise<InsertOutcome> =>
    withTx(async (tx): Promise<InsertOutcome> => {
      const raceRes = await tx.execute("SELECT slug, status FROM words WHERE LOWER(word) = LOWER(?)", [word]);
      const race = raceRes.rows[0] as unknown as { slug: string; status: string } | undefined;
      if (race && race.status !== "declined") return { conflict: race };

      // Slug uniqueness is checked on the transaction itself — the embedded
      // client has a single connection, and a nested main-client call while the
      // transaction is open would deadlock (TRANSACTION_ACTIVE).
      const base = slugify(word) || "word";
      let newSlug = base;
      let n = 2;
      while (true) {
        const slugTaken = await tx.execute("SELECT 1 FROM words WHERE slug = ?", [newSlug]);
        if (slugTaken.rows.length === 0) break;
        newSlug = `${base}-${n++}`;
      }
      const info = await tx.execute(
        `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
          alternatives_json, verification_json, references_json, related_words, categories_json,
          ai_assisted, status, badge, input_type, contributor_key_hash, contact_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', ?, ?, ?, ?)`,
        [
          newSlug,
          word,
          pronunciation || null,
          partOfSpeech,
          definition,
          explanation,
          whyThisWord,
          JSON.stringify(alternatives),
          JSON.stringify(verification),
          JSON.stringify(references),
          JSON.stringify(relatedWords),
          JSON.stringify(categories),
          body.ai_assisted ? 1 : 0,
          badgeFromVerdict(verification.verdict),
          inputType,
          keyHash as string,
          contactEmail || null,
        ]
      );
      const wordId = Number(info.lastInsertRowid);
      await tx.execute("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, ?, 'Initial submission', ?)", [
        wordId,
        keyHash as string,
        JSON.stringify({ word, definition }),
      ]);
      return { slug: newSlug };
    });

  const outcome = await insertSubmission();
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
      accepted_words: await acceptedWordsCount(keyHash),
      review_threshold: REVIEW_THRESHOLD,
    },
    { status: 202 }
  );
  if (newKey) {
    res.cookies.set(KEY_COOKIE, newKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
