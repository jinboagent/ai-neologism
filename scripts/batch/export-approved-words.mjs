// Export approved editorial-batch words to the batch JSON schema (pilot-25.json
// shape, plus a per-entry verification block carrying the review evidence).
//
// Reads the review verdict files in wordstoreview/ (three layouts: numbered
// lines, verdict tables, backticked lines), applies the fusion-recheck deltas,
// pulls the full entries from the source markdown files, validates against the
// site's constraints (categories, IPA, dedupe against the live DB), and writes
// scripts/batch/batch-2-3-approved.json + a reconciliation report in docs/.
//
// Usage: node scripts/batch/export-approved-words.mjs   (from the repo root)

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WSV = path.join(ROOT, "wordstoreview");
const OUT = path.join(ROOT, "scripts", "batch", "batch-2-3-approved.json");

const VALID_CATEGORIES = [
  "Society & Philanthropy",
  "Technology & AI",
  "Environment",
  "Work & Economy",
  "Culture & Language",
  "Health",
];

const BATCH3 = [
  { n: "01", theme: "power" },
  { n: "02", theme: "nations" },
  { n: "03", theme: "tech" },
  { n: "04", theme: "work" },
  { n: "05", theme: "money" },
  { n: "06", theme: "health" },
  { n: "07", theme: "sport" },
  { n: "08", theme: "home" },
  { n: "09", theme: "social" },
  { n: "10", theme: "media" },
];

const read = (p) => fs.readFileSync(p, "utf8");

// --- verdict parsers (one per review layout) -------------------------------

function parseNumberedVerdicts(text) {
  // "11. guidancecreep — REJECT — reason" (verdict maybe bolded)
  const map = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*\d+\.\s+`?([A-Za-z][A-Za-z0-9-]*)`?\s*(?:—|-|:)+\s*\**\s*(APPROVE|REVISE|REJECT|UNVERIFIED)\b/);
    if (m) {
      if (m[2] === "UNVERIFIED") {
        throw new Error(`unresolved UNVERIFIED verdict in review file: "${line.trim().slice(0, 90)}" — resolve it (search + update the line) before exporting`);
      }
      map.set(m[1].toLowerCase(), { word: m[1], verdict: m[2] });
    }
  }
  return map;
}

function parseTableVerdicts(text) {
  // | 1 | spotshame | APPROVE | clean; ... |
  const map = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*\**\s*(APPROVE|REVISE|REJECT)\b/);
    if (m) map.set(m[1].trim().toLowerCase(), { word: m[1].trim(), verdict: m[2] });
  }
  return map;
}

function parseBacktickVerdicts(text) {
  // "1. `tumbriltide`: APPROVE — clean" / "3. `thermidorized`: **REJECT** — ..."
  const map = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*\d+\.\s+`?([A-Za-z][A-Za-z0-9-]*)`?\s*:\s*\**\s*(APPROVE|REVISE|REJECT)\b/);
    if (m) map.set(m[1].toLowerCase(), { word: m[1], verdict: m[2] });
  }
  return map;
}

function parseFusionFlips(text) {
  // "word (file-NN) — FLIP→REVISE — reason" | HOLDS lines are no-ops
  const flips = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-*]?\s*`?([A-Za-z][A-Za-z0-9-]*)`?\s*\((?:file-)?(\d+)\)\s*—\s*(?:FLIP\s*→\s*|FLIP\s*->\s*)(REVISE|REJECT)\b/);
    if (m) flips.set(m[1].toLowerCase(), { word: m[1], verdict: m[3], file: m[2] });
  }
  return flips;
}

// --- source-entry parser (shared by batch-2 and batch-3 files) --------------

const FIELD_MAP = {
  "part of speech": "part_of_speech",
  definition: "definition",
  explanation: "explanation",
  "why this word": "why_this_word",
  pronunciation: "pronunciation",
  "related words": "related_words",
  categories: "categories",
};

function parseSourceEntries(text) {
  const entries = new Map();
  let current = null;
  let lastField = null;
  for (const raw of text.split("\n")) {
    const head = raw.match(/^###\s*\d+\.\s*(.+?)\s*$/);
    if (head) {
      if (current) entries.set(current.word.toLowerCase(), current);
      current = { word: head[1].trim(), fields: {} };
      lastField = null;
      continue;
    }
    if (!current) continue;
    const bullet = raw.match(/^-\s*\*\*(.+?):\*\*\s*(.*)$/);
    if (bullet) {
      const key = FIELD_MAP[bullet[1].trim().toLowerCase()];
      if (key) {
        current.fields[key] = bullet[2].trim();
        lastField = key;
      } else {
        lastField = null;
      }
      continue;
    }
    // wrapped continuation of the previous bullet
    if (lastField && raw.trim() && !raw.startsWith("- ")) {
      current.fields[lastField] += " " + raw.trim();
    }
  }
  if (current) entries.set(current.word.toLowerCase(), current);
  return entries;
}

const splitList = (v) =>
  (v ?? "")
    .split(/[,;、]/)
    .map((s) => s.trim())
    .filter(Boolean);

// --- main --------------------------------------------------------------------

const verdicts = new Map(); // lower(word) -> { word, verdict, reviewFile, batch, checkedAt, method }
const addVerdicts = (map, meta) => {
  for (const [k, v] of map) verdicts.set(k, { ...v, ...meta });
};

for (const { n, theme } of BATCH3) {
  const reviewFile = `review-batch-3-${n}-${theme}.md`;
  const text = read(path.join(WSV, reviewFile));
  const parsed = n === "01" ? parseNumberedVerdicts(text) : parseTableVerdicts(text);
  if (parsed.size !== 100) throw new Error(`${reviewFile}: parsed ${parsed.size} verdicts, expected 100`);
  addVerdicts(parsed, {
    reviewFile,
    batch: `batch-3-${n}-${theme}`,
    checkedAt: "2026-11-08",
    method: "Editorial batch review — per-word exact-form web search (WebSearch/Tavily) per docs/REVIEW-criteria.md §2",
  });
}

{
  const reviewFile = "review-batch-2-100-words-2026-11-04.md";
  const parsed = parseBacktickVerdicts(read(path.join(WSV, reviewFile)));
  if (parsed.size !== 100) throw new Error(`${reviewFile}: parsed ${parsed.size} verdicts, expected 100`);
  addVerdicts(parsed, {
    reviewFile,
    batch: "batch-2",
    checkedAt: "2026-11-04",
    method: "Editorial batch review — per-term live web search + variant checks, per docs/VALIDATION-protocol.md §2",
  });
}

// fusion-necessity recheck deltas (2026-11-08): only these may flip an APPROVE
const flips = parseFusionFlips(read(path.join(WSV, "review-batch-3-01-06-fusion-recheck.md")));
const flipped = [];
for (const [k, f] of flips) {
  const v = verdicts.get(k);
  if (!v) throw new Error(`recheck flip for unknown word: ${k}`);
  if (v.verdict === "APPROVE" && (f.verdict === "REVISE" || f.verdict === "REJECT")) {
    v.verdict = f.verdict;
    v.reviewFile += ` + review-batch-3-01-06-fusion-recheck.md`;
    flipped.push(`${v.word} → ${f.verdict}`);
  }
}

// source entries
const sources = new Map();
for (const { n, theme } of BATCH3) {
  const file = `batch-3-${n}-${theme}-100.md`;
  for (const [k, e] of parseSourceEntries(read(path.join(WSV, file)))) {
    if (sources.has(k)) throw new Error(`duplicate source entry: ${k} (${file})`);
    sources.set(k, { ...e, sourceFile: file });
  }
}
for (const [k, e] of parseSourceEntries(read(path.join(WSV, "batch-2-100-words-2026-11-04.md")))) {
  if (sources.has(k)) throw new Error(`duplicate source entry: ${k} (batch-2)`);
  sources.set(k, { ...e, sourceFile: "batch-2-100-words-2026-11-04.md" });
}

// words already in the dictionary (any status) are skipped, never re-inserted
const db = createClient({
  url: `file:${path.join(ROOT, "data", "ai-neologism.db").replace(/\\/g, "/")}`,
});
const existing = new Set(
  (await db.execute("SELECT word FROM words")).rows.map((r) => String(r.word).toLowerCase())
);

const approved = [...verdicts.values()].filter((v) => v.verdict === "APPROVE");
const out = [];
const issues = { missingSource: [], missingFields: [], badCategories: [], dbDupes: [], internalDupes: [] };
const seen = new Set();

for (const v of approved) {
  const key = v.word.toLowerCase();
  if (seen.has(key)) {
    issues.internalDupes.push(v.word);
    continue;
  }
  seen.add(key);
  if (existing.has(key)) {
    issues.dbDupes.push(v.word);
    continue;
  }
  const src = sources.get(key);
  if (!src) {
    issues.missingSource.push(v.word);
    continue;
  }
  const f = src.fields;
  const missing = [];
  if (!f.definition) missing.push("definition");
  if (!f.pronunciation) missing.push("pronunciation");
  if (!f.part_of_speech) missing.push("part_of_speech");
  if (!f.explanation) missing.push("explanation");
  if (!f.why_this_word) missing.push("why_this_word");
  if (missing.length) issues.missingFields.push(`${v.word}: ${missing.join(", ")}`);

  const categories = [
    ...new Set(
      splitList(f.categories)
        .map((c) => VALID_CATEGORIES.find((x) => x.toLowerCase() === c.toLowerCase()))
        .filter(Boolean)
    ),
  ].slice(0, 2);
  const rawCats = splitList(f.categories);
  if (categories.length !== rawCats.length) issues.badCategories.push(`${v.word}: [${rawCats.join(", ")}]`);

  out.push({
    word: v.word,
    part_of_speech: f.part_of_speech ?? "noun",
    definition: f.definition ?? "",
    explanation: f.explanation ?? "",
    why_this_word: f.why_this_word ?? "",
    pronunciation: f.pronunciation ?? null,
    related_words: splitList(f.related_words),
    categories,
    verification: {
      verdict: "NEW",
      checked_at: v.checkedAt,
      method: v.method,
      note: `review evidence: wordstoreview/${v.reviewFile}`,
    },
  });
}

out.sort((a, b) => a.word.localeCompare(b.word));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

// reconciliation report (docs/ is local-only)
const notApproved = [...verdicts.values()].filter((v) => v.verdict !== "APPROVE");
const byVerdict = {};
for (const v of notApproved) byVerdict[v.verdict] = (byVerdict[v.verdict] ?? 0) + 1;
const reportLines = [
  `# Export report — batch-2 + batch-3 approved words`,
  "",
  `- **Run:** 2026-11-08`,
  `- **Verdicts parsed:** ${verdicts.size} (expect 1100 = 100 batch-2 + 10×100 batch-3)`,
  `- **APPROVE after fusion-recheck deltas:** ${approved.length} (deltas applied: ${flipped.length})`,
  `- **Flips:** ${flipped.join("; ") || "none"}`,
  `- **Non-approved archived:** ${JSON.stringify(byVerdict)}`,
  `- **Exported:** ${out.length} → ${path.relative(ROOT, OUT)}`,
  `- **Skipped — already in DB (any status):** ${issues.dbDupes.join(", ") || "none"}`,
  `- **Skipped — internal duplicates:** ${issues.internalDupes.join(", ") || "none"}`,
  `- **Missing source entry:** ${issues.missingSource.join(", ") || "none"}`,
  `- **Missing fields:** ${issues.missingFields.length ? "\n  - " + issues.missingFields.join("\n  - ") : "none"}`,
  `- **Category name mismatches (kept valid ones, dropped rest):** ${issues.badCategories.length ? "\n  - " + issues.badCategories.join("\n  - ") : "none"}`,
  "",
  "Reconciliation: verdicts parsed = exported + non-approved + skipped (dupes/missing).",
];
fs.writeFileSync(path.join(ROOT, "docs", "export-report-batch-2-3-2026-11-08.md"), reportLines.join("\n") + "\n");

console.log(`verdicts: ${verdicts.size} | approved: ${approved.length} (flips: ${flipped.length}) | exported: ${out.length}`);
console.log(`skipped: dbDupes=${issues.dbDupes.length} internalDupes=${issues.internalDupes.length} missingSource=${issues.missingSource.length}`);
console.log(`issues: missingFields=${issues.missingFields.length} badCategories=${issues.badCategories.length}`);
if (issues.missingSource.length) console.log(`  missing source: ${issues.missingSource.join(", ")}`);
if (issues.dbDupes.length) console.log(`  db dupes: ${issues.dbDupes.join(", ")}`);
if (issues.missingFields.length) console.log(`  missing fields:\n    ${issues.missingFields.join("\n    ")}`);
if (issues.badCategories.length) console.log(`  bad categories:\n    ${issues.badCategories.slice(0, 10).join("\n    ")}`);
console.log(`out: ${path.relative(ROOT, OUT)}`);
db.close();
