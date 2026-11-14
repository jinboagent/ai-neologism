// Import batch-4 APPROVE survivors into the local DB as status 'in_review'.
// Reads the generated markdown files (wordstoreview/batch-4-0N-daily-100.md) and the
// Claude review files (wordstoreview/review-batch-4-0N-claude.md), takes APPROVE rows
// with their re-rated funny/novelty levels, dedupes against the DB, inserts the rest.
//
// Usage: node scripts/batch/import-batch4.mjs [--dry] [--files 01,02,...]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@libsql/client');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const WTR = path.join(ROOT, 'wordstoreview');
const dry = process.argv.includes('--dry');
const filesArg = process.argv.find(a => a.startsWith('--files'));
const files = filesArg
  ? filesArg.split('=')[1].split(',')
  : ['01','02','03','04','05','06','07','08','09','10'];

const db = createClient({ url: 'file:' + path.join(ROOT, 'data', 'ai-neologism.db') });

function parseSource(num) {
  const file = path.join(WTR, `batch-4-${num}-daily-100.md`);
  if (!fs.existsSync(file)) throw new Error(`missing source file: ${file}`);
  const txt = fs.readFileSync(file, 'utf8');
  const entries = [];
  const chunks = txt.split(/^### /m).slice(1);
  for (const ch of chunks) {
    const head = ch.match(/^(\d+)\. (.+)/);
    if (!head) continue;
    const field = (name) => {
      const m = ch.match(new RegExp(`\\*\\*${name}:\\*\\* (.+)`));
      return m ? m[1].trim() : '';
    };
    entries.push({
      num: parseInt(head[1], 10),
      word: head[2].trim(),
      pos: field('Part of speech'),
      definition: field('Definition'),
      explanation: field('Explanation'),
      why: field('Why this word'),
      pronunciation: field('Pronunciation'),
      related: field('Related words'),
      categories: field('Categories'),
      funny: parseInt(field('funny_level'), 10) || null,
      novelty: parseInt(field('novelty_level'), 10) || null,
    });
  }
  return entries;
}

function parseReview(num) {
  const file = path.join(WTR, `review-batch-4-${num}-claude.md`);
  if (!fs.existsSync(file)) return null;
  const txt = fs.readFileSync(file, 'utf8');
  const verdicts = new Map();
  for (const m of txt.matchAll(/^\|\s*(\d+)\s*\|\s*([a-z0-9-]+)\s*\|\s*(APPROVE|REVISE|REJECT|CHECK)\s*\|\s*(\d)\s*\|\s*(\d)\s*\|/gim)) {
    verdicts.set(parseInt(m[1], 10), {
      word: m[2].toLowerCase(),
      verdict: m[3].toUpperCase(),
      funny: parseInt(m[4], 10),
      novelty: parseInt(m[5], 10),
    });
  }
  return verdicts;
}

const slugify = (w) => w.toLowerCase().replace(/[^a-z0-9]+/g, '-');

async function main() {
  const existing = new Set();
  const dbRows = await db.execute('SELECT word, slug FROM words');
  for (const r of dbRows.rows) {
    existing.add(String(r.word).toLowerCase());
    existing.add(String(r.slug).toLowerCase());
  }

  let approved = 0, inserted = 0, dupes = 0;
  const report = [];

  for (const num of files) {
    const review = parseReview(num);
    if (!review) {
      report.push(`${num}: review file missing — skipped`);
      continue;
    }
    const src = parseSource(num);
    const seenInFile = new Set();
    for (const e of src) {
      if (seenInFile.has(e.word.toLowerCase())) continue;
      seenInFile.add(e.word.toLowerCase());
      const v = review.get(e.num);
      if (!v || v.verdict !== 'APPROVE') continue;
      approved++;
      const key = e.word.toLowerCase();
      if (existing.has(key) || existing.has(slugify(e.word))) { dupes++; continue; }

      const related = e.related.split(/,\s*/).map(s => s.trim()).filter(Boolean);
      const categories = e.categories.split(/,\s*/).map(s => s.trim()).filter(Boolean);
      const verification = JSON.stringify({
        reviewed_by: 'claude-cli',
        reviewed_at: '2026-11-14',
        verdict: v.verdict,
        funny_level: v.funny ?? e.funny,
        novelty_level: v.novelty ?? e.novelty,
        batch: `batch-4-${num}`,
      });
      const alternatives = JSON.stringify([`de: meaning-based German version pending`]);

      if (!dry) {
        await db.execute({
          sql: `INSERT INTO words
            (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
             alternatives_json, verification_json, references_json, related_words, categories_json,
             ai_assisted, status, input_type, funny_level, novelty_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'in_review', 'batch', ?, ?, datetime('now'), datetime('now'))`,
          args: [
            slugify(e.word), e.word, e.pronunciation, e.pos, e.definition, e.explanation, e.why,
            alternatives, verification, '[]', related.join(', '), JSON.stringify(categories),
            v.funny ?? e.funny, v.novelty ?? e.novelty,
          ],
        });
        existing.add(key);
        existing.add(slugify(e.word));
      }
      inserted++;
    }
    report.push(`${num}: approved rows matched=${[...review.values()].filter(v => v.verdict === 'APPROVE').length}`);
  }

  console.log(`mode: ${dry ? 'DRY RUN' : 'INSERT'}`);
  console.log(`approved rows across files: ${approved}`);
  console.log(`inserted${dry ? ' (would insert)' : ''}: ${inserted}`);
  console.log(`db dupes skipped: ${dupes}`);
  console.log(report.join('\n'));
}

main().catch(err => { console.error(err); process.exit(1); });
