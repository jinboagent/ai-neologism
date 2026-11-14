// Extract published words + definitions for the funny/novelty backfill.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@libsql/client');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const db = createClient({ url: 'file:' + path.join(ROOT, 'data', 'ai-neologism.db') });

const r = await db.execute("SELECT word, definition FROM words WHERE status='published' ORDER BY id");
const rows = r.rows.map(x => ({ w: String(x.word), d: String(x.definition) }));
const out = path.join(ROOT, 'wordstoreview', 'backfill-745.json');
fs.writeFileSync(out, JSON.stringify(rows));
console.log('total:', rows.length);
console.log(rows.slice(0, 3).map(x => x.w + ' — ' + x.d).join('\n'));
