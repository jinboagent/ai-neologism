import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "ai-neologism.db");

declare global {
  var __neologismDb: Database.Database | undefined;
}

// Resolved lazily so NEOLOGISM_DB_PATH can point tests at an isolated database.
function resolveDbPath(): string {
  return process.env.NEOLOGISM_DB_PATH || DEFAULT_DB_PATH;
}

function createDb(): Database.Database {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
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
      use_votes INTEGER NOT NULL DEFAULT 0,
      work_votes INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      editor_key_hash TEXT,
      summary TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      word_id INTEGER NOT NULL REFERENCES words(id),
      voter_hash TEXT NOT NULL,
      vote INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(word_id, voter_hash)
    );

    CREATE TABLE IF NOT EXISTS keys (
      key_hash TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_words INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      reviewer_key_hash TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
      word, definition, explanation, why_this_word,
      content='words', content_rowid='id', tokenize='porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS words_fts_ai AFTER INSERT ON words BEGIN
      INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
      VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
    END;
    CREATE TRIGGER IF NOT EXISTS words_fts_ad AFTER DELETE ON words BEGIN
      INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
      VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
    END;
    CREATE TRIGGER IF NOT EXISTS words_fts_au AFTER UPDATE OF word, definition, explanation, why_this_word ON words BEGIN
      INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
      VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
      INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
      VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
    END;

    CREATE INDEX IF NOT EXISTS idx_words_status ON words(status);
    CREATE INDEX IF NOT EXISTS idx_votes_word ON votes(word_id);
    CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__neologismDb) {
    globalThis.__neologismDb = createDb();
  }
  return globalThis.__neologismDb;
}
