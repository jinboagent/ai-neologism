// Editorial batch coiner: reads a JSON file of candidate words and inserts
// them into the words table. Two modes:
//
//   default          — verify each word through the site's novelty-search
//                      pipeline (/api/coin/verify) and insert survivors into
//                      the review queue (status 'in_review'), per the protocol
//                      in docs/VALIDATION-protocol.md §6.
//   --publish        — direct-publish mode for words whose novelty search was
//                      already done by the editorial review (the JSON carries a
//                      per-entry `verification` block: verdict, checked_at,
//                      method, note — engines named and dated per the
//                      protocol's evidence rules). Inserts as status
//                      'published' with badge derived from the verdict and
//                      input_type 'batch'. No admin-queue detour: the batch
//                      review IS the review.
//
// Usage:
//   node scripts/batch-coin.mjs --file scripts/batch/pilot-25.json [--delay 3000] [--limit N] [--base URL]
//   node scripts/batch-coin.mjs --file scripts/batch/batch-2-3-approved.json --publish
//   node scripts/batch-coin.mjs --verify-existing
//
// Idempotent: words already present (any status) are skipped.
// EXISTS verdicts are NOT inserted (the gate) in default mode; --publish trusts
// the review's verdicts and skips the live verify call entirely.
//
// Related words are resolved in a second pass AFTER insertion, so cross-links
// inside one batch resolve too; they only ever point at published entries.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const FILE = getArg("file", "scripts/batch/pilot-25.json");
const DELAY = Number(getArg("delay", 3000));
const LIMIT = Number(getArg("limit", Infinity));
const BASE = getArg("base", "http://localhost:3000");
const PUBLISH = hasFlag("publish");
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const hashKey = (k) => crypto.createHash("sha256").update(k.trim()).digest("hex");
const slugify = (word) =>
  word.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const badgeFromVerdict = (v) => ({ NEW: "new", NEAR_EXISTING: "near_existing", EXISTS: "collision", UNVERIFIED: "unverified" }[v] ?? "unverified");

const db = createClient({ url: `file:${path.join(process.cwd(), "data", "ai-neologism.db").replace(/\\/g, "/")}` });

async function slugExists(candidate) {
  const res = await db.execute({ sql: "SELECT 1 FROM words WHERE slug = ?", args: [candidate] });
  return res.rows.length > 0;
}

async function uniqueSlug(base) {
  let slug = slugify(base) || "word";
  let candidate = slug;
  let n = 2;
  while (await slugExists(candidate)) candidate = `${slug}-${n++}`;
  return candidate;
}

async function wordExists(word) {
  const res = await db.execute({ sql: "SELECT 1 FROM words WHERE LOWER(word) = LOWER(?)", args: [word] });
  return res.rows.length > 0;
}

async function verifyWord(word, definition) {
  const res = await fetch(`${BASE}/api/coin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(CRON_SECRET ? { "x-cron-secret": CRON_SECRET } : {}) },
    body: JSON.stringify({ word, definition }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`verify HTTP ${res.status}`);
  const data = await res.json();
  return data.verification;
}

async function resolveRelated(entrySlug, relatedWords) {
  const resolved = [];
  for (const w of relatedWords ?? []) {
    const s2 = slugify(w);
    if (!s2 || s2 === entrySlug) continue;
    const hit = await db.execute({
      sql: "SELECT 1 FROM words WHERE slug = ? AND status = 'published'",
      args: [s2],
    });
    if (hit.rows.length > 0) resolved.push(s2);
  }
  return resolved;
}

// --verify-existing: re-run novelty verification on UNVERIFIED words already in
// the queue (batch or API channel). The path to full verification once a working
// search provider exists — and the tool for the protocol's periodic re-verification.
if (hasFlag("verify-existing")) {
  const rows = (
    await db.execute(
      "SELECT id, word, definition FROM words WHERE status = 'in_review' AND input_type = 'api' AND badge = 'unverified' ORDER BY id ASC"
    )
  ).rows;
  console.log(`re-verifying ${rows.length} unverified queue words\n`);
  const counts = {};
  for (const row of rows) {
    let v = null;
    try {
      v = await verifyWord(String(row.word), String(row.definition));
    } catch (e) {
      console.log(`skip   ${row.word} (verify call failed: ${String(e.message).slice(0, 60)})`);
    }
    if (v) {
      await db.execute({
        sql: "UPDATE words SET verification_json = ?, badge = ?, updated_at = datetime('now') WHERE id = ?",
        args: [JSON.stringify(v), badgeFromVerdict(v.verdict), Number(row.id)],
      });
      counts[v.verdict] = (counts[v.verdict] ?? 0) + 1;
      console.log(`update ${row.word} → ${v.verdict}`);
    }
    if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
  }
  console.log(`\nre-verify summary: ${JSON.stringify(counts)}`);
  process.exit(0);
}

const candidates = JSON.parse(fs.readFileSync(FILE, "utf8"));
console.log(
  `batch: ${candidates.length} candidates from ${FILE}, mode=${PUBLISH ? "PUBLISH (review-verified, direct)" : "review-queue (live verify)"}, delay ${DELAY}ms\n`
);

const report = { file: FILE, date: new Date().toISOString().slice(0, 10), mode: PUBLISH ? "publish" : "queue", inserted: [], skipped: [], blocked: [], verdictCounts: {} };

let done = 0;
for (const c of candidates) {
  if (done >= LIMIT) break;
  done++;

  if (await wordExists(c.word)) {
    report.skipped.push({ word: c.word, reason: "already in dictionary" });
    console.log(`skip   ${c.word} (already present)`);
    continue;
  }

  let verification;
  if (PUBLISH) {
    // The editorial review already ran the novelty search; its evidence block
    // ships with the entry. Refuse to publish without one.
    if (!c.verification?.verdict) {
      report.blocked.push({ word: c.word, verdict: "NO_VERIFICATION", note: "publish mode requires a per-entry verification block" });
      console.log(`BLOCK  ${c.word} — no verification block in publish mode`);
      continue;
    }
    verification = c.verification;
  } else {
    try {
      verification = await verifyWord(c.word, c.definition);
    } catch (e) {
      verification = { verdict: "UNVERIFIED", checked_at: new Date().toISOString().slice(0, 10), method: "batch run — verify call failed", note: String(e.message).slice(0, 120) };
    }
    if (verification.verdict === "EXISTS") {
      report.blocked.push({ word: c.word, verdict: verification.verdict, note: verification.note });
      console.log(`BLOCK  ${c.word} — EXISTS: ${verification.note?.slice(0, 80)}`);
      if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
      continue;
    }
  }

  const slug = await uniqueSlug(c.word);
  const VALID_CATEGORIES = [
    "Society & Philanthropy",
    "Technology & AI",
    "Environment",
    "Work & Economy",
    "Culture & Language",
    "Health",
  ];
  // Categories come pre-selected by the coiner (protocol §2 rule 9); related
  // words start empty and are resolved in the second pass below.
  const categories = (c.categories ?? []).filter((x) => VALID_CATEGORIES.includes(x)).slice(0, 2);
  await db.execute({
    sql: `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
      alternatives_json, verification_json, references_json, related_words, categories_json,
      ai_assisted, status, badge, input_type, contributor_key_hash, contact_email, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', '[]', ?, 1, ?, ?, ?, NULL, NULL, ${PUBLISH ? "datetime('now')" : "NULL"})`,
    args: [
      slug,
      c.word,
      c.pronunciation ?? null,
      c.part_of_speech ?? "noun",
      c.definition,
      c.explanation ?? "",
      c.why_this_word ?? "",
      JSON.stringify(verification),
      JSON.stringify(categories),
      PUBLISH ? "published" : "in_review",
      badgeFromVerdict(verification.verdict),
      PUBLISH ? "batch" : "api",
    ],
  });
  await db.execute({
    sql: "INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, NULL, ?, '{}')",
    args: [Number((await db.execute({ sql: "SELECT id FROM words WHERE slug = ?", args: [slug] })).rows[0].id), PUBLISH ? "Editorial batch — published on review" : "Editorial batch submission"],
  });

  report.verdictCounts[verification.verdict] = (report.verdictCounts[verification.verdict] ?? 0) + 1;
  report.inserted.push({ word: c.word, slug, verdict: verification.verdict });
  console.log(`insert ${c.word} → ${slug} [${verification.verdict}]${PUBLISH ? " (published)" : ""}`);

  if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
}

// second pass: resolve related_words against the now-published set (intra-batch
// links included). Only links to entries that actually exist, never 404s.
let relatedLinked = 0;
for (const c of report.inserted) {
  const entry = candidates.find((x) => x.word === c.word);
  if (!entry?.related_words?.length) continue;
  const resolved = await resolveRelated(c.slug, entry.related_words);
  if (resolved.length > 0) {
    await db.execute({
      sql: "UPDATE words SET related_words = ? WHERE slug = ?",
      args: [JSON.stringify(resolved), c.slug],
    });
    relatedLinked += resolved.length;
  }
}

// write the batch report (protocol §6.4)
const reportPath = path.join("docs", `batch-report-${path.basename(FILE, ".json")}-${new Date().toISOString().slice(0, 10)}.md`);
const lines = [
  `# Batch report — ${report.file}`,
  "",
  `- **Run date:** ${report.date}`,
  `- **Mode:** ${report.mode}`,
  `- **Inserted:** ${report.inserted.length}${PUBLISH ? " (direct-published)" : " (into review queue)"}`,
  `- **Blocked:** ${report.blocked.length}`,
  `- **Skipped (duplicates):** ${report.skipped.length}`,
  `- **Verdicts:** ${JSON.stringify(report.verdictCounts)}`,
  `- **Related-word links resolved (second pass):** ${relatedLinked}`,
  "",
  "| Word | Slug | Verdict |",
  "|---|---|---|",
  ...report.inserted.map((i) => `| ${i.word} | ${i.slug} | ${i.verdict} |`),
];
if (report.blocked.length) {
  lines.push("", "## Blocked", "", ...report.blocked.map((b) => `- **${b.word}** — ${b.verdict}: ${b.note ?? ""}`));
}
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join("\n") + "\n");

console.log(`\nreport: ${reportPath}`);
console.log(`summary: ${report.inserted.length} inserted, ${report.blocked.length} blocked, ${report.skipped.length} skipped, ${relatedLinked} related links`);
db.close();
