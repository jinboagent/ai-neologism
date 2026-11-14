// One-way metadata sync local → Turso for the fields the insert-only words sync
// (local/sync-to-turso.mjs) does not cover because it only ever INSERTs new rows:
//   1. the themes table (created if absent, rows pushed by slug, labels in 4 languages)
//   2. words.theme_id (matched by slug; the column is added if the remote lacks it)
//   3. funny_level/novelty_level backfill for remote rows where they are NULL
//
// Deliberately conservative: UPDATEs touch ONLY theme_id / funny_level /
// novelty_level, matched by slug, never status / votes / review state — the
// "site is authoritative" rule for editorial data is untouched.
//
// Idempotent: re-running is a no-op.
// Usage: node scripts/sync-themes-ratings-turso.mjs [--dry]
import { createRequire } from "module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { createClient } = require("@libsql/client");
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
    // 1. themes table + rows
    await remote.execute(`CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      label_en TEXT NOT NULL,
      label_de TEXT, label_es TEXT, label_fr TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    const localThemes = (await local.execute("SELECT slug, label_en, label_de, label_es, label_fr FROM themes ORDER BY id")).rows;
    const remoteThemeSlugs = new Set((await remote.execute("SELECT slug FROM themes")).rows.map((r) => String(r.slug)));
    const newThemes = localThemes.filter((t) => !remoteThemeSlugs.has(String(t.slug)));
    console.log(`themes: local ${localThemes.length}, remote ${remoteThemeSlugs.size}, to push ${newThemes.length}`);
    if (!DRY && newThemes.length) {
      await remote.batch(newThemes.map((t) => ({
        sql: "INSERT INTO themes (slug, label_en, label_de, label_es, label_fr) VALUES (?, ?, ?, ?, ?)",
        args: [String(t.slug), String(t.label_en), t.label_de ?? null, t.label_es ?? null, t.label_fr ?? null],
      })), "write");
    }

    // remote themes slug -> id (ids may differ from local; slug is the join key)
    const remoteThemeId = new Map(
      (await remote.execute("SELECT id, slug FROM themes")).rows.map((r) => [String(r.slug), Number(r.id)])
    );

    // 2. words.theme_id column + per-slug update
    const remoteCols = (await remote.execute("PRAGMA table_info(words)")).rows.map((r) => String(r.name));
    let hasThemeCol = remoteCols.includes("theme_id");
    if (!hasThemeCol) {
      console.log("remote words.theme_id missing — adding column");
      if (!DRY) await remote.execute("ALTER TABLE words ADD COLUMN theme_id INTEGER REFERENCES themes(id)");
      hasThemeCol = true; // apply mode created it; dry mode skips the queries below
    }
    const localWords = (await local.execute("SELECT slug, theme_id FROM words WHERE theme_id IS NOT NULL")).rows;
    const localThemeIdBySlug = new Map(localWords.map((r) => [String(r.slug), Number(r.theme_id)]));
    // map local theme ids → remote theme ids via slug
    const localThemeSlug = new Map(
      (await local.execute("SELECT id, slug FROM themes")).rows.map((r) => [Number(r.id), String(r.slug)])
    );
    const remoteSlugs = new Set((await remote.execute("SELECT slug FROM words")).rows.map((r) => String(r.slug)));
    const themeUpdates = [];
    for (const [slug, localTid] of localThemeIdBySlug) {
      if (!remoteSlugs.has(slug)) continue;
      const rslug = localThemeSlug.get(localTid);
      const rtid = rslug ? remoteThemeId.get(rslug) : undefined;
      if (rtid != null) themeUpdates.push({ slug, themeId: rtid });
    }
    // only rows that actually differ
    let themeDiffs = [];
    if (DRY && !remoteCols.includes("theme_id")) {
      console.log(`theme_id updates: skipped in dry run (column will be created on apply); ${themeUpdates.length} rows would be set`);
    } else {
      const remoteThemeBySlug = new Map(
        (await remote.execute("SELECT slug, theme_id FROM words WHERE theme_id IS NOT NULL")).rows
          .map((r) => [String(r.slug), Number(r.theme_id)])
      );
      themeDiffs = themeUpdates.filter((u) => remoteThemeBySlug.get(u.slug) !== u.themeId);
      console.log(`theme_id updates: ${themeDiffs.length} of ${themeUpdates.length} themed local rows are online`);
    }
    if (!DRY && themeDiffs.length) {
      for (let i = 0; i < themeDiffs.length; i += 100) {
        await remote.batch(themeDiffs.slice(i, i + 100).map((u) => ({
          sql: "UPDATE words SET theme_id = ? WHERE slug = ?", args: [u.themeId, u.slug],
        })), "write");
      }
    }

    // 3. funny/novelty backfill for remote NULLs
    const localRatings = new Map(
      (await local.execute("SELECT slug, funny_level, novelty_level FROM words WHERE funny_level IS NOT NULL AND novelty_level IS NOT NULL")).rows
        .map((r) => [String(r.slug), [Number(r.funny_level), Number(r.novelty_level)]])
    );
    const remoteNullRatings = (await remote.execute(
      "SELECT slug FROM words WHERE (funny_level IS NULL OR novelty_level IS NULL) AND status IN ('published','in_review','declined')"
    )).rows.map((r) => String(r.slug));
    const ratingUpdates = remoteNullRatings.filter((s) => localRatings.has(s)).map((s) => ({
      slug: s, f: localRatings.get(s)[0], v: localRatings.get(s)[1],
    }));
    console.log(`funny/novelty backfills: ${ratingUpdates.length} of ${remoteNullRatings.length} remote NULL rows`);
    if (!DRY && ratingUpdates.length) {
      for (let i = 0; i < ratingUpdates.length; i += 100) {
        await remote.batch(ratingUpdates.slice(i, i + 100).map((u) => ({
          sql: "UPDATE words SET funny_level = ?, novelty_level = ? WHERE slug = ?", args: [u.f, u.v, u.slug],
        })), "write");
      }
    }

    if (DRY) console.log("\nDry run — nothing written.");
    else {
      const done = await remote.execute(
        "SELECT (SELECT COUNT(*) FROM themes) t, (SELECT COUNT(*) FROM words WHERE theme_id IS NOT NULL) themed, (SELECT COUNT(*) FROM words WHERE funny_level IS NULL OR novelty_level IS NULL) nullratings"
      );
      console.log("\nremote now: themes=", done.rows[0].t, " themed words=", done.rows[0].themed, " rows with NULL ratings=", done.rows[0].nullratings);
    }
  } finally {
    try { local.close(); remote.close(); } catch { /* best effort */ }
  }
}

await main();
