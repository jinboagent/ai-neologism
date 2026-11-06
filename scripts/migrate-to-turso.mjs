// One-shot data migration: local SQLite file → Turso (or any libsql remote).
//
// The schema is NOT duplicated here — the script reads the actual CREATE
// statements from the local database's sqlite_master and replays them on the
// remote, so schema drift is impossible. Data rows (words, revisions, votes,
// keys, reviews, seeds) are then copied with their original ids and dates; the
// FTS table is NOT copied — its triggers repopulate it as words are inserted.
//
// Usage:
//   node scripts/migrate-to-turso.mjs --url libsql://<db>.turso.io --token <token>
//   (or set TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in the environment)
//
// Safety: refuses to touch a remote that already has words (use --force to
// allow a re-run into a non-empty database). The local database is only read.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (name) => args.includes(`--${name}`);

// Remote target: CLI flags win over env; .env.local is consulted as a last resort.
function readEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const envLocal = readEnvLocal();
const REMOTE_URL = getArg("url") ?? process.env.TURSO_DATABASE_URL ?? envLocal.TURSO_DATABASE_URL;
const REMOTE_TOKEN = getArg("token") ?? process.env.TURSO_AUTH_TOKEN ?? envLocal.TURSO_AUTH_TOKEN;
const FORCE = hasFlag("force");

if (!REMOTE_URL) {
  console.error("No remote target. Pass --url libsql://<db>.turso.io --token <token> (or set TURSO_DATABASE_URL / TURSO_AUTH_TOKEN).");
  process.exit(1);
}

const localPath = (process.env.NEOLOGISM_DB_PATH ?? path.join(process.cwd(), "data", "ai-neologism.db")).replace(/\\/g, "/");
const local = createClient({ url: `file:${localPath}` });
const remote = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN });

const TABLES = ["words", "revisions", "votes", "keys", "reviews", "seeds"];

async function counts(db) {
  const out = {};
  for (const t of TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`);
    out[t] = Number(r.rows[0].n);
  }
  return out;
}

console.log(`local : ${localPath}`);
console.log(`remote: ${REMOTE_URL}\n`);

// 0. Precondition — never merge into a populated remote by accident.
let remoteWords = 0;
try {
  const r = await remote.execute("SELECT COUNT(*) AS n FROM words");
  remoteWords = Number(r.rows[0].n);
} catch {
  remoteWords = 0; // table missing → fresh database
}
if (remoteWords > 0 && !FORCE) {
  console.error(`Remote already holds ${remoteWords} words. Refusing to overwrite — pass --force to allow a re-run.`);
  process.exit(1);
}

// 1. Replay the schema exactly as it exists locally (includes IF NOT EXISTS).
//    The FTS virtual table is replayed (its AFTER INSERT triggers need it in
//    place while words are copied), but its internal shadow tables are not —
//    creating the virtual table builds those itself. Tables before triggers
//    so every object's dependencies exist when it is created.
const objects = await local.execute(
  `SELECT type, name, sql FROM sqlite_master
   WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     AND NOT (type = 'table' AND name LIKE 'words_fts\\_%' ESCAPE '\\')
   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid`
);
console.log(`replaying schema (${objects.rows.length} objects; virtual FTS table + triggers included)…`);
for (const row of objects.rows) {
  await remote.execute(String(row.sql));
}

// 2. Copy rows, original ids and dates preserved. words_fts is skipped — its
//    AFTER INSERT triggers repopulate it as words land.
const before = await counts(local);
for (const table of TABLES) {
  if (before[table] === 0) {
    console.log(`${table.padEnd(10)} 0 rows (skipped)`);
    continue;
  }
  const rows = await local.execute(`SELECT * FROM ${table}`);
  const cols = rows.columns;
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = { sql: `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`, args: [] };
  const statements = rows.rows.map((r) => ({ ...stmt, args: cols.map((c) => r[c]) }));
  for (let i = 0; i < statements.length; i += 40) {
    await remote.batch(statements.slice(i, i + 40), "write");
  }
  console.log(`${table.padEnd(10)} ${rows.rows.length} rows copied`);
}

// 3. Verify the FTS mirror was populated by the triggers and print counts.
const fts = await remote.execute("SELECT COUNT(*) AS n FROM words_fts");
const after = await counts(remote);
console.log(`\nverification:`);
for (const t of TABLES) {
  const ok = before[t] === after[t] ? "ok" : `MISMATCH (local ${before[t]} / remote ${after[t]})`;
  console.log(`  ${t.padEnd(10)} ${after[t]} — ${ok}`);
}
console.log(`  words_fts  ${Number(fts.rows[0].n)} (search index, auto-built)`);
console.log(`\ndone. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in the Vercel dashboard and the site serves this data.`);
