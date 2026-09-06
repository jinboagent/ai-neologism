import { getDb } from "@/lib/db";
import type { WordRow } from "@/lib/words";

const TABLES = ["votes", "reviews", "revisions", "words", "keys"] as const;

/** Wipe every table so each test starts from an empty dictionary. */
export function resetDb(): void {
  const db = getDb();
  for (const table of TABLES) db.prepare(`DELETE FROM ${table}`).run();
  // Reset AUTOINCREMENT counters when the bookkeeping table exists, so ids are predictable.
  const hasSequence = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'")
    .get();
  if (hasSequence) db.exec("DELETE FROM sqlite_sequence");
}

export type WordSeed = Partial<{
  slug: string;
  word: string;
  definition: string;
  explanation: string;
  why_this_word: string;
  status: string;
  badge: string;
  contributor_key_hash: string | null;
  use_votes: number;
  work_votes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories_json: string;
  alternatives_json: string;
  verification_json: string;
  ai_assisted: number;
}>;

/** Insert a word row directly, bypassing the submission pipeline. Returns the row id. */
export function insertWord(seed: WordSeed = {}): number {
  const db = getDb();
  const word = seed.word ?? "testword";
  const published = seed.status === "published";
  const info = db
    .prepare(
      `INSERT INTO words (slug, word, definition, explanation, why_this_word, status, badge,
        contributor_key_hash, use_votes, work_votes, published_at, created_at, updated_at,
        categories_json, alternatives_json, verification_json, ai_assisted)
       VALUES (@slug, @word, @definition, @explanation, @why_this_word, @status, @badge,
        @contributor_key_hash, @use_votes, @work_votes, @published_at, @created_at, @updated_at,
        @categories_json, @alternatives_json, @verification_json, @ai_assisted)`
    )
    .run({
      slug: seed.slug ?? word.toLowerCase(),
      word,
      definition: seed.definition ?? "A placeholder definition used by the test suite.",
      explanation: seed.explanation ?? "",
      why_this_word: seed.why_this_word ?? "",
      status: seed.status ?? "in_review",
      badge: seed.badge ?? "unverified",
      contributor_key_hash: seed.contributor_key_hash ?? null,
      use_votes: seed.use_votes ?? 0,
      work_votes: seed.work_votes ?? 0,
      published_at: seed.published_at ?? (published ? "2026-09-01 00:00:00" : null),
      created_at: seed.created_at ?? "2026-09-01 00:00:00",
      updated_at: seed.updated_at ?? "2026-09-01 00:00:00",
      categories_json: seed.categories_json ?? "[]",
      alternatives_json: seed.alternatives_json ?? "[]",
      verification_json: seed.verification_json ?? "{}",
      ai_assisted: seed.ai_assisted ?? 0,
    });
  return Number(info.lastInsertRowid);
}

/** Insert a contribution key row with a preset accepted-word count. */
export function insertKey(keyHash: string, acceptedWords = 0): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO keys (key_hash, accepted_words) VALUES (?, ?)")
    .run(keyHash, acceptedWords);
}

/** Raw votes rows, used by the trending lens. */
export function insertVote(wordId: number, voterHash: string, vote: 1 | -1, createdAt?: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO votes (word_id, voter_hash, vote, created_at) VALUES (?, ?, ?, COALESCE(?, datetime('now')))")
    .run(wordId, voterHash, vote, createdAt ?? null);
}

export function fetchWordRow(slug: string): WordRow | undefined {
  return getDb().prepare("SELECT * FROM words WHERE slug = ?").get(slug) as WordRow | undefined;
}
