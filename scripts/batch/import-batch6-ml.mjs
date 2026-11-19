// Import ALL approved batch-6 words into the local DB as published, in four
// languages (en/de/nl/es) linked through concept families. Dutch is a NEW
// language for the wiki: rows go into the DB only (no site locale yet).
//
// Inputs:
//  - EN:    wordstoreview/batch-6-01-weather-100.md, batch-6-02-pets-100.md, batch-6-03-transport-100.md
//  - EN verdicts (authoritative survivor list + re-rated levels):
//           wordstoreview/review-batch-6-0N-*-claude.md (parsed here — batch-6 files
//           are not in review-verdicts.json, which covers batch-4/5 only)
//  - de/nl/es translation tables: batch-6-0N-<theme>-<lang>.md
//
// Status: 'published' (badge 'new') — same convention as the batch-2/3/4/5 imports.
// Reversible: UPDATE words SET status='in_review' WHERE input_type='batch6ml'.
// Concept rows are created here; push them to Turso with
// scripts/batch/push-concepts-turso.mjs before local/sync-to-turso.mjs.
//
// Usage: node scripts/batch/import-batch6-ml.mjs [--dry]
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
  { key: 'batch-6-01', rev: 'review-batch-6-01-claude.md', src: 'batch-6-01-weather-100.md', theme: 'weather', reviewedAt: '2026-11-19' },
  { key: 'batch-6-02', rev: 'review-batch-6-02-claude.md', src: 'batch-6-02-pets-100.md', theme: 'pets', reviewedAt: '2026-11-19' },
  { key: 'batch-6-03', rev: 'review-batch-6-03-claude.md', src: 'batch-6-03-transport-100.md', theme: 'transport', reviewedAt: '2026-11-19' },
];

const LANGS = ['de', 'nl', 'es'];

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

// Parse the EN review table: | # | word | verdict | funny | novelty | reason |
function parseReview(file) {
  const rows = new Map();
  const txt = fs.readFileSync(path.join(WTR, file), 'utf8');
  for (const line of txt.split('\n')) {
    const cells = line.trim().split('|').map((c) => c.trim());
    // data row: | n | word | verdict | funny | novelty | reason | — header has '#'
    if (!/^\d+$/.test(cells[1] ?? '')) continue;
    if (!/^(APPROVE|REVISE|REJECT|CHECK|DROP)$/i.test(cells[3] ?? '')) continue;
    rows.set(parseInt(cells[1], 10), {
      word: cells[2], verdict: cells[3].toUpperCase(),
      funny: parseInt(cells[4], 10), novelty: parseInt(cells[5], 10),
    });
  }
  return rows;
}

// Parse a bilingual translation table: | # | English | Coinage | Gloss | funny | novelty |
// (lines start with "|", so split("|") yields a leading empty cell — content starts at cells[1])
function parseTranslations(file) {
  const rows = new Map();
  const txt = fs.readFileSync(path.join(WTR, file), 'utf8');
  for (const line of txt.split('\n')) {
    const cells = line.trim().split('|').map((c) => c.trim());
    // data row: | n | english | coin | gloss | funny | novelty |
    if (!/^\d+$/.test(cells[1] ?? '') || cells.length < 7) continue;
    if (!cells[2] || !cells[3]) continue;
    rows.set(parseInt(cells[1], 10), {
      en: cells[2], coin: cells[3], gloss: cells[4],
      funny: parseInt(cells[5], 10), novelty: parseInt(cells[6], 10),
    });
  }
  return rows;
}

function slugify(word, locale = 'en') {
  let s = word;
  if (locale === 'de') {
    s = s.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
         .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss');
  } else if (locale !== 'en') {
    // es / fr / nl — strip diacritics (NFD), transliteration stays ASCII
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return s.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const taken = new Set();          // existing words + slugs (any status), then everything added
  const publishedSlugs = new Set(); // pre-existing published slugs (related-link targets)
  for (const r of (await db.execute('SELECT word, slug, status FROM words')).rows) {
    taken.add(String(r.word).toLowerCase());
    taken.add(String(r.slug).toLowerCase());
    if (String(r.status) === 'published') publishedSlugs.add(String(r.slug));
  }

  const problems = [];
  let skippedDupes = 0;

  // Slug allocator mirroring the site's uniqueSlug: base, then -2, -3 …
  const allocateSlug = (base) => {
    if (!taken.has(base)) { taken.add(base); return base; }
    let k = 2;
    while (taken.has(`${base}-${k}`)) k++;
    const candidate = `${base}-${k}`;
    taken.add(candidate);
    return candidate;
  };

  // ---- Pass 1: survivors + slugs (needed before related-link wiring) --------
  const survivors = []; // { b, n, v, e, enSlug, tr: {de,nl,es} }
  for (const b of BATCHES) {
    const review = parseReview(b.rev);
    const src = parseSource(b.src);
    const langTables = {};
    for (const l of LANGS) langTables[l] = parseTranslations(`${b.key}-${b.theme}-${l}.md`);
    for (const [n, v] of review) {
      if (v.verdict !== 'APPROVE') continue;
      const e = src.get(n);
      if (!e) { problems.push(`${b.key}#${n}: missing source entry`); continue; }
      if (e.word.toLowerCase() !== v.word.toLowerCase()) {
        problems.push(`${b.key}#${n}: review word "${v.word}" != source "${e.word}"`); continue;
      }
      if (taken.has(e.word.toLowerCase()) || taken.has(slugify(e.word))) { skippedDupes++; continue; }
      const tr = {};
      for (const l of LANGS) {
        const t = langTables[l].get(n);
        if (!t) { problems.push(`${b.key}#${n}: missing ${l} row`); continue; }
        if (t.en.toLowerCase() !== e.word.toLowerCase()) {
          problems.push(`${b.key}#${n}: ${l} EN column "${t.en}" != source "${e.word}"`); continue;
        }
        if (!t.coin) { problems.push(`${b.key}#${n}: empty ${l} coinage`); continue; }
        tr[l] = { ...t, funny: t.funny ?? v.funny, novelty: t.novelty ?? v.novelty };
      }
      survivors.push({ b, n, v, e, enSlug: slugify(e.word), tr });
    }
  }

  // ---- Pass 2: build rows -----------------------------------------------------
  const enSlugByWord = new Map(survivors.map((s) => [s.e.word.toLowerCase(), s.enSlug]));
  const words = [];
  for (const s of survivors) {
    taken.add(s.e.word.toLowerCase()); taken.add(s.enSlug);
    const { b, v, e } = s;
    const key = `${b.key}#${s.n}`;
    const cats = e.categories.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    for (const c of cats) if (!VALID_CATEGORIES.has(c)) problems.push(`${key}: unknown category "${c}"`);
    const related = [...new Set(e.related.split(/,\s*/).map((x) => x.trim()).filter(Boolean)
      .map((x) => enSlugByWord.get(x.toLowerCase()) ?? slugify(x))
      .filter((sl) => publishedSlugs.has(sl) || survivors.some((t) => t.enSlug === sl)))];

    words.push({
      conceptLabel: e.word, lang: 'en', slug: s.enSlug, word: e.word,
      pronunciation: e.pronunciation || null,
      pos: e.pos || 'noun', definition: e.definition, explanation: e.explanation, why: e.why,
      related, cats, funny: v.funny, novelty: v.novelty,
      verification: {
        verdict: 'APPROVE', reviewed_by: 'claude-cli novelty review', reviewed_at: b.reviewedAt,
        funny_level: v.funny, novelty_level: v.novelty, batch: b.key,
      },
    });

    for (const l of LANGS) {
      const t = s.tr[l];
      if (!t) continue;
      const slug = allocateSlug(slugify(t.coin, l));
      if (!slug) { problems.push(`${key}: ${l} slugify empty for "${t.coin}"`); continue; }
      taken.add(t.coin.toLowerCase());
      words.push({
        conceptLabel: e.word, lang: l, slug, word: t.coin, pronunciation: null,
        pos: e.pos || 'noun', definition: t.gloss, explanation: '', why: '',
        related: [], cats, funny: t.funny ?? v.funny, novelty: t.novelty ?? v.novelty,
        verification: {
          verdict: 'APPROVE (en review)',
          translated_by: `meaning-based ${l} pass`,
          reviewed_at: b.reviewedAt,
          funny_level: t.funny ?? v.funny, novelty_level: t.novelty ?? v.novelty,
          batch: b.key, source_word: e.word,
        },
      });
    }
  }

  const byLang = { en: 0, de: 0, nl: 0, es: 0 };
  for (const w of words) byLang[w.lang]++;
  const conceptLabels = [...new Set(words.map((w) => w.conceptLabel))];

  console.log(`mode: ${dry ? 'DRY RUN' : 'INSERT'}`);
  console.log(`concepts: ${conceptLabels.length}`);
  console.log(`word rows: en=${byLang.en} de=${byLang.de} nl=${byLang.nl} es=${byLang.es} total=${words.length}`);
  console.log(`db dupes skipped (EN headwords): ${skippedDupes}`);
  if (problems.length) {
    console.log(`\nPROBLEMS (${problems.length}):`);
    for (const p of problems.slice(0, 40)) console.log('  ' + p);
    if (problems.length > 40) console.log(`  ...and ${problems.length - 40} more`);
  }
  if (dry) {
    for (const w of words.filter((x) => x.lang === 'en').slice(0, 2)) {
      console.log('  sample EN:', w.slug, '—', w.word, '—', w.definition.slice(0, 60), '— related:', JSON.stringify(w.related));
    }
    for (const l of ['de', 'nl', 'es']) {
      const w = words.find((x) => x.lang === l);
      if (w) console.log(`  sample ${l}:`, w.slug, '—', w.word, '—', w.definition.slice(0, 60));
    }
    await db.close();
    return;
  }

  // ---- Insert: concepts, then words (chunked batches) ------------------------
  await db.batch(conceptLabels.map((label) => ({ sql: 'INSERT INTO concepts (label) VALUES (?)', args: [label] })), 'write');
  const conceptIds = new Map();
  for (const r of (await db.execute('SELECT id, label FROM concepts')).rows) conceptIds.set(String(r.label), Number(r.id));

  const stmts = words.map((w) => ({
    sql: `INSERT INTO words
      (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
       alternatives_json, verification_json, references_json, related_words, categories_json,
       ai_assisted, status, badge, input_type, language, concept_id, grammar_json,
       funny_level, novelty_level, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'published', 'new', 'batch6ml', ?, ?, '{}', ?, ?, ?, ?, ?)`,
    args: [
      w.slug, w.word, w.pronunciation, w.pos, w.definition, w.explanation, w.why,
      JSON.stringify(w.verification), JSON.stringify(w.related), JSON.stringify(w.cats),
      w.lang, conceptIds.get(w.conceptLabel) ?? null,
      w.funny, w.novelty, now, now, now,
    ],
  }));
  const CHUNK = 100;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await db.batch(stmts.slice(i, i + CHUNK), 'write');
    console.log(`  inserted ${Math.min(i + CHUNK, stmts.length)}/${stmts.length}`);
  }

  const after = await db.execute("SELECT language, COUNT(*) n FROM words WHERE status = 'published' GROUP BY language");
  console.log('\npublished by language now:', after.rows.map((r) => `${r.language}=${r.n}`).join('  '));
  await db.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
