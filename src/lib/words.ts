import { getDb } from "./db";
import { canReview } from "./keys";

export type Reference = {
  type: "news" | "academic" | "essay" | "social" | "internal";
  title: string;
  author?: string;
  outlet?: string;
  date?: string;
  url?: string;
  excerpt?: string;
};

export type Alternative = { word: string; rationale: string };

export type VerificationQuery = {
  query: string;
  results_checked: number;
  meaningful_matches: number;
};

export type Verification = {
  verdict: "NEW" | "NEAR_EXISTING" | "EXISTS" | "UNVERIFIED";
  checked_at?: string;
  method?: string;
  queries?: VerificationQuery[];
  closest_matches?: { url?: string; note: string }[];
  note?: string;
};

export type WordRow = {
  id: number;
  slug: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string;
  definition: string;
  explanation: string;
  why_this_word: string;
  alternatives_json: string;
  verification_json: string;
  references_json: string;
  related_words: string;
  categories_json: string;
  ai_assisted: number;
  status: string;
  return_notes: string | null;
  badge: string;
  input_type: string | null;
  contributor_key_hash: string | null;
  use_votes: number;
  work_votes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Word = Omit<WordRow, "alternatives_json" | "verification_json" | "references_json" | "related_words" | "categories_json" | "ai_assisted"> & {
  alternatives: Alternative[];
  verification: Verification;
  references: Reference[];
  related_words: string[];
  categories: string[];
  ai_assisted: boolean;
};

export function parseJsonColumn<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function hydrate(row: WordRow): Word {
  return {
    ...row,
    alternatives: parseJsonColumn<Alternative[]>(row.alternatives_json, []),
    verification: parseJsonColumn<Verification>(row.verification_json, { verdict: "UNVERIFIED" }),
    references: parseJsonColumn<Reference[]>(row.references_json, []),
    related_words: parseJsonColumn<string[]>(row.related_words, []),
    categories: parseJsonColumn<string[]>(row.categories_json, []),
    ai_assisted: row.ai_assisted === 1,
  };
}

/**
 * Word shape safe to send over the API. `contributor_key_hash` is only a SHA-256
 * digest of a high-entropy key, but it is still an internal ownership identifier —
 * nothing like it belongs in a response body.
 */
export type PublicWord = Omit<Word, "contributor_key_hash">;

export function toPublic(w: Word): PublicWord {
  const { contributor_key_hash: _internal, ...rest } = w;
  return rest;
}

/**
 * Field bounds shared by every write path. POST and PUT used to disagree — POST
 * capped the definition at 600 characters while PUT accepted anything.
 */
export const LIMITS = {
  word: { min: 2, max: 80 },
  definition: { min: 10, max: 600 },
  explanation: { max: 4000 },
  whyThisWord: { max: 4000 },
  pronunciation: { max: 120 },
  partOfSpeech: { max: 40 },
  alternatives: 8,
  references: 12,
  relatedWords: 12,
  categories: 6,
} as const;

const PUBLIC_COLS = `id, slug, word, pronunciation, part_of_speech, definition, explanation,
  why_this_word, alternatives_json, verification_json, references_json, related_words,
  categories_json, ai_assisted, status, return_notes, badge, input_type, contributor_key_hash,
  use_votes, work_votes, published_at, created_at, updated_at`;

export function slugify(word: string): string {
  return word
    .toLowerCase()
    .trim()
    // Keep "_" here so the next step can turn it into a hyphen; stripping it
    // earlier would silently merge "micro_legacy" into "microlegacy".
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base: string): string {
  const db = getDb();
  let slug = slugify(base);
  if (!slug) slug = "word";
  let candidate = slug;
  let n = 2;
  while (db.prepare("SELECT 1 FROM words WHERE slug = ?").get(candidate)) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

export function listPublished(opts: { limit?: number; offset?: number } = {}): Word[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${PUBLIC_COLS} FROM words WHERE status = 'published'
       ORDER BY published_at DESC LIMIT ? OFFSET ?`
    )
    .all(opts.limit ?? 50, opts.offset ?? 0) as WordRow[];
  return rows.map(hydrate);
}

export function countPublished(): number {
  return (getDb()
    .prepare("SELECT COUNT(*) AS n FROM words WHERE status = 'published'")
    .get() as { n: number }).n;
}

/** Visibility: published words are public; drafts/queue items only to their owner or a reviewer. */
export function getWord(slug: string, viewerKeyHash?: string | null): Word | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${PUBLIC_COLS} FROM words WHERE slug = ?`)
    .get(slug) as WordRow | undefined;
  if (!row) return null;
  const w = hydrate(row);
  const isOwner = viewerKeyHash && w.contributor_key_hash === viewerKeyHash;
  const isReviewer = viewerKeyHash && canReview(viewerKeyHash);
  if (w.status !== "published" && !isOwner && !isReviewer) return null;
  return w;
}

export function listByLetter(letter: string): Word[] {
  // Escape LIKE metacharacters so a "%" or "_" in `letter` matches literally
  // instead of acting as a wildcard.
  const escaped = letter.replace(/[\\%_]/g, (m) => `\\${m}`);
  const rows = getDb()
    .prepare(
      `SELECT ${PUBLIC_COLS} FROM words WHERE status = 'published' AND word LIKE ? ESCAPE '\\'
       ORDER BY word COLLATE NOCASE`
    )
    .all(`${escaped}%`) as WordRow[];
  return rows.map(hydrate);
}

export function alphabetWithCounts(): { letter: string; count: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT UPPER(SUBSTR(word, 1, 1)) AS letter, COUNT(*) AS n FROM words
       WHERE status = 'published' GROUP BY letter ORDER BY letter`
    )
    .all() as { letter: string; n: number }[];
  return rows.filter((r) => /^[A-Z]$/.test(r.letter)).map((r) => ({ letter: r.letter, count: r.n }));
}

export function searchWords(q: string, limit = 30): Word[] {
  const db = getDb();
  // Phrase-quote the query so user punctuation can't break FTS syntax.
  const sanitized = q.replace(/["*()]/g, " ").replace(/['-]/g, " ").trim();
  if (!sanitized) return [];
  const rows = db
    .prepare(
      `SELECT w.* FROM words_fts f
       JOIN words w ON w.id = f.rowid
       WHERE words_fts MATCH ? AND w.status = 'published'
       ORDER BY rank LIMIT ?`
    )
    .all(`"${sanitized}"`, limit) as WordRow[];
  return rows.map(hydrate);
}

export type PopularityLens = "trending" | "endorsed" | "contested" | "verified";

export function popularity(lens: PopularityLens, limit = 10): Word[] {
  const db = getDb();
  let sql = "";
  switch (lens) {
    case "endorsed":
      sql = `SELECT ${PUBLIC_COLS} FROM words WHERE status='published' AND use_votes > 0
             ORDER BY use_votes DESC, work_votes ASC LIMIT ?`;
      break;
    case "contested":
      sql = `SELECT ${PUBLIC_COLS}, (use_votes * work_votes) AS heat FROM words
             WHERE status='published' AND use_votes > 0 AND work_votes > 0
             ORDER BY heat DESC LIMIT ?`;
      break;
    case "verified":
      sql = `SELECT ${PUBLIC_COLS} FROM words WHERE status='published'
             ORDER BY published_at DESC LIMIT ?`;
      break;
    case "trending":
    default:
      sql = `SELECT w.*, COALESCE(v.points, 0) AS points FROM words w
             LEFT JOIN (
               SELECT word_id, SUM(vote) AS points FROM votes
               WHERE created_at > datetime('now', '-7 days') GROUP BY word_id
             ) v ON v.word_id = w.id
             WHERE w.status='published'
             ORDER BY points DESC, w.published_at DESC LIMIT ?`;
      break;
  }
  const rows = db.prepare(sql).all(limit) as WordRow[];
  return rows.map(hydrate);
}

export function recordVote(slug: string, voterHash: string, vote: 1 | -1): { ok: boolean; use_votes: number; work_votes: number } {
  const db = getDb();
  const word = db.prepare("SELECT id, use_votes, work_votes FROM words WHERE slug = ? AND status='published'").get(slug) as
    | { id: number; use_votes: number; work_votes: number }
    | undefined;
  if (!word) return { ok: false, use_votes: 0, work_votes: 0 };
  const tx = db.transaction(() => {
    const existing = db.prepare("SELECT vote FROM votes WHERE word_id = ? AND voter_hash = ?").get(word.id, voterHash) as
      | { vote: number }
      | undefined;
    if (existing) {
      if (existing.vote === vote) {
        db.prepare("DELETE FROM votes WHERE word_id = ? AND voter_hash = ?").run(word.id, voterHash);
      } else {
        db.prepare("UPDATE votes SET vote = ?, created_at = datetime('now') WHERE word_id = ? AND voter_hash = ?").run(vote, word.id, voterHash);
      }
    } else {
      db.prepare("INSERT INTO votes (word_id, voter_hash, vote) VALUES (?, ?, ?)").run(word.id, voterHash, vote);
    }
    const counts = db
      .prepare("SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END),0) AS u, COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END),0) AS w FROM votes WHERE word_id = ?")
      .get(word.id) as { u: number; w: number };
    db.prepare("UPDATE words SET use_votes = ?, work_votes = ?, updated_at = datetime('now') WHERE id = ?").run(counts.u, counts.w, word.id);
    return { ok: true, use_votes: counts.u, work_votes: counts.w };
  });
  return tx();
}
