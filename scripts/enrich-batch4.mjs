// One-shot batch-4 translation ENRICHER.
//
// The parallel import (2026-11-14 14:53) published the batch-4 families in all
// four languages, but the non-English rows carry only the short gloss: their
// explanation, why_this_word, pronunciation, grammar_json and related_words are
// empty. The full-entry files (wordstoreview/batch-4-0N-full-{es,fr,de}.md)
// hold the complete entries — this script updates the existing rows in place.
//
// Matching is by CONCEPT FAMILY, not slug: rows join through
// words.concept_id of the English headword, which survives slug collisions
// (-2 suffixes) and renamed headwords. Rows that do not belong to any batch-4
// family (e.g. batch-5 sleep coinages, imported separately) are reported and
// skipped.
//
// why_this_word is the field that powers the multilingual morpheme games
// (fusion / flower order / reverse riddle), which currently only light up for
// English. After this run they light up wherever a coinage's morphemes
// concatenate back to the word.
//
// Usage:
//   node scripts/enrich-batch4.mjs --dry-run   (default: report only)
//   node scripts/enrich-batch4.mjs --target local --commit
//   node scripts/enrich-batch4.mjs --target turso --commit
//
// Idempotent: only updates rows whose enrichment differs; safe to re-run.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const target = args.includes("--target") ? args[args.indexOf("--target") + 1] : "local";
const commit = args.includes("--commit");
const THEMES = ["01","02","03","04","05","06","07","08","09","10"];
const LANGS = ["es", "fr", "de"];

function readDotEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
let db;
if (target === "turso") {
  const env = { ...readDotEnv(path.join(root, ".env.turso")), ...process.env };
  if (!env.TURSO_DATABASE_URL) {
    console.error("No TURSO_DATABASE_URL found (put it in .env.turso or the environment).");
    process.exit(1);
  }
  db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
} else {
  db = createClient({ url: `file:${path.join(root, "data", "ai-neologism.db").replace(/\\/g, "/")}` });
}

const WV = path.join(root, "wordstoreview");

function field(body, name) {
  const m = body.match(new RegExp(`- \\*\\*${name}:\\*\\* (.+)`));
  return m ? m[1].trim() : "";
}

function parseFullEntries(file) {
  const s = fs.readFileSync(file, "utf8");
  const out = new Map(); // englishBase -> entry
  for (const m of s.matchAll(/^### (\d+)\. (.+)\n((?:- \*\*.*\n)+)/gm)) {
    const body = m[3];
    const base = body.match(/\*\*English base:\*\* (\S+)/);
    if (!base) continue;
    const gender = field(body, "Gender").replace(/\s*·\s*$/, "").trim();
    const plural = field(body, "Plural").trim();
    out.set(base[1], {
      word: m[2].trim(),
      pos: field(body, "Part of speech") || "noun",
      definition: field(body, "Definition"),
      explanation: field(body, "Explanation"),
      why: field(body, "Why this word").replace(/\*/g, ""),
      ipa: field(body, "Pronunciation") || null,
      grammar: gender ? { gender, ...(plural ? { plural } : {}) } : (plural ? { plural } : {}),
    });
  }
  return out;
}

function slugify(word, locale) {
  let s = word;
  if (locale === "de") {
    s = s.replace(/ä/g, "ae").replace(/Ä/g, "Ae").replace(/ö/g, "oe").replace(/Ö/g, "Oe")
      .replace(/ü/g, "ue").replace(/Ü/g, "Ue").replace(/ß/g, "ss");
  } else if (locale === "es" || locale === "fr") {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  return s.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ---------- load full entries + EN related-word map ----------

const entries = new Map(); // `${enWord}|${lang}` -> entry
const enRelated = new Map(); // enWord -> [related en words]
for (const nn of THEMES) {
  for (const lang of LANGS) {
    const full = parseFullEntries(path.join(WV, `batch-4-${nn}-full-${lang}.md`));
    for (const [base, e] of full) entries.set(`${base}|${lang}`, e);
  }
  const enFile = fs.readFileSync(path.join(WV, `batch-4-${nn}-daily-100.md`), "utf8");
  for (const m of enFile.matchAll(/^### (\d+)\. (\S+)\n(?:- \*\*.*\n)*?- \*\*Related words:\*\* (.+)/gm)) {
    enRelated.set(m[2], m[3].split(",").map((x) => x.trim()).filter(Boolean));
  }
}

// ---------- DB state ----------

const enRows = await db.execute("SELECT slug, concept_id FROM words WHERE language='en' AND status='published'");
const enConcept = new Map(); // en slug -> concept_id
for (const r of enRows.rows) if (r.concept_id != null) enConcept.set(r.slug, r.concept_id);

const langRows = await db.execute(
  "SELECT slug, language, concept_id, explanation, why_this_word, pronunciation, grammar_json, related_words FROM words WHERE status='published' AND language IN ('es','fr','de')"
);
// concept_id|language -> rows (usually one; more when headwords were renamed)
const byConceptLang = new Map();
for (const r of langRows.rows) {
  if (r.concept_id == null) continue;
  const k = `${r.concept_id}|${r.language}`;
  if (!byConceptLang.has(k)) byConceptLang.set(k, []);
  byConceptLang.get(k).push(r);
}

// concept_id of each EN related word, for related_words mapping
function langSlugForEnWord(enWord, lang) {
  const cid = enConcept.get(enWord);
  if (cid == null) return null;
  const rows = byConceptLang.get(`${cid}|${lang}`);
  return rows && rows.length === 1 ? rows[0].slug : null;
}

// ---------- match & plan updates / inserts ----------

// EN categories per slug, inherited by inserted translation rows.
const enCats = new Map();
{
  const res = await db.execute("SELECT slug, categories_json FROM words WHERE language='en' AND status='published'");
  for (const r of res.rows) enCats.set(r.slug, JSON.parse(String(r.categories_json || "[]")));
}

let matched = 0;
let alreadyDone = 0;
const updates = [];
const inserts = [];
const unmatched = [];
const ambiguous = [];

for (const [key, e] of entries) {
  const [enWord, lang] = key.split("|");
  const enSlug = slugify(enWord, "en");
  const cid = enConcept.get(enSlug);
  if (cid == null) {
    unmatched.push(`${lang}/${enWord} (EN headword not published)`);
    continue;
  }
  const rows = byConceptLang.get(`${cid}|${lang}`);
  if (rows && rows.length > 1) {
    ambiguous.push(`${lang}/${enWord}: ${rows.map((r) => r.slug).join(", ")}`);
    continue;
  }
  const related = JSON.stringify(
    (enRelated.get(enWord) ?? [])
      .map((r) => langSlugForEnWord(r, lang))
      .filter(Boolean)
  );

  if (!rows || rows.length === 0) {
    // The family lacks this language's row entirely (89 DE rows were never
    // imported by the parallel pass) — plan a full insert into the family.
    inserts.push({
      slug: slugify(e.word, lang),
      word: e.word,
      language: lang,
      conceptId: cid,
      e,
      grammar: JSON.stringify(e.grammar ?? {}),
      related,
      categories: enCats.get(enSlug) ?? [],
    });
    continue;
  }
  const row = rows[0];
  matched++;
  const grammar = JSON.stringify(e.grammar ?? {});
  const unchanged =
    String(row.explanation ?? "") === e.explanation &&
    String(row.why_this_word ?? "") === e.why &&
    (row.pronunciation ?? null) === e.ipa &&
    String(row.grammar_json ?? "{}") === grammar &&
    String(row.related_words ?? "[]") === related;
  if (unchanged) {
    alreadyDone++;
    continue;
  }
  updates.push({ slug: row.slug, language: row.language, e, grammar, related });
}

console.log(`Full entries loaded: ${entries.size}`);
console.log(`Matched via concept family: ${matched} | already enriched: ${alreadyDone} | to update: ${updates.length}`);
console.log(`Missing rows to INSERT: ${inserts.length} (de ${inserts.filter((i) => i.language === "de").length} / es ${inserts.filter((i) => i.language === "es").length} / fr ${inserts.filter((i) => i.language === "fr").length})`);
console.log(`Unmatched entries: ${unmatched.length}${unmatched.length ? " — " + unmatched.slice(0, 8).join(" | ") : ""}`);
console.log(`Ambiguous families (multiple ${LANGS.join("/")} rows): ${ambiguous.length}${ambiguous.length ? " — " + ambiguous.slice(0, 5).join(" | ") : ""}`);

if (!commit) {
  console.log("DRY RUN — no writes. Re-run with --commit to apply.");
  process.exit(0);
}

for (const u of updates) {
  await db.execute(
    `UPDATE words SET explanation = ?, why_this_word = ?, pronunciation = ?, grammar_json = ?, related_words = ?, updated_at = datetime('now')
     WHERE slug = ? AND language = ? AND status = 'published'`,
    [u.e.explanation, u.e.why, u.e.ipa, u.grammar, u.related, u.slug, u.language]
  );
}

for (const i of inserts) {
  await db.execute(
    `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
       alternatives_json, verification_json, references_json, related_words, categories_json, ai_assisted,
       status, badge, input_type, use_votes, work_votes, published_at, language, concept_id, grammar_json,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'published', 'new', 'batch', 0, 0, datetime('now'), ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      i.slug, i.word, i.e.ipa, i.e.pos, i.e.definition, i.e.explanation, i.e.why,
      JSON.stringify({
        verdict: "NEW",
        checked_at: today(),
        method: "batch-4 meaning-based translation (German pass completion)",
        note: "Inserted by enrich-batch4.mjs — the family's row was missing from the parallel import.",
      }),
      i.related,
      JSON.stringify(i.categories),
      i.language,
      i.conceptId,
      i.grammar,
    ]
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

console.log(`\nCOMMITTED: ${updates.length} rows enriched, ${inserts.length} rows inserted.`);

const check = await db.execute(
  "SELECT language, COUNT(*) n FROM words WHERE status='published' AND language IN ('es','fr','de') AND why_this_word != '' GROUP BY language ORDER BY language"
);
console.log("Published es/fr/de rows with why_this_word filled:");
for (const r of check.rows) console.log(`  ${r.language}: ${r.n}`);
