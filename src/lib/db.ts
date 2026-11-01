// Database access via @libsql/client. One code path serves both worlds:
//  - locally (and in tests): a plain SQLite file (file: URL, incl. :memory:)
//  - in production on Vercel: a Turso database (libsql:// URL + auth token)
// Set TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in the environment to go remote.
// Everything else — schema, SQL, data — is identical in both modes.

import { createClient, type Client, type InValue } from "@libsql/client";
import path from "node:path";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "ai-neologism.db");

declare global {
  // eslint-disable-next-line no-var
  var __neologismDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __neologismSchema: Promise<void> | undefined;
}

function resolveTarget(): { url: string; authToken?: string } {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  // NEOLOGISM_DB_PATH (used by tests for :memory:) or the default local file.
  const file = process.env.NEOLOGISM_DB_PATH || DEFAULT_DB_PATH;
  // libsql file URLs want forward slashes, including on Windows.
  return { url: `file:${file.replace(/\\/g, "/")}` };
}

/** The libsql client. Schema creation is handled by ensureSchema (see below). */
export function getDb(): Client {
  if (!globalThis.__neologismDb) {
    const { url, authToken } = resolveTarget();
    globalThis.__neologismDb = createClient({ url, authToken });
  }
  return globalThis.__neologismDb;
}

// Each statement stands alone: CREATE ... IF NOT EXISTS keeps runs idempotent.
// Triggers keep their internal semicolons — they are single array entries, never split.
const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      word TEXT NOT NULL,
      pronunciation TEXT,
      part_of_speech TEXT NOT NULL DEFAULT 'noun',
      definition TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      why_this_word TEXT NOT NULL DEFAULT '',
      alternatives_json TEXT NOT NULL DEFAULT '[]',
      verification_json TEXT NOT NULL DEFAULT '{}',
      references_json TEXT NOT NULL DEFAULT '[]',
      related_words TEXT NOT NULL DEFAULT '[]',
      categories_json TEXT NOT NULL DEFAULT '[]',
      ai_assisted INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_review',
      return_notes TEXT,
      badge TEXT NOT NULL DEFAULT 'unverified',
      input_type TEXT,
      contributor_key_hash TEXT,
      contact_email TEXT,
      use_votes INTEGER NOT NULL DEFAULT 0,
      work_votes INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  `CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      editor_key_hash TEXT,
      summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  `CREATE TABLE IF NOT EXISTS votes (
      word_id INTEGER NOT NULL REFERENCES words(id),
      voter_hash TEXT NOT NULL,
      vote INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(word_id, voter_hash)
    )`,
  `CREATE TABLE IF NOT EXISTS keys (
      key_hash TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_words INTEGER NOT NULL DEFAULT 0
    )`,
  `CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      reviewer_key_hash TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  `CREATE TABLE IF NOT EXISTS seeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      slug TEXT,
      contributor_key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
      word, definition, explanation, why_this_word,
      content='words', content_rowid='id', tokenize='porter unicode61'
    )`,
  `CREATE TRIGGER IF NOT EXISTS words_fts_ai AFTER INSERT ON words BEGIN
      INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
      VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
    END`,
  `CREATE TRIGGER IF NOT EXISTS words_fts_ad AFTER DELETE ON words BEGIN
      INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
      VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
    END`,
  `CREATE TRIGGER IF NOT EXISTS words_fts_au AFTER UPDATE OF word, definition, explanation, why_this_word ON words BEGIN
      INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
      VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
      INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
      VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
    END`,
  `CREATE INDEX IF NOT EXISTS idx_words_status ON words(status)`,
  `CREATE INDEX IF NOT EXISTS idx_votes_word ON votes(word_id)`,
  `CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_seeds_key ON seeds(contributor_key_hash)`,
];

/** Create the schema once per process. Safe to call concurrently and repeatedly. */
export async function ensureSchema(): Promise<void> {
  if (!globalThis.__neologismSchema) {
    globalThis.__neologismSchema = (async () => {
      const db = getDb();
      for (const sql of SCHEMA_STATEMENTS) {
        await db.execute(sql);
      }
      // Column migration for databases created before a column existed.
      const info = await db.execute("PRAGMA table_info(words)");
      const names = info.rows.map((r) => String(r.name));
      if (!names.includes("contact_email")) {
        await db.execute("ALTER TABLE words ADD COLUMN contact_email TEXT");
      }
    })().catch((e) => {
      globalThis.__neologismSchema = undefined; // allow a retry on the next call
      throw e;
    });
  }
  await globalThis.__neologismSchema;
}

/** All rows matching the query. */
export async function qAll<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getDb().execute({ sql, args });
  return res.rows as unknown as T[];
}

/** First row or undefined. */
export async function qGet<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const rows = await qAll<T>(sql, args);
  return rows[0];
}

/** Run a write statement; returns the inserted row id when applicable. */
export async function qRun(sql: string, args: InValue[] = []): Promise<{ lastInsertRowid: number }> {
  await ensureSchema();
  const res = await getDb().execute({ sql, args });
  return { lastInsertRowid: Number(res.lastInsertRowid) };
}

/** Atomic multi-statement work: fn receives a transactional client (execute only). */
export async function withTx<T>(fn: (tx: { execute: Client["execute"] }) => Promise<T>): Promise<T> {
  await ensureSchema();
  const db = getDb();
  const tx = await db.transaction("write");
  try {
    const out = await fn(tx as unknown as { execute: Client["execute"] });
    await tx.commit();
    return out;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
