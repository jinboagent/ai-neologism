// Push concept rows that exist locally but not on Turso (insert-only, explicit ids).
// The words sync (local/sync-to-turso.mjs) copies words.language/concept_id verbatim,
// so the concept id spaces must line up — they do (both DBs were backfilled 1:1 from
// the same 771 pre-multilingual words, verified 2026-11-14).
//
// Usage: node scripts/batch/push-concepts-turso.mjs [--dry]
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");

function readTursoEnv() {
  const file = path.join(process.cwd(), ".env.turso");
  if (!fs.existsSync(file)) { console.error("No .env.turso found."); process.exit(1); }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const env = readTursoEnv();
  const local = createClient({ url: "file:" + path.join(process.cwd(), "data", "ai-neologism.db").replace(/\\/g, "/") });
  const remote = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  try {
    const localRows = (await local.execute("SELECT id, label, created_at FROM concepts ORDER BY id")).rows;
    const remoteIds = new Set(
      (await remote.execute("SELECT id FROM concepts")).rows.map((r) => Number(r.id))
    );
    const missing = localRows.filter((r) => !remoteIds.has(Number(r.id)));
    console.log(`local concepts: ${localRows.length}, remote: ${remoteIds.size}, missing on remote: ${missing.length}`);
    if (missing.length === 0) { console.log("Nothing to push."); return; }
    console.log(`  id range to push: ${missing[0].id} .. ${missing[missing.length - 1].id}`);
    if (DRY) { console.log("Dry run — nothing written."); return; }
    const stmts = missing.map((r) => ({
      sql: "INSERT INTO concepts (id, label, created_at) VALUES (?, ?, ?)",
      args: [Number(r.id), String(r.label), String(r.created_at)],
    }));
    const CHUNK = 100;
    for (let i = 0; i < stmts.length; i += CHUNK) {
      await remote.batch(stmts.slice(i, i + CHUNK), "write");
      console.log(`  pushed ${Math.min(i + CHUNK, stmts.length)}/${stmts.length}`);
    }
    console.log(`Pushed ${stmts.length} concept row(s) to Turso.`);
  } finally {
    try { local.close(); remote.close(); } catch { /* best effort */ }
  }
}

await main();
