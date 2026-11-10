// Bidirectional word-level sync: local SQLite ⇄ Turso production.
//
// Local (data/ai-neologism.db) is the editorial source of truth: batch inserts
// and verdict-status corrections land here first. Remote (Turso) carries the
// production data including auto-coiner cron words that local has never seen.
//
// What it does:
//   1. pull remote-only words (+ their revisions/votes) into local, remapping ids
//   2. reconcile status for words present in both (local wins, changes logged)
//   3. delete remote-only rows on the remote (ids freed for the push)
//   4. push local-only words (+ dependents) to remote with explicit local ids
//   5. verify counts both sides
//
// keys / reviews / seeds are REPORT-ONLY (production-infra tables — no writes).
//
// Credentials: reads .env.turso-sync (vercel env pull), .env.local, or env.
//   node scripts/batch/sync-to-turso.mjs [--dry-run]
//
// Ids: the 2026-11-06 migration preserved local ids, so migrated rows match on
// both sides; post-migration ids collided (local batch vs remote cron), which
// is why step 3 deletes the remote cron rows after step 1 has preserved them.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function readEnvFile(file) {
  const p = path.join(ROOT, file);
  const env = {};
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !m[2].includes("[SENSITIVE]")) env[m[1]] = m[2];
  }
  return env;
}
const envLocal = readEnvFile(".env.local");
const envSync = readEnvFile(".env.turso-sync");
const REMOTE_URL = process.env.TURSO_DATABASE_URL ?? envSync.TURSO_DATABASE_URL ?? envLocal.TURSO_DATABASE_URL;
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN ?? envSync.TURSO_AUTH_TOKEN ?? envLocal.TURSO_AUTH_TOKEN;
if (!REMOTE_URL || !REMOTE_TOKEN) {
  console.error("Missing Turso credentials. Fill TURSO_DATABASE_URL / TURSO_AUTH_TOKEN into .env.turso-sync (replace the [SENSITIVE] placeholders), or export them as env vars.");
  process.exit(1);
}
const DRY = process.argv.includes("--dry-run");

const localPath = (process.env.NEOLOGISM_DB_PATH ?? path.join(ROOT, "data", "ai-neologism.db")).replace(/\\/g, "/");
const local = createClient({ url: `file:${localPath}` });
const remote = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN });

const WORD_COLS = ["id","slug","word","pronunciation","part_of_speech","definition","explanation","why_this_word","alternatives_json","verification_json","references_json","related_words","categories_json","ai_assisted","status","return_notes","badge","input_type","contributor_key_hash","use_votes","work_votes","published_at","created_at","updated_at","contact_email"];

const q = async (db, sql, args = []) => (await db.execute({ sql, args })).rows;

console.log(`local : ${localPath}`);
console.log(`remote: ${REMOTE_URL.replace(/:\/\/.*@/, "://***@")}\n`);

// --- snapshot both sides ----------------------------------------------------
const localWords = await q(local, "SELECT * FROM words ORDER BY id");
const remoteWords = await q(remote, "SELECT id, slug, word, status FROM words ORDER BY id");
const localBySlug = new Map(localWords.map((w) => [w.slug, w]));
const remoteBySlug = new Map(remoteWords.map((w) => [w.slug, w]));
console.log(`local words: ${localWords.length}  |  remote words: ${remoteWords.length}`);

const remoteOnly = remoteWords.filter((w) => !localBySlug.has(w.slug));
const localOnly = localWords.filter((w) => !remoteBySlug.has(w.slug));
const common = localWords.filter((w) => remoteBySlug.has(w.slug));
const statusDiff = common.filter((w) => {
  const r = remoteBySlug.get(w.slug);
  return r.status !== w.status;
});
console.log(`remote-only (pull to local): ${remoteOnly.length}  |  local-only (push to remote): ${localOnly.length}  |  status diffs (remote←local): ${statusDiff.length}`);
for (const w of remoteOnly) console.log(`  pull ← ${w.slug} (${w.status}, remote id ${w.id})`);
for (const w of localOnly) console.log(`  push → ${w.slug} (${w.status}, local id ${w.id})`);
for (const w of statusDiff) console.log(`  status → ${w.slug}: ${remoteBySlug.get(w.slug).status} ⇒ ${w.status}`);
if (DRY) { console.log("\n--dry-run: no writes performed."); process.exit(0); }

// --- 1. pull remote-only words into local (id remapped) ----------------------
const remap = new Map(); // old remote id → new local id
for (const w of remoteOnly) {
  const cols = WORD_COLS.filter((c) => c !== "id");
  const row = await q(remote, `SELECT ${cols.join(", ")} FROM words WHERE id = ?`, [w.id]);
  const src = row[0];
  const placeholders = cols.map(() => "?").join(", ");
  const ins = await local.execute({
    sql: `INSERT INTO words (${cols.join(", ")}) VALUES (${placeholders})`,
    args: cols.map((c) => src[c]),
  });
  remap.set(w.id, Number(ins.lastInsertRowid));
}
for (const w of remoteOnly) {
  const newId = remap.get(w.id);
  const revs = await q(remote, "SELECT * FROM revisions WHERE word_id = ?", [w.id]);
  for (const rv of revs) {
    const cols = Object.keys(rv).filter((c) => c !== "id");
    await local.execute({
      sql: `INSERT INTO revisions (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((c) => (c === "word_id" ? newId : rv[c])),
    });
  }
  const votes = await q(remote, "SELECT * FROM votes WHERE word_id = ?", [w.id]);
  for (const v of votes) {
    const cols = Object.keys(v).filter((c) => c !== "id");
    await local.execute({
      sql: `INSERT INTO votes (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      args: cols.map((c) => (c === "word_id" ? newId : v[c])),
    });
  }
}
console.log(`pulled ${remoteOnly.length} remote-only words (+ dependents) into local`);

// --- 2. status reconciliation (local wins) ----------------------------------
for (const w of statusDiff) {
  await remote.execute({ sql: "UPDATE words SET status = ?, updated_at = ? WHERE slug = ?", args: [w.status, w.updated_at ?? new Date().toISOString(), w.slug] });
}
console.log(`status reconciled on remote for ${statusDiff.length} words`);

// --- 3. delete remote-only rows on the remote (ids freed) --------------------
const delIds = remoteOnly.map((w) => w.id);
if (delIds.length) {
  const ph = delIds.map(() => "?").join(", ");
  await remote.execute({ sql: `DELETE FROM votes WHERE word_id IN (${ph})`, args: delIds });
  await remote.execute({ sql: `DELETE FROM revisions WHERE word_id IN (${ph})`, args: delIds });
  await remote.execute({ sql: `DELETE FROM words WHERE id IN (${ph})`, args: delIds });
  console.log(`deleted ${delIds.length} remote-only words (pulled to local first)`);
}

// --- 4. push local-only words (+ dependents) with explicit local ids --------
if (localOnly.length) {
  const insWords = localOnly.map((w) => ({
    sql: `INSERT INTO words (${WORD_COLS.join(", ")}) VALUES (${WORD_COLS.map(() => "?").join(", ")})`,
    args: WORD_COLS.map((c) => w[c]),
  }));
  for (let i = 0; i < insWords.length; i += 40) {
    await remote.batch(insWords.slice(i, i + 40), "write");
  }
  const localOnlyIds = localOnly.map((w) => w.id);
  const ph = localOnlyIds.map(() => "?").join(", ");
  const revs = await q(local, `SELECT * FROM revisions WHERE word_id IN (${ph})`, localOnlyIds);
  if (revs.length) {
    const revCols = Object.keys(revs[0]);
    const stmts = revs.map((rv) => ({
      sql: `INSERT INTO revisions (${revCols.join(", ")}) VALUES (${revCols.map(() => "?").join(", ")})`,
      args: revCols.map((c) => rv[c]),
    }));
    for (let i = 0; i < stmts.length; i += 40) await remote.batch(stmts.slice(i, i + 40), "write");
  }
  const votes = await q(local, `SELECT * FROM votes WHERE word_id IN (${ph})`, localOnlyIds);
  if (votes.length) {
    const voteCols = Object.keys(votes[0]);
    const stmts = votes.map((v) => ({
      sql: `INSERT INTO votes (${voteCols.join(", ")}) VALUES (${voteCols.map(() => "?").join(", ")})`,
      args: voteCols.map((c) => v[c]),
    }));
    for (let i = 0; i < stmts.length; i += 40) await remote.batch(stmts.slice(i, i + 40), "write");
  }
  console.log(`pushed ${localOnly.length} local-only words (+ ${revs.length} revisions, ${votes.length} votes) to remote`);
}

// --- 5. verify ---------------------------------------------------------------
const rl = await q(remote, "SELECT COUNT(*) n FROM words");
const ll = await q(local, "SELECT COUNT(*) n FROM words");
const fts = await q(remote, "SELECT COUNT(*) n FROM words_fts");
console.log(`\nverification: local words ${ll[0].n}  |  remote words ${rl[0].n}  |  remote FTS ${fts[0].n}`);
const slugCheck = await q(remote, "SELECT COUNT(*) n FROM words WHERE slug IN (SELECT slug FROM words) - (SELECT COUNT(DISTINCT slug) FROM words)");
console.log(`remote duplicate-slug check: ${slugCheck[0].n === 0 ? "clean" : "DUPES " + slugCheck[0].n}`);
console.log("done.");
