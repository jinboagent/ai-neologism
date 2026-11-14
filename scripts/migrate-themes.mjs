// Seed the themes table and backfill words.theme_id from the batch source files.
//
// Design (agreed 2026-11-14):
//  - Separate `themes` table + nullable `words.theme_id` FK. `categories_json` untouched.
//  - Canonical theme per SOURCE FILE, taken from the file's own H1 ("Theme NN: <label>"),
//    NOT the per-entry "Source theme:" string (which drifts within a file).
//  - batch-3 and batch-4 themes are kept DISTINCT even when wordings overlap.
//  - Only batch-3/4 words are themed. Pilot + batch-2 words (carewash, scrollgrief,
//    …) have no source theme and stay NULL.
//  - Non-English rows inherit the theme of the English word in the same concept, if any.
//  - label_de/es/fr seeded NULL; the German pass fills them on another day.
//
// Idempotent: re-running re-seeds by slug and re-derives theme_id from source.
// Usage: node scripts/migrate-themes.mjs [--dry]
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(new URL("../package.json", import.meta.url));
const { createClient } = require("@libsql/client");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WTR = path.join(ROOT, "wordstoreview");
const dry = process.argv.includes("--dry");
const db = createClient({ url: "file:" + path.join(ROOT, "data", "ai-neologism.db").replace(/\\/g, "/") });

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// 1. Discover every themed source file and its canonical label from the H1.
const themedFiles = fs
  .readdirSync(WTR)
  .filter((f) => /^batch-[34]-\d\d-.*-100\.md$/.test(f))
  .sort();
const themes = new Map(); // slug -> { slug, label, batch, words: Set<string> }
const fileToTheme = new Map(); // file -> slug

for (const f of themedFiles) {
  const txt = fs.readFileSync(path.join(WTR, f), "utf8");
  const h1 = txt.split("\n", 1)[0].match(/Theme\s*\d+:\s*(.+?)\s*\(100/);
  if (!h1) {
    console.error(`SKIP ${f}: no canonical theme in H1`);
    continue;
  }
  const label = h1[1].trim();
  const slug = slugify(label);
  if (!themes.has(slug)) themes.set(slug, { slug, label, batch: f.slice(0, 8), words: new Set() });
  fileToTheme.set(f, slug);
  for (const chunk of txt.split(/^### /m).slice(1)) {
    const head = chunk.match(/^(\d+)\.\s+(.+)/);
    if (head) themes.get(slug).words.add(head[2].trim().toLowerCase());
  }
}

// word -> theme slug (batch-3/4 only)
const wordToTheme = new Map();
for (const [slug, t] of themes) for (const w of t.words) if (!wordToTheme.has(w)) wordToTheme.set(w, slug);

// 2. Ensure tables/columns exist (mirrors ensureSchema so this runs standalone).
await db.execute(`CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  label_en TEXT NOT NULL,
  label_de TEXT,
  label_es TEXT,
  label_fr TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
const info = await db.execute("PRAGMA table_info(words)");
if (!info.rows.some((r) => String(r.name) === "theme_id")) {
  await db.execute("ALTER TABLE words ADD COLUMN theme_id INTEGER REFERENCES themes(id)");
}
await db.execute("CREATE INDEX IF NOT EXISTS idx_words_theme ON words(theme_id)");

// 3. Seed / update themes by slug.
let themeInserted = 0, themeUpdated = 0;
for (const t of [...themes.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
  const existing = await db.execute("SELECT id FROM themes WHERE slug = ?", [t.slug]);
  if (existing.rows.length) {
    themeUpdated++;
    if (!dry) await db.execute("UPDATE themes SET label_en = ? WHERE slug = ?", [t.label, t.slug]);
  } else {
    themeInserted++;
    if (!dry)
      await db.execute("INSERT INTO themes (slug, label_en) VALUES (?, ?)", [t.slug, t.label]);
  }
}

const slugToId = new Map();
for (const r of (await db.execute("SELECT id, slug FROM themes")).rows) slugToId.set(String(r.slug), Number(r.id));

// 4. Backfill words.theme_id by word text.
const rows = await db.execute("SELECT id, word, slug, language, concept_id, theme_id FROM words");
const byId = new Map();
for (const r of rows.rows) byId.set(Number(r.id), r);

let themed = 0, inherit = 0, nullLeft = 0;
const updates = []; // { id, themeId }

// First pass: direct word→theme match (any language).
for (const r of rows.rows) {
  const w = String(r.word).toLowerCase();
  const slug = wordToTheme.get(w);
  if (slug && slugToId.has(slug)) {
    updates.push({ id: Number(r.id), themeId: slugToId.get(slug) });
    themed++;
  }
}

// Second pass: non-English rows with no direct match inherit the English sibling's theme.
const enThemeByConcept = new Map();
for (const u of updates) {
  const r = byId.get(u.id);
  if (r && r.language === "en" && r.concept_id != null) enThemeByConcept.set(Number(r.concept_id), u.themeId);
}
const directIds = new Set(updates.map((u) => u.id));
for (const r of rows.rows) {
  const id = Number(r.id);
  if (directIds.has(id)) continue;
  if (r.concept_id != null && enThemeByConcept.has(Number(r.concept_id))) {
    updates.push({ id, themeId: enThemeByConcept.get(Number(r.concept_id)) });
    inherit++;
  } else {
    nullLeft++;
  }
}

if (!dry) {
  for (let i = 0; i < updates.length; i += 100) {
    const stmts = updates.slice(i, i + 100).map((u) => ({
      sql: "UPDATE words SET theme_id = ?, updated_at = updated_at WHERE id = ?",
      args: [u.themeId, u.id],
    }));
    await db.batch(stmts, "write");
  }
}

// 5. Report.
console.log(`mode: ${dry ? "DRY RUN" : "APPLY"}`);
console.log(`themed source files: ${fileToTheme.size}`);
console.log(`themes: inserted ${themeInserted}, updated ${themeUpdated}, total ${themes.size}`);
console.log(`words: direct-matched ${themed}, inherited ${inherit}, left NULL ${nullLeft}, rows ${rows.rows.length}`);

if (!dry) {
  const dist = await db.execute(
    `SELECT t.label_en, COUNT(w.id) AS n FROM themes t LEFT JOIN words w ON w.theme_id = t.id
     GROUP BY t.id ORDER BY n DESC`
  );
  console.log("\n--- theme distribution (all statuses) ---");
  for (const r of dist.rows) console.log(`  ${String(r.label_en).padEnd(34)} ${r.n}`);
  const noTheme = await db.execute("SELECT COUNT(*) AS n FROM words WHERE theme_id IS NULL");
  console.log(`\nwords still without a theme: ${noTheme.rows[0].n}`);
}

await db.close();
