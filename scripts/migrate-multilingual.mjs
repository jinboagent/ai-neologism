// One-shot multilingual foundation migration (phase 1 of the i18n plan):
//   1. creates the concepts table — one row per social phenomenon (family anchor)
//   2. adds words.language, words.concept_id, words.grammar_json
//   3. links every existing word to its own concept (label = headword)
//   4. enforces one live entry per concept per language (partial unique index)
// Idempotent in every state — safe to re-run. ensureSchema in src/lib/db.ts
// performs the same steps at boot as a backstop; this script exists for
// explicit, verifiable runs with a printed report.
//
// Usage:
//   node scripts/migrate-multilingual.mjs --target local   (default; data/ai-neologism.db)
//   node scripts/migrate-multilingual.mjs --target turso   (URL/token from .env.turso)

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const target = args.includes("--target") ? args[args.indexOf("--target") + 1] : "local";

function readDotEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

let db;
if (target === "turso") {
  const env = { ...readDotEnv(path.join(process.cwd(), ".env.turso")), ...process.env };
  if (!env.TURSO_DATABASE_URL) {
    console.error("No TURSO_DATABASE_URL found (put it in .env.turso or the environment).");
    process.exit(1);
  }
  db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  console.log(`target : Turso (${env.TURSO_DATABASE_URL})`);
} else if (target === "local") {
  const file = (process.env.NEOLOGISM_DB_PATH ?? path.join(process.cwd(), "data", "ai-neologism.db")).replace(/\\/g, "/");
  db = createClient({ url: `file:${file}` });
  console.log(`target : local (${file})`);
} else {
  console.error("Unknown --target (use local or turso)");
  process.exit(1);
}

const info = await db.execute("PRAGMA table_info(words)");
if (info.rows.length === 0) {
  console.error("No words table here — this script migrates an existing dictionary, not a blank database.");
  process.exit(1);
}
const names = info.rows.map((r) => String(r.name));

// 1 + 2. Family anchor table and the three new word columns.
await db.execute(`CREATE TABLE IF NOT EXISTS concepts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
const added = [];
if (!names.includes("language")) {
  await db.execute("ALTER TABLE words ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  added.push("language");
}
if (!names.includes("concept_id")) {
  await db.execute("ALTER TABLE words ADD COLUMN concept_id INTEGER");
  added.push("concept_id");
}
if (!names.includes("grammar_json")) {
  await db.execute("ALTER TABLE words ADD COLUMN grammar_json TEXT NOT NULL DEFAULT '{}'");
  added.push("grammar_json");
}
console.log(added.length ? `columns added: ${added.join(", ")}` : "columns: already present");

// 3. Concept backfill — one concept per unlinked word, batched. MAX(id) is safe
// because batch statements run sequentially on one connection.
const pending = await db.execute("SELECT id, word FROM words WHERE concept_id IS NULL ORDER BY id");
if (pending.rows.length > 0) {
  const statements = pending.rows.flatMap((r) => [
    { sql: "INSERT INTO concepts (label) VALUES (?)", args: [String(r.word)] },
    { sql: "UPDATE words SET concept_id = (SELECT MAX(id) FROM concepts) WHERE id = ?", args: [Number(r.id)] },
  ]);
  for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100), "write");
  }
}
console.log(`concepts linked: ${pending.rows.length} word(s) → ${pending.rows.length} new concept(s)`);

// 4. Family uniqueness — one live entry per concept per language (rejected
// entries are exempt). Created only after the backfill above has had its chance.
await db.execute(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_words_concept_language_active ON words(concept_id, language) WHERE status IN ('published', 'in_review')"
);

// Report.
const words = await db.execute("SELECT COUNT(*) AS n FROM words");
const concepts = await db.execute("SELECT COUNT(*) AS n FROM concepts");
const unlinked = await db.execute("SELECT COUNT(*) AS n FROM words WHERE concept_id IS NULL");
const langs = await db.execute("SELECT language, COUNT(*) AS n FROM words GROUP BY language ORDER BY language");
const liveDupes = await db.execute(
  `SELECT COUNT(*) AS n FROM (
     SELECT concept_id, language FROM words
     WHERE concept_id IS NOT NULL AND status IN ('published', 'in_review')
     GROUP BY concept_id, language HAVING COUNT(*) > 1
   )`
);
console.log("\nverification:");
console.log(`  words              ${Number(words.rows[0].n)}`);
console.log(`  concepts           ${Number(concepts.rows[0].n)}`);
console.log(`  unlinked words     ${Number(unlinked.rows[0].n)} (must be 0)`);
for (const r of langs.rows) console.log(`  language ${String(r.language).padEnd(4)} ${Number(r.n)}`);
console.log(`  live family dupes  ${Number(liveDupes.rows[0].n)} (must be 0)`);
console.log("done.");
