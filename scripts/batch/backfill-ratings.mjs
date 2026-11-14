// Apply funny/novelty backfill ratings to published words in the local DB.
// Reads wordstoreview/backfill-ratings-0[1-8].json ({i,w,f,n}) and UPDATEs words by exact word match.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@libsql/client');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const WTR = path.join(ROOT, 'wordstoreview');
const dry = process.argv.includes('--dry');

const db = createClient({ url: 'file:' + path.join(ROOT, 'data', 'ai-neologism.db') });

const all = [];
for (let c = 1; c <= 8; c++) {
  all.push(...JSON.parse(fs.readFileSync(path.join(WTR, `backfill-ratings-0${c}.json`), 'utf8')));
}

let updated = 0, missing = [];
const seen = new Set();
for (const r of all) {
  if (seen.has(r.w)) { console.log('DUP in ratings:', r.w); process.exit(1); }
  seen.add(r.w);
}

if (!dry) {
  for (const r of all) {
    const res = await db.execute({
      sql: `UPDATE words SET funny_level = ?, novelty_level = ?, updated_at = datetime('now')
            WHERE word = ? AND status = 'published'`,
      args: [r.f, r.n, r.w],
    });
    if (res.rowsAffected === 1) updated++;
    else missing.push(r.w);
  }
} else {
  const dbRows = await db.execute("SELECT word FROM words WHERE status='published'");
  const dbWords = new Set(dbRows.rows.map(x => String(x.word)));
  for (const r of all) {
    if (dbWords.has(r.w)) updated++;
    else missing.push(r.w);
  }
}

console.log(`mode: ${dry ? 'DRY' : 'UPDATE'}`);
console.log(`matched: ${updated} / ${all.length}`);
if (missing.length) console.log('NOT MATCHED:\n' + missing.join('\n'));
