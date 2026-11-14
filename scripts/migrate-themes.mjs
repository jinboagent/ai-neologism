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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WTR = path.join(ROOT, "wordstoreview");
const dry = process.argv.includes("--dry");
const db = createClient({ url: "file:" + path.join(ROOT, "data", "ai-neologism.db").replace(/\\/g, "/") });

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// Localized theme labels (2026-11-14): the four-language site shows themes, so
// every theme carries de/es/fr label translations alongside the English one.
const LOCAL_LABELS = {
  "Politics, Power & Governance": { de: "Politik, Macht & Herrschaft", es: "Política, poder y gobernanza", fr: "Politique, pouvoir & gouvernance" },
  "Geopolitics, Nations & Decline": { de: "Geopolitik, Nationen & Niedergang", es: "Geopolítica, naciones y declive", fr: "Géopolitique, nations & déclin" },
  "Technology & AI Life": { de: "Technologie & KI-Leben", es: "Tecnología y vida con la IA", fr: "Technologie & vie avec l'IA" },
  "Work, Careers & Office Life": { de: "Arbeit, Karriere & Büroalltag", es: "Trabajo, carreras y vida de oficina", fr: "Travail, carrières & vie de bureau" },
  "Money, Markets & Consumption": { de: "Geld, Märkte & Konsum", es: "Dinero, mercados y consumo", fr: "Argent, marchés & consommation" },
  "Health, Medicine & the Body": { de: "Gesundheit, Medizin & Körper", es: "Salud, medicina y cuerpo", fr: "Santé, médecine & corps" },
  "Sports, Fitness & Play": { de: "Sport, Fitness & Spiel", es: "Deporte, fitness y juego", fr: "Sport, fitness & jeu" },
  "Hobbies, Home & Domestic Life": { de: "Hobbys, Zuhause & Haushalt", es: "Aficiones, hogar y vida doméstica", fr: "Loisirs, maison & vie domestique" },
  "Relationships & Social Life": { de: "Beziehungen & Sozialleben", es: "Relaciones y vida social", fr: "Relations & vie sociale" },
  "Media, Language & Belief": { de: "Medien, Sprache & Glaube", es: "Medios, lengua y creencia", fr: "Médias, langue & croyance" },
  "Family & kinship": { de: "Familie & Verwandtschaft", es: "Familia y parentesco", fr: "Famille & parenté" },
  "Friendship & social circles": { de: "Freundschaft & Freundeskreise", es: "Amistad y círculos sociales", fr: "Amitié & cercles sociaux" },
  "Work & career life": { de: "Arbeit & Karriereleben", es: "Trabajo y vida profesional", fr: "Travail & vie de carrière" },
  "Home chores & domestic tech": { de: "Hausarbeit & Haustechnik", es: "Tareas del hogar y tecnología doméstica", fr: "Tâches ménagères & tech domestique" },
  "Food, cooking & meals": { de: "Essen, Kochen & Mahlzeiten", es: "Comida, cocina y comidas", fr: "Nourriture, cuisine & repas" },
  "Leisure, hobbies & play": { de: "Freizeit, Hobbys & Spiel", es: "Ocio, aficiones y juego", fr: "Loisirs, passe-temps & jeu" },
  "Parenting & children": { de: "Erziehung & Kinder", es: "Crianza y niños", fr: "Parentalité & enfants" },
  "Neighbors & community": { de: "Nachbarn & Nachbarschaft", es: "Vecinos y comunidad", fr: "Voisins & communauté" },
  "Routines, habits & self-management": { de: "Routinen, Gewohnheiten & Selbstmanagement", es: "Rutinas, hábitos y autogestión", fr: "Routines, habitudes & gestion de soi" },
  "Celebrations, travel & gatherings": { de: "Feste, Reisen & Zusammenkünfte", es: "Celebraciones, viajes y reuniones", fr: "Fêtes, voyages & rassemblements" },
  "Dreams, sleep & the night": { de: "Träume, Schlaf & die Nacht", es: "Sueños, el dormir y la noche", fr: "Rêves, sommeil & la nuit" },
};

// 1. Discover every themed source file and its canonical label from the H1.
const themedFiles = fs
  .readdirSync(WTR)
  .filter((f) => /^batch-[345]-\d\d-.*-100\.md$/.test(f))
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

// 3. Seed / update themes by slug (labels in all four languages).
let themeInserted = 0, themeUpdated = 0;
for (const t of [...themes.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
  const loc = LOCAL_LABELS[t.label] ?? {};
  const existing = await db.execute("SELECT id FROM themes WHERE slug = ?", [t.slug]);
  if (existing.rows.length) {
    themeUpdated++;
    if (!dry)
      await db.execute(
        "UPDATE themes SET label_en = ?, label_de = ?, label_es = ?, label_fr = ? WHERE slug = ?",
        [t.label, loc.de ?? null, loc.es ?? null, loc.fr ?? null, t.slug]
      );
  } else {
    themeInserted++;
    if (!dry)
      await db.execute(
        "INSERT INTO themes (slug, label_en, label_de, label_es, label_fr) VALUES (?, ?, ?, ?, ?)",
        [t.slug, t.label, loc.de ?? null, loc.es ?? null, loc.fr ?? null]
      );
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
