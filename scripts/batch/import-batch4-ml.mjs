// Import ALL approved batch-4 + batch-5-01 words into the local DB as published,
// in four languages (en/de/fr/es) linked through concept families.
//
// Inputs:
//  - EN:    wordstoreview/batch-4-0N-daily-100.md (N=01..10), batch-5-01-night-100.md
//  - EN verdicts (authoritative survivor list + re-rated levels):
//           wordstoreview/review-verdicts.json (built by scripts/batch/parse-reviews.py)
//  - de/fr/es translation tables: batch-4-NN-daily-<lang>.md, batch-5-01-night-<lang>.md
//  - de in-language verdicts for 04-09 (review-batch-4-0N-de-claude.md): only APPROVE
//    German rows are imported — German REVISE/REJECT/DROP coinages stay out until renamed.
//
// Status: 'published' (badge 'new') — same convention as the batch-2/3 editorial
// imports. Reversible: UPDATE words SET status='in_review' WHERE input_type='batch4ml'.
// Concept rows are created here (local ids continue after 771); push them to Turso
// with scripts/batch/push-concepts-turso.mjs before local/sync-to-turso.mjs.
//
// Usage: node scripts/batch/import-batch4-ml.mjs [--dry]
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
  { key: 'batch-4-01', rev: 'review-batch-4-01-claude.md', src: 'batch-4-01-daily-100.md', deFiltered: false },
  { key: 'batch-4-02', rev: 'review-batch-4-02-claude.md', src: 'batch-4-02-daily-100.md', deFiltered: false },
  { key: 'batch-4-03', rev: 'review-batch-4-03-claude.md', src: 'batch-4-03-daily-100.md', deFiltered: false },
  { key: 'batch-4-04', rev: 'review-batch-4-04-claude.md', src: 'batch-4-04-daily-100.md', deFiltered: true },
  { key: 'batch-4-05', rev: 'review-batch-4-05-claude.md', src: 'batch-4-05-daily-100.md', deFiltered: true },
  { key: 'batch-4-06', rev: 'review-batch-4-06-claude.md', src: 'batch-4-06-daily-100.md', deFiltered: true },
  { key: 'batch-4-07', rev: 'review-batch-4-07-claude.md', src: 'batch-4-07-daily-100.md', deFiltered: true },
  { key: 'batch-4-08', rev: 'review-batch-4-08-claude.md', src: 'batch-4-08-daily-100.md', deFiltered: true },
  { key: 'batch-4-09', rev: 'review-batch-4-09-claude.md', src: 'batch-4-09-daily-100.md', deFiltered: true },
  { key: 'batch-4-10', rev: 'review-batch-4-10-claude.md', src: 'batch-4-10-daily-100.md', deFiltered: false },
  { key: 'batch-5-01', rev: 'review-batch-5-01-claude.md', src: 'batch-5-01-night-100.md', deFiltered: false },
];

const VALID_CATEGORIES = new Set([
  'Society & Philanthropy', 'Technology & AI', 'Environment',
  'Work & Economy', 'Culture & Language', 'Health',
]);

// IPA corrections the reviews stated explicitly (review files, 2026-11-14).
const IPA_FIXES = {
  'batch-4-04|12': '/ˈdrɔːz əˈɡæsəʊ/',           // drawersargasso — fused /z/ restored
  'batch-4-04|13': '/ˈlɪd ˌdʒɪɡsɔː/',            // lidjigsaw — jigsaw mislettered
  'batch-4-04|99': '/ˈæpɛə/',                    // appair — "app" was dropped
  'batch-4-05|52': '/ˈkɒfi ˈældʒɪbrə/',          // coffeealgebra — algebra dropped the d
  'batch-4-05|64': '/bəˈnɑːnə ˈwɪndəʊ/',         // bananawindow — no primary stress
  'batch-4-05|65': '/ˈdjuːpəl ˌʃɒpɪŋ/',          // dupleshopping — mis-segmented
  'batch-4-05|98': '/ˈflɔː ˌreskjuː/',           // floorrescue — mis-segmented
  'batch-5-01|8': '/ˈweɪk ɪˈrəʊʒən/',            // wakeerosion — fused boundary
  'batch-5-01|27': '/ˈkəʊld saɪd ˌkwɛst/',       // coldsidequest — spaces
  'batch-5-01|51': '/əˈlɑːm nɪˌɡəʊʃiˈeɪʃən/',    // alarmnegotiation — m+n fused
  'batch-5-01|52': '/sliːp səbˈskrɪpʃən/',       // sleepsubscription — stress
};

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

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

// Parse a bilingual translation table (| # | English | Coinage | Gloss | funny | novelty |),
// a bilingual review table (| # | English | Deutsch | verdict | funny | novelty | reason |),
// or an EN review table (| # | word | verdict | funny | novelty | reason |).
// NOTE: lines start with "|" and end with "|", so split("|") yields a leading AND
// trailing empty cell — content columns start at cells[1].
function parseTable(file) {
  const rows = new Map();
  const txt = fs.readFileSync(path.join(WTR, file), 'utf8');
  let style = null; // 'tr' | 'review-en' | 'review-bilingual'
  for (const line of txt.split('\n')) {
    const cells = line.trim().split('|').map((c) => c.trim());
    if (cells[2] === 'English') {
      style = cells.length >= 9 ? 'review-bilingual' : 'tr';
      continue;
    }
    if (cells[2] === 'word') { style = 'review-en'; continue; }
    if (!style || cells.length < 6 || !/^\d+$/.test(cells[1] ?? '')) continue;
    const n = parseInt(cells[1], 10);
    const rating = (c) => { const m = String(c).match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : null; };
    if (style === 'tr') {
      // | # | English | Coinage | Gloss | funny | novelty |
      rows.set(n, { en: cells[2], coin: cells[3], gloss: cells[4], funny: rating(cells[5]), novelty: rating(cells[6]) });
    } else if (style === 'review-bilingual') {
      // | # | English | Deutsch | verdict | funny | novelty | reason |
      if (!/^(APPROVE|REVISE|REJECT|CHECK|DROP)$/i.test(cells[4])) continue;
      rows.set(n, { word: cells[3], coin: cells[3], verdict: cells[4].toUpperCase(), funny: rating(cells[5]), novelty: rating(cells[6]) });
    } else {
      // | # | word | verdict | funny | novelty | reason |
      if (!/^(APPROVE|REVISE|REJECT|CHECK|DROP)$/i.test(cells[3])) continue;
      rows.set(n, { word: cells[2], coin: null, verdict: cells[3].toUpperCase(), funny: rating(cells[4]), novelty: rating(cells[5]) });
    }
  }
  return rows;
}

function slugify(word, locale = 'en') {
  let s = word;
  if (locale === 'de') {
    s = s.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
         .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss');
  } else if (locale === 'es' || locale === 'fr') {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return s.toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const verdicts = readJson(path.join(WTR, 'review-verdicts.json'));
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
  // Needed because fr/es/de coinages sometimes coincide with each other or with
  // the English headword (classical roots: somnigrant, Somnilith, textbêta…).
  const allocateSlug = (base) => {
    if (!taken.has(base)) { taken.add(base); return base; }
    let k = 2;
    while (taken.has(`${base}-${k}`)) k++;
    const candidate = `${base}-${k}`;
    taken.add(candidate);
    return candidate;
  };

  // ---- Pass 1: survivors + slugs (needed before related-link wiring) --------
  const survivors = []; // { b, n, v, e, enSlug, tr: {de,fr,es} }
  for (const b of BATCHES) {
    const rows = verdicts[b.rev].rows.filter((r) => r.verdict === 'APPROVE');
    const src = parseSource(b.src);
    const deFilter = b.deFiltered ? parseTable(b.rev.replace('-claude.md', '-de-claude.md')) : null;
    const langTables = {};
    for (const l of ['de', 'fr', 'es']) {
      const f = b.key.startsWith('batch-5') ? `batch-5-01-night-${l}.md` : `${b.key}-daily-${l}.md`;
      langTables[l] = parseTable(f);
    }
    for (const v of rows) {
      const e = src.get(v.n);
      if (!e) { problems.push(`${b.key}#${v.n}: missing source entry`); continue; }
      if (e.word.toLowerCase() !== v.word.toLowerCase()) {
        problems.push(`${b.key}#${v.n}: review word "${v.word}" != source "${e.word}"`); continue;
      }
      if (taken.has(e.word.toLowerCase()) || taken.has(slugify(e.word))) { skippedDupes++; continue; }
      const tr = {};
    for (const l of ['de', 'fr', 'es']) {
      const t = langTables[l].get(v.n);
      if (!t) { problems.push(`${b.key}#${v.n}: missing ${l} row`); continue; }
      if (t.en.toLowerCase() !== e.word.toLowerCase()) {
        problems.push(`${b.key}#${v.n}: ${l} EN column "${t.en}" != source "${e.word}"`); continue;
      }
      let dv = null;
      if (l === 'de' && deFilter) {
        dv = deFilter.get(v.n);
        if (!dv || dv.verdict !== 'APPROVE') continue; // German REVISE/REJECT/DROP stays out
      }
      if (!t.coin) { problems.push(`${b.key}#${v.n}: empty ${l} coinage`); continue; }
      tr[l] = {
        ...t,
        funny: dv?.funny ?? t.funny ?? v.funny,
        novelty: dv?.novelty ?? t.novelty ?? v.novelty,
        deReviewed: Boolean(dv),
      };
    }
      survivors.push({ b, n: v.n, v, e, enSlug: slugify(e.word), tr });
    }
  }

  // ---- Pass 2: build rows -----------------------------------------------------
  const enSlugByWord = new Map(survivors.map((s) => [s.e.word.toLowerCase(), s.enSlug]));
  const words = [];
  for (const s of survivors) {
    taken.add(s.e.word.toLowerCase()); taken.add(s.enSlug);
    const { b, v, e } = s;
    const key = `${b.key}|${s.n}`;
    const cats = e.categories.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    for (const c of cats) if (!VALID_CATEGORIES.has(c)) problems.push(`${key}: unknown category "${c}"`);
    const related = [...new Set(e.related.split(/,\s*/).map((x) => x.trim()).filter(Boolean)
      .map((x) => enSlugByWord.get(x.toLowerCase()) ?? slugify(x))
      .filter((sl) => publishedSlugs.has(sl) || survivors.some((t) => t.enSlug === sl)))];

    words.push({
      conceptLabel: e.word, lang: 'en', slug: s.enSlug, word: e.word,
      pronunciation: IPA_FIXES[key] ?? e.pronunciation,
      pos: e.pos || 'noun', definition: e.definition, explanation: e.explanation, why: e.why,
      related, cats, funny: v.funny, novelty: v.novelty,
      verification: {
        verdict: 'APPROVE', reviewed_by: 'claude-cli novelty review', reviewed_at: '2026-11-14',
        funny_level: v.funny, novelty_level: v.novelty, batch: b.key,
      },
    });

    for (const l of ['de', 'fr', 'es']) {
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
          translated_by: t.deReviewed ? `meaning-based ${l} pass (de review re-rated)` : `meaning-based ${l} pass`,
          reviewed_at: '2026-11-14',
          funny_level: t.funny ?? v.funny, novelty_level: t.novelty ?? v.novelty,
          batch: b.key, source_word: e.word,
        },
      });
    }
  }

  const byLang = { en: 0, de: 0, fr: 0, es: 0 };
  for (const w of words) byLang[w.lang]++;
  const conceptLabels = [...new Set(words.map((w) => w.conceptLabel))];

  console.log(`mode: ${dry ? 'DRY RUN' : 'INSERT'}`);
  console.log(`concepts: ${conceptLabels.length}`);
  console.log(`word rows: en=${byLang.en} de=${byLang.de} fr=${byLang.fr} es=${byLang.es} total=${words.length}`);
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
    for (const l of ['de', 'fr', 'es']) {
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
      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', ?, ?, 1, 'published', 'new', 'batch4ml', ?, ?, '{}', ?, ?, ?, ?, ?)`,
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
