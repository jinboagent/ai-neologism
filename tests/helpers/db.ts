import { ensureSchema, qAll, qGet, qRun } from "@/lib/db";
import type { WordRow } from "@/lib/words";

const TABLES = ["votes", "reviews", "revisions", "words", "keys", "concepts"] as const;

/** Wipe every table so each test starts from an empty dictionary. */
export async function resetDb(): Promise<void> {
  await ensureSchema();
  for (const table of TABLES) {
    await qRun(`DELETE FROM ${table}`);
  }
  // Reset AUTOINCREMENT counters when the bookkeeping table exists, so ids are predictable.
  const hasSequence = await qGet("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'");
  if (hasSequence) await qRun("DELETE FROM sqlite_sequence");
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
  references_json: string;
  related_words: string;
  verification_json: string;
  ai_assisted: number;
  language: string;
  concept_id: number | null;
  grammar_json: string;
}>;

/** Insert a word row directly, bypassing the submission pipeline. Returns the row id. */
export async function insertWord(seed: WordSeed = {}): Promise<number> {
  const word = seed.word ?? "testword";
  const published = seed.status === "published";
  const info = await qRun(
    `INSERT INTO words (slug, word, definition, explanation, why_this_word, status, badge,
      contributor_key_hash, use_votes, work_votes, published_at, created_at, updated_at,
      categories_json, alternatives_json, references_json, related_words, verification_json, ai_assisted,
      language, concept_id, grammar_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      seed.slug ?? word.toLowerCase(),
      word,
      seed.definition ?? "A placeholder definition used by the test suite.",
      seed.explanation ?? "",
      seed.why_this_word ?? "",
      seed.status ?? "in_review",
      seed.badge ?? "unverified",
      seed.contributor_key_hash ?? null,
      seed.use_votes ?? 0,
      seed.work_votes ?? 0,
      seed.published_at ?? (published ? "2026-09-01 00:00:00" : null),
      seed.created_at ?? "2026-09-01 00:00:00",
      seed.updated_at ?? "2026-09-01 00:00:00",
      seed.categories_json ?? "[]",
      seed.alternatives_json ?? "[]",
      seed.references_json ?? "[]",
      seed.related_words ?? "[]",
      seed.verification_json ?? "{}",
      seed.ai_assisted ?? 0,
      seed.language ?? "en",
      seed.concept_id ?? null,
      seed.grammar_json ?? "{}",
    ]
  );
  return info.lastInsertRowid;
}

/** Insert a contribution key row with a preset accepted-word count. */
export async function insertKey(keyHash: string, acceptedWords = 0): Promise<void> {
  await qRun("INSERT OR REPLACE INTO keys (key_hash, accepted_words) VALUES (?, ?)", [keyHash, acceptedWords]);
}

/** Raw votes rows, used by the trending lens. */
export async function insertVote(wordId: number, voterHash: string, vote: 1 | -1, createdAt?: string): Promise<void> {
  await qRun(
    "INSERT OR REPLACE INTO votes (word_id, voter_hash, vote, created_at) VALUES (?, ?, ?, COALESCE(?, datetime('now')))",
    [wordId, voterHash, vote, createdAt ?? null]
  );
}

export async function fetchWordRow(slug: string): Promise<WordRow | undefined> {
  return qGet<WordRow>("SELECT * FROM words WHERE slug = ?", [slug]);
}

/** Raw query escape hatches for tests that assert on database state directly. */
export async function rawAll<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return qAll<T>(sql, args as never);
}

export async function rawGet<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | undefined> {
  await ensureSchema();
  return qGet<T>(sql, args as never);
}

export async function rawRun(sql: string, args: unknown[] = []): Promise<void> {
  await ensureSchema();
  await qRun(sql, args as never);
}
