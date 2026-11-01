// Editorial batch coiner: reads a JSON file of candidate words, verifies each
// through the site's novelty-search pipeline, and inserts survivors directly
// into the review queue (input_type 'api' → the admin gate, per the protocol
// in docs/VALIDATION-protocol.md §6).
//
// Usage:
//   node scripts/batch-coin.mjs --file scripts/batch/pilot-25.json [--delay 3000] [--limit N]
//
// Idempotent: words already present (any status) are skipped.
// EXISTS verdicts are NOT inserted (the gate). Everything else — NEW,
// NEAR_EXISTING, UNVERIFIED — enters the review queue for the human decision.

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
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const hashKey = (k) => crypto.createHash("sha256").update(k.trim()).digest("hex");
const slugify = (word) =>
  word.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const badgeFromVerdict = (v) => ({ NEW: "new", NEAR_EXISTING: "near_existing", EXISTS: "collision", UNVERIFIED: "unverified" }[v] ?? "unverified");

const db = createClient({ url: `file:${path.join(process.cwd(), "data", "ai-neologism.db").replace(/\\/g, "/")}` });

function uniqueSlug(base) {
  let slug = slugify(base) || "word";
  let candidate = slug;
  let n = 2;
  while (db.prepare("SELECT 1 FROM words WHERE slug = ?").get(candidate)) candidate = `${slug}-${n++}`;
  return candidate;
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

const candidates = hasFlag("verify-existing")
  ? []
  : JSON.parse(fs.readFileSync(FILE, "utf8"));
console.log(`batch: ${candidates.length || "(verify-existing mode)"} candidates from ${FILE}, delay ${DELAY}ms\n`);

// --verify-existing: re-run novelty verification on UNVERIFIED words already in
// the queue (batch or API channel). The path to full verification once a working
// search provider exists — and the tool for the protocol's periodic re-verification.
if (hasFlag("verify-existing")) {
  const rows = db
    .prepare(
      "SELECT id, word, definition FROM words WHERE status = 'in_review' AND input_type = 'api' AND badge = 'unverified' ORDER BY id ASC"
    )
    .all();
  console.log(`re-verifying ${rows.length} unverified queue words\n`);
  const counts = {};
  for (const row of rows) {
    let v = null;
    try {
      v = await verifyWord(row.word, row.definition);
    } catch (e) {
      console.log(`skip   ${row.word} (verify call failed: ${String(e.message).slice(0, 60)})`);
    }
    if (v) {
      db.prepare("UPDATE words SET verification_json = ?, badge = ?, updated_at = datetime('now') WHERE id = ?").run(
        JSON.stringify(v),
        badgeFromVerdict(v.verdict),
        row.id
      );
      counts[v.verdict] = (counts[v.verdict] ?? 0) + 1;
      console.log(`update ${row.word} → ${v.verdict}`);
    }
    if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
  }
  console.log(`\nre-verify summary: ${JSON.stringify(counts)}`);
  process.exit(0);
}

const report = { file: FILE, date: new Date().toISOString().slice(0, 10), inserted: [], skipped: [], blocked: [], verdictCounts: {} };

let done = 0;
for (const c of candidates) {
  if (done >= LIMIT) break;
  done++;

  if ((await db.execute({ sql: "SELECT 1 FROM words WHERE LOWER(word) = LOWER(?)", args: [c.word] })).rows.length > 0) {
    report.skipped.push({ word: c.word, reason: "already in dictionary" });
    console.log(`skip   ${c.word} (already present)`);
    continue;
  }

  let verification;
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

  const slug = uniqueSlug(c.word);
  // AI-coined words always carry a proposed pronunciation; related words are
  // best-effort and only stored when the target entry actually exists.
  // Categories come pre-selected by the coiner (protocol §2 rule 9).
  const VALID_CATEGORIES = [
    "Society & Philanthropy",
    "Technology & AI",
    "Environment",
    "Work & Economy",
    "Culture & Language",
    "Health",
  ];
  // Related words are best-effort and only stored when the target entry exists
  // AND is published - links must never point at words the public cannot see.
  const related = [];
  for (const w of c.related_words ?? []) {
    const s2 = slugify(w);
    if (!s2) continue;
    const hit = await db.execute({
      sql: "SELECT 1 FROM words WHERE slug = ? AND status = 'published'",
      args: [s2],
    });
    if (hit.rows.length > 0) related.push(s2);
  }
  const categories = (c.categories ?? []).filter((x) => VALID_CATEGORIES.includes(x)).slice(0, 2);
  await db.execute({
    sql: `INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
      alternatives_json, verification_json, references_json, related_words, categories_json,
      ai_assisted, status, badge, input_type, contributor_key_hash, contact_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'in_review', ?, 'api', NULL, NULL)`,
    args: [
      slug,
      c.word,
      c.pronunciation ?? null,
      c.part_of_speech ?? "noun",
      c.definition,
      c.explanation ?? "",
      c.why_this_word ?? "",
      JSON.stringify(verification),
      JSON.stringify(related),
      JSON.stringify(categories),
      badgeFromVerdict(verification.verdict),
    ],
  });
  const id = db.prepare("SELECT id FROM words WHERE slug = ?").get(slug).id;
  db.prepare("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, NULL, 'Editorial batch submission', '{}')").run(id);

  report.verdictCounts[verification.verdict] = (report.verdictCounts[verification.verdict] ?? 0) + 1;
  report.inserted.push({ word: c.word, slug, verdict: verification.verdict });
  console.log(`insert ${c.word} → ${slug} [${verification.verdict}]`);

  if (DELAY) await new Promise((r) => setTimeout(r, DELAY));
}

// write the batch report (protocol §6.4)
const reportPath = path.join("docs", `batch-report-${path.basename(FILE, ".json")}-${new Date().toISOString().slice(0, 10)}.md`);
const lines = [
  `# Batch report — ${report.file}`,
  "",
  `- **Run date:** ${report.date}`,
  `- **Inserted into review queue:** ${report.inserted.length}`,
  `- **Blocked by EXISTS gate:** ${report.blocked.length}`,
  `- **Skipped (duplicates):** ${report.skipped.length}`,
  `- **Verdicts of inserted words:** ${JSON.stringify(report.verdictCounts)}`,
  "",
  "| Word | Slug | Verdict |",
  "|---|---|---|",
  ...report.inserted.map((i) => `| ${i.word} | ${i.slug} | ${i.verdict} |`),
];
if (report.blocked.length) {
  lines.push("", "## Blocked by the EXISTS gate", "", ...report.blocked.map((b) => `- **${b.word}** — ${b.note ?? ""}`));
}
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join("\n") + "\n");

console.log(`\nreport: ${reportPath}`);
console.log(`summary: ${report.inserted.length} inserted, ${report.blocked.length} blocked, ${report.skipped.length} skipped`);
