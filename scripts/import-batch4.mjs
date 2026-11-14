// One-shot batch-4 importer: publishes the 724 approved English neologisms and
// their full Spanish/French/German entries (wordstoreview/batch-4-0N-full-*.md)
// as concept families — one concept per phenomenon, four languages per family.
//
// Per the owner's standing batch policy (2026-11-08, batch-2/3 precedent):
// locally reviewed batch words SKIP the admin queue and insert directly as
// status='published', with verification_json written from the review evidence.
//
// Per the owner's instruction (2026-11-14): the batch-4 extras — funny_level,
// novelty_level and the themes table — are NOT imported. Standard fields only.
//
// Usage:
//   node scripts/import-batch4.mjs --dry-run   (default: report only, no writes)
//   node scripts/import-batch4.mjs --target local --commit
//   node scripts/import-batch4.mjs --target turso --commit
//
// Idempotence: every insert checks for an existing slug first and skips it;
// re-running the script with --commit is safe.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const target = args.includes("--target") ? args[args.indexOf("--target") + 1] : "local";
const commit = args.includes("--commit");
const THEMES = args.includes("--themes") ? args[args.indexOf("--themes")].split(",") : ["01","02","03","04","05","06","07","08","09","10"];
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
  const file = path.join(root, "data", "ai-neologism.db");
  db = createClient({ url: `file:${file.replace(/\\/g, "/")}` });
}

const WV = path.join(root, "wordstoreview");
const today = new Date().toISOString().slice(0, 10);

// ---------- markdown parsing ----------

function field(body, name) {
  const m = body.match(new RegExp(`- \\*\\*${name}:\\*\\* (.+)`));
  return m ? m[1].trim() : "";
}

function parseEnEntries(file) {
  const s = fs.readFileSync(file, "utf8");
  const entries = new Map();
  for (const m of s.matchAll(/^### (\d+)\. (\S+)\n((?:- \*\*.*\n)+)/gm)) {
    entries.set(m[2], { n: Number(m[1]), word: m[2], body: m[3] });
  }
  return entries;
}

function parseVerdicts(file) {
  const s = fs.readFileSync(file, "utf8");
  const v = new Map();
  for (const m of s.matchAll(/^\|\s*(\d+)\s*\|\s*(\S+?)\s*\|\s*(APPROVE|REVISE|REJECT|CHECK)\s*\|/gm)) {
    v.set(m[2], m[3]);
  }
  return v;
}

function parseFullEntries(file) {
  // -> Map<englishBase, {word, pos, definition, explanation, why, ipa, gender, plural}>
  const s = fs.readFileSync(file, "utf8");
  const out = new Map();
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
      why: field(body, "Why this word"),
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

// ---------- load everything ----------

const report = { en: 0, es: 0, fr: 0, de: 0, skippedExisting: 0, missingTranslations: [], missingGloss: [] };
const families = []; // { conceptId?, en: {...}, translations: [{lang, ...}] }

for (const nn of THEMES) {
  const enEntries = parseEnEntries(path.join(WV, `batch-4-${nn}-daily-100.md`));
  const verdicts = parseVerdicts(path.join(WV, `review-batch-4-${nn}-claude.md`));
  const full = {};
  for (const lang of LANGS) {
    full[lang] = parseFullEntries(path.join(WV, `batch-4-${nn}-full-${lang}.md`));
  }

  for (const [word, entry] of enEntries) {
    if (verdicts.get(word) !== "APPROVE") continue;
    const translations = [];
    for (const lang of LANGS) {
      const t = full[lang].get(word);
      if (!t) {
        report.missingTranslations.push(`${nn}/${lang}/${word}`);
        continue;
      }
      translations.push({ lang, ...t, slug: slugify(t.word, lang) });
    }
    families.push({
      en: {
        word,
        n: entry.n,
        pos: field(entry.body, "Part of speech") || "noun",
        definition: field(entry.body, "Definition"),
        explanation: field(entry.body, "Explanation"),
        why: field(entry.body, "Why this word").replace(/\*/g, ""),
        ipa: field(entry.body, "Pronunciation") || null,
        related: field(entry.body, "Related words").split(",").map((x) => x.trim()).filter(Boolean),
        categories: field(entry.body, "Categories").split(",").map((x) => x.trim()).filter(Boolean),
        slug: slugify(word, "en"),
        reviewFile: `review-batch-4-${nn}-claude.md`,
      },
      translations,
    });
    report.en++;
    for (const t of translations) report[t.lang]++;
  }
}

console.log(`Loaded ${families.length} concept families (en ${report.en} / es ${report.es} / fr ${report.fr} / de ${report.de})`);
if (report.missingTranslations.length) {
  console.log(`MISSING TRANSLATIONS (${report.missingTranslations.length}):`, report.missingTranslations.slice(0, 10).join(", "));
}

// ---------- existing DB state ----------

const existing = new Map();
{
  const res = await db.execute("SELECT slug, language, concept_id FROM words");
  for (const r of res.rows) existing.set(`${r.slug}|${r.language}`, r.concept_id);
}
const conceptsByLabel = new Map();
{
  const res = await db.execute("SELECT id, label FROM concepts");
  for (const r of res.rows) conceptsByLabel.set(String(r.label), r.id);
}

// ---------- plan ----------

const plan = [];
for (const fam of families) {
  const enSlug = fam.en.slug;
  if (existing.has(`${enSlug}|en`)) {
    report.skippedExisting++;
    continue;
  }
  plan.push(fam);
}

console.log(`Plan: ${plan.length} new families to insert (${report.skippedExisting} already present, skipped).`);
if (!commit) {
  console.log("DRY RUN — no writes. Re-run with --commit to insert.");
  process.exit(0);
}

// ---------- insert ----------

async function insertWord({ slug, word, pos, definition, explanation, why, ipa, related, categories, language, conceptId, grammar }) {
  await db.execute(
    `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
       alternatives_json, verification_json, references_json, related_words, categories_json, ai_assisted,
       status, badge, input_type, use_votes, work_votes, published_at, language, concept_id, grammar_json,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'published', 'new', 'batch', 0, 0, datetime('now'), ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      slug, word, ipa, pos, definition, explanation, why,
      JSON.stringify({
        verdict: "NEW",
        checked_at: today,
        method: "batch-4 review pipeline (UD/Wiktionary sweep + live web layer) + meaning-based translation review",
        note: `Reviewed in wordstoreview/${language === "en" ? "review-batch-4-01..10-claude.md" : "batch-4-full files"}; batch import.`,
      }),
      JSON.stringify(related),
      JSON.stringify(categories),
      language,
      conceptId,
      JSON.stringify(grammar ?? {}),
    ]
  );
}

let insertedEn = 0;
let insertedT = 0;
let conceptsCreated = 0;

for (const fam of plan) {
  // Reuse the concept when the EN headword already has one (label = headword is
  // the phase-1 convention), otherwise create a fresh concept row.
  let conceptId = conceptsByLabel.get(fam.en.word) ?? null;
  if (!conceptId) {
    const res = await db.execute(
      "INSERT INTO concepts (label, label_en, created_at) VALUES (?, ?, datetime('now'))",
      [fam.en.word, fam.en.word]
    );
    conceptId = Number(res.lastInsertRowid);
    conceptsByLabel.set(fam.en.word, conceptId);
    conceptsCreated++;
  }

  // Map EN related_words to same-language survivors within this import.
  const relatedByLang = new Map([["en", fam.en.related]]);
  for (const lang of LANGS) {
    const enToLang = new Map();
    for (const other of families) {
      if (other === fam) continue;
      const t = other.translations.find((x) => x.lang === lang);
      if (t) enToLang.set(other.en.word, t.slug);
    }
    // own translation also resolves
    const own = fam.translations.find((x) => x.lang === lang);
    if (own) enToLang.set(fam.en.word, own.slug);
    relatedByLang.set(
      lang,
      (lang === "en" ? fam.en.related : fam.en.related).filter((r) => enToLang.has(r)).map((r) => enToLang.get(r))
    );
  }

  await insertWord({
    slug: fam.en.slug, word: fam.en.word, pos: fam.en.pos, definition: fam.en.definition,
    explanation: fam.en.explanation, why: fam.en.why, ipa: fam.en.ipa,
    related: relatedByLang.get("en"), categories: fam.en.categories,
    language: "en", conceptId, grammar: {},
  });
  insertedEn++;

  for (const t of fam.translations) {
    if (existing.has(`${t.slug}|${t.lang}`)) {
      report.skippedExisting++;
      continue;
    }
    await insertWord({
      slug: t.slug, word: t.word, pos: t.pos, definition: t.definition,
      explanation: t.explanation, why: t.why, ipa: t.ipa,
      related: relatedByLang.get(t.lang), categories: fam.en.categories,
      language: t.lang, conceptId, grammar: t.grammar,
    });
    insertedT++;
  }
}

console.log(`\nCOMMITTED: ${insertedEn} EN words, ${insertedT} translations, ${conceptsCreated} new concepts.`);
console.log(`Skipped as already existing: ${report.skippedExisting}`);

// ---------- post-insert verification ----------

const check = await db.execute(
  "SELECT language, COUNT(*) AS n FROM words WHERE status='published' GROUP BY language ORDER BY language"
);
console.log("\nPublished counts by language:");
for (const r of check.rows) console.log(`  ${r.language}: ${r.n}`);
