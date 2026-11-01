import { qAll, qGet, qRun, withTx } from "./db";
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
  contact_email: string | null;
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
 * digest of a high-entropy key, but it is still an internal ownership identifier;
 * `contact_email` is personal data voluntarily provided for review notifications.
 * Neither belongs in a response body.
 */
export type PublicWord = Omit<Word, "contributor_key_hash" | "contact_email">;

export function toPublic(w: Word): PublicWord {
  const { contributor_key_hash: _internal, contact_email: _contact, ...rest } = w;
  return rest;
}

// Field bounds live in ./limits — a client-safe module (see the note there).
export { LIMITS } from "./limits";

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

export async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "word";
  let candidate = slug;
  let n = 2;
  while (await qGet("SELECT 1 FROM words WHERE slug = ?", [candidate])) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

export async function listPublished(opts: { limit?: number; offset?: number } = {}): Promise<Word[]> {
  const rows = await qAll<WordRow>(
    `SELECT * FROM words WHERE status = 'published'
     ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [opts.limit ?? 50, opts.offset ?? 0]
  );
  return rows.map(hydrate);
}

export async function countPublished(): Promise<number> {
  const row = await qGet<{ n: number }>("SELECT COUNT(*) AS n FROM words WHERE status = 'published'");
  return row?.n ?? 0;
}

/** Visibility: published words are public; drafts/queue items only to their owner or a reviewer. */
export async function getWord(slug: string, viewerKeyHash?: string | null): Promise<Word | null> {
  const row = await qGet<WordRow>("SELECT * FROM words WHERE slug = ?", [slug]);
  if (!row) return null;
  const w = hydrate(row);
  const isOwner = viewerKeyHash && w.contributor_key_hash === viewerKeyHash;
  const isReviewer = viewerKeyHash ? await canReview(viewerKeyHash) : false;
  if (w.status !== "published" && !isOwner && !isReviewer) return null;
  return w;
}

export async function listByLetter(letter: string): Promise<Word[]> {
  // Escape LIKE metacharacters so a "%" or "_" in `letter` matches literally
  // instead of acting as a wildcard.
  const escaped = letter.replace(/[\\%_]/g, (m) => `\\${m}`);
  const rows = await qAll<WordRow>(
    `SELECT * FROM words WHERE status = 'published' AND word LIKE ? ESCAPE '\\'
     ORDER BY word COLLATE NOCASE`,
    [`${escaped}%`]
  );
  return rows.map(hydrate);
}

export async function alphabetWithCounts(): Promise<{ letter: string; count: number }[]> {
  const rows = await qAll<{ letter: string; n: number }>(
    `SELECT UPPER(SUBSTR(word, 1, 1)) AS letter, COUNT(*) AS n FROM words
     WHERE status = 'published' GROUP BY letter ORDER BY letter`
  );
  return rows.filter((r) => /^[A-Z]$/.test(r.letter)).map((r) => ({ letter: r.letter, count: r.n }));
}

export async function searchWords(q: string, limit = 30): Promise<Word[]> {
  // Phrase-quote the query so user punctuation can't break FTS syntax.
  const sanitized = q.replace(/["*()]/g, " ").replace(/['-]/g, " ").trim();
  if (!sanitized) return [];
  const rows = await qAll<WordRow>(
    `SELECT w.* FROM words_fts f
     JOIN words w ON w.id = f.rowid
     WHERE words_fts MATCH ? AND w.status = 'published'
     ORDER BY rank LIMIT ?`,
    [`"${sanitized}"`, limit]
  );
  return rows.map(hydrate);
}

export type PopularityLens = "trending" | "endorsed" | "contested" | "verified";

export async function popularity(lens: PopularityLens, limit = 10): Promise<Word[]> {
  let sql: string;
  switch (lens) {
    case "endorsed":
      sql = `SELECT * FROM words WHERE status='published' AND use_votes > 0
             ORDER BY use_votes DESC, work_votes ASC LIMIT ?`;
      break;
    case "contested":
      sql = `SELECT *, (use_votes * work_votes) AS heat FROM words
             WHERE status='published' AND use_votes > 0 AND work_votes > 0
             ORDER BY heat DESC LIMIT ?`;
      break;
    case "verified":
      sql = `SELECT * FROM words WHERE status='published'
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
  const rows = await qAll<WordRow>(sql, [limit]);
  return rows.map(hydrate);
}

export function recordVote(
  slug: string,
  voterHash: string,
  vote: 1 | -1
): Promise<{ ok: boolean; use_votes: number; work_votes: number }> {
  return withTx(async (tx) => {
    const wordRes = await tx.execute(
      "SELECT id, use_votes, work_votes FROM words WHERE slug = ? AND status='published'",
      [slug]
    );
    const word = wordRes.rows[0] as unknown as { id: number; use_votes: number; work_votes: number } | undefined;
    if (!word) return { ok: false, use_votes: 0, work_votes: 0 };

    const existingRes = await tx.execute("SELECT vote FROM votes WHERE word_id = ? AND voter_hash = ?", [
      word.id,
      voterHash,
    ]);
    const existing = existingRes.rows[0] as unknown as { vote: number } | undefined;
    if (existing) {
      if (existing.vote === vote) {
        await tx.execute("DELETE FROM votes WHERE word_id = ? AND voter_hash = ?", [word.id, voterHash]);
      } else {
        await tx.execute("UPDATE votes SET vote = ?, created_at = datetime('now') WHERE word_id = ? AND voter_hash = ?", [
          vote,
          word.id,
          voterHash,
        ]);
      }
    } else {
      await tx.execute("INSERT INTO votes (word_id, voter_hash, vote) VALUES (?, ?, ?)", [word.id, voterHash, vote]);
    }
    const countsRes = await tx.execute(
      "SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END),0) AS u, COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END),0) AS w FROM votes WHERE word_id = ?",
      [word.id]
    );
    const counts = countsRes.rows[0] as unknown as { u: number; w: number };
    await tx.execute("UPDATE words SET use_votes = ?, work_votes = ?, updated_at = datetime('now') WHERE id = ?", [
      counts.u,
      counts.w,
      word.id,
    ]);
    return { ok: true, use_votes: counts.u, work_votes: counts.w };
  });
}
