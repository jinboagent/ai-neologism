// Import approved batch-7 (game-feeder) words into the local DB as published,
// EN-only: one concept per word, one language row (en).
//
// Inputs:
//  - EN source files: wordstoreview/batch-7-0N-<theme>-100.md (N=01..05)
//  - EN verdicts (authoritative): wordstoreview/review-batch-7-0N-claude.md
//
// Batch-7 specifics: every coin exact-rebuilds (chain in why_this_word == word),
// so games get fuel at import time — no enrichment pass needed. REVISE/REJECT/
// CHECK rows stay out (only APPROVE ships; CHECKs must be resolved in the review
// table before import).
//
// Status: 'published' (badge 'new'), input_type='batch7ml'.
// Reversible: UPDATE words SET status='in_review' WHERE input_type='batch7ml'.
// Concepts are created here; push them with scripts/batch/push-concepts-turso.mjs
// before local/sync-to-turso.mjs.
//
// Usage: node scripts/batch/import-batch7.mjs [--dry]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@libsql/client');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const WTR = path.join(ROOT, 'wordstoreview');
const dry = process.argv.includes('--dry');

const db = createClient({ url: 'file:' + path.join(ROOT, 'data', 'ai-neologism.db') });

const BATCHES = [
  { key: 'batch-7-01', rev: 'review-batch-7-01-claude.md', src: 'batch-7-01-screens-100.md', reviewedAt: '2026-11-20' },
  { key: 'batch-7-02', rev: 'review-batch-7-02-claude.md', src: 'batch-7-02-money-100.md', reviewedAt: '2026-11-20' },
  { key: 'batch-7-03', rev: 'review-batch-7-03-claude.md', src: 'batch-7-03-health-100.md', reviewedAt: '2026-11-20' },
  { key: 'batch-7-04', rev: 'review-batch-7-04-claude.md', src: 'batch-7-04-school-100.md', reviewedAt: '2026-11-20' },
  { key: 'batch-7-05', rev: 'review-batch-7-05-claude.md', src: 'batch-7-05-music-100.md', reviewedAt: '2026-11-20' },
];

const VALID_CATEGORIES = new Set([
  'Society & Philanthropy', 'Technology & AI', 'Environment',
  'Work & Economy', 'Culture & Language', 'Health',
]);

function parseSource(file) {
  const txt = fs.readFileSync(path.join(WTR, file), 'utf8');
  const entries = new Map();
  for (const ch of txt.split(/^### /m).slice(1)) {
    const head = ch.match(/^(\d+)\. (.+)/);
    if (!head) continue;
    const field = (name) => {
      const m = ch.match(new RegExp(`\\*\\*${name}:\\*\\* (.+)`));
      return m ? m[1].trim() : '';
    };
    entries.set(parseInt(head[1], 10), {
      word: head[2].trim(),
      pos: field('Part of speech'),
      definition: field('Definition'),
      explanation: field('Explanation'),
      why: field('Why this word'),
      pronunciation: field('Pronunciation'),
      related: field('Related words'),
      categories: field('Categories'),
    });
  }
  return entries;
}

// EN review table: | # | word | verdict | funny | novelty | reason |
function parseReview(file) {
  const rows = new Map();
  const txt = fs.readFileSync(path.join(WTR, file), 'utf8');
  for (const line of txt.split('\n')) {
    const cells = line.trim().split('|').map((c) => c.trim());
    if (!/^\d+$/.test(cells[1] ?? '')) continue;
    if (!/^(APPROVE|REVISE|REJECT|CHECK|DROP)$/i.test(cells[3] ?? '')) continue;
    rows.set(parseInt(cells[1], 10), {
      word: cells[2], verdict: cells[3].toUpperCase(),
      funny: parseInt(cells[4], 10), novelty: parseInt(cells[5], 10),
    });
  }
  return rows;
}

function slugify(word) {
  return word.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const taken = new Set();
  const publishedSlugs = new Set();
  for (const r of (await db.execute('SELECT word, slug, status FROM words')).rows) {
    taken.add(String(r.word).toLowerCase());
    taken.add(String(r.slug).toLowerCase());
    if (String(r.status) === 'published') publishedSlugs.add(String(r.slug));
  }

  const allocateSlug = (base) => {
    if (!taken.has(base)) { taken.add(base); return base; }
    let k = 2;
    while (taken.has(`${base}-${k}`)) k++;
    const candidate = `${base}-${k}`;
    taken.add(candidate);
    return candidate;
  };

  const problems = [];
  let skippedDupes = 0, skippedRevise = 0;

  // Pass 1: survivors + slugs
  const survivors = [];
  for (const b of BATCHES) {
    const review = parseReview(b.rev);
    const src = parseSource(b.src);
    for (const [n, v] of review) {
      if (v.verdict !== 'APPROVE') { skippedRevise++; continue; }
      const e = src.get(n);
      if (!e) { problems.push(`${b.key}#${n}: missing source entry`); continue; }
      if (e.word.toLowerCase() !== v.word.toLowerCase()) {
        problems.push(`${b.key}#${n}: review word "${v.word}" != source "${e.word}"`); continue;
      }
      if (taken.has(e.word.toLowerCase()) || taken.has(slugify(e.word))) { skippedDupes++; continue; }
      survivors.push({ b, n, v, e, slug: slugify(e.word) });
    }
  }

  // Pass 2: build rows
  const slugByWord = new Map(survivors.map((s) => [s.e.word.toLowerCase(), s.slug]));
  const words = [];
  for (const s of survivors) {
    taken.add(s.e.word.toLowerCase()); taken.add(s.slug);
    const { b, v, e } = s;
    const key = `${b.key}#${s.n}`;
    const cats = e.categories.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    for (const c of cats) if (!VALID_CATEGORIES.has(c)) problems.push(`${key}: unknown category "${c}"`);
    const related = [...new Set(e.related.split(/,\s*/).map((x) => x.trim()).filter(Boolean)
      .map((x) => slugByWord.get(x.toLowerCase()) ?? slugify(x))
      .filter((sl) => publishedSlugs.has(sl) || survivors.some((t) => t.slug === sl)))];

    words.push({
      conceptLabel: e.word, slug: s.slug, word: e.word,
      pronunciation: e.pronunciation || null,
      pos: e.pos || 'noun', definition: e.definition, explanation: e.explanation, why: e.why,
      related, cats, funny: v.funny, novelty: v.novelty,
      verification: {
        verdict: 'APPROVE', reviewed_by: 'claude-cli novelty review', reviewed_at: b.reviewedAt,
        funny_level: v.funny, novelty_level: v.novelty, batch: b.key,
        game_feed: 'exact-rebuild verified at generation (precheck-batch-7.py)',
      },
    });
  }

  const conceptLabels = [...new Set(words.map((w) => w.conceptLabel))];
  console.log(`mode: ${dry ? 'DRY RUN' : 'INSERT'}`);
  console.log(`concepts: ${conceptLabels.length}`);
  console.log(`word rows: ${words.length} (en only)`);
  console.log(`skipped: ${skippedDupes} db dupes, ${skippedRevise} non-APPROVE`);
  if (problems.length) {
    console.log(`\nPROBLEMS (${problems.length}):`);
    for (const p of problems.slice(0, 40)) console.log('  ' + p);
    if (problems.length > 40) console.log(`  ...and ${problems.length - 40} more`);
  }
  if (dry) {
    for (const w of words.slice(0, 3)) {
      console.log('  sample:', w.slug, '—', w.word, '—', w.definition.slice(0, 60), '— related:', JSON.stringify(w.related));
    }
    await db.close();
    return;
  }

  await db.batch(conceptLabels.map((label) => ({ sql: 'INSERT INTO concepts (label) VALUES (?)', args: [label] })), 'write');
  const conceptIds = new Map();
  for (const r of (await db.execute('SELECT id, label FROM concepts')).rows) conceptIds.set(String(r.label), Number(r.id));

  const stmts = words.map((w) => ({
    sql: `INSERT INTO words
      (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
       alternatives_json, verification_json, references_json, related_words, categories_json,
       ai_assisted, status, badge, input_type, language, concept_id, grammar_json,
       funny_level, novelty_level, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'published', 'new', 'batch7ml', ?, ?, '{}', ?, ?, ?, ?, ?)`,
    args: [
      w.slug, w.word, w.pronunciation, w.pos, w.definition, w.explanation, w.why,
      JSON.stringify(w.verification), JSON.stringify(w.related), JSON.stringify(w.cats),
      'en', conceptIds.get(w.conceptLabel) ?? null,
      w.funny, w.novelty, now, now, now,
    ],
  }));
  const CHUNK = 100;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await db.batch(stmts.slice(i, i + CHUNK), 'write');
    console.log(`  inserted ${Math.min(i + CHUNK, stmts.length)}/${stmts.length}`);
  }

  const after = await db.execute("SELECT COUNT(*) n FROM words WHERE input_type = 'batch7ml'");
  console.log(`\nbatch7ml rows now: ${after.rows[0].n}`);
  await db.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
