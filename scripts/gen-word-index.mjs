// Generate src/generated/word-index.json: for every published word, the
// canonical slug in each concept-family language. The middleware uses this to
// redirect cross-language word URLs (e.g. /de/words/<en-slug>) to the right
// edition without the page renderer ever calling redirect() — which in
// Next 16 flips a route to dynamic rendering (see the 2026-11 Vercel outage).
//
// Runs at build time (package.json "prebuild"): reads Turso when build env
// vars are present (Vercel), the local file DB otherwise.
//
// Shape: { [slug]: { en?: string, de?: string, es?: string, fr?: string } }
import { createRequire } from "module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const { createClient } = require("@libsql/client");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

async function openDb() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    const { authToken } = process.env;
    console.log("word-index source: Turso");
    return createClient({ url, authToken });
  }
  console.log("word-index source: local file DB");
  return createClient({ url: "file:" + path.join(ROOT, "data", "ai-neologism.db").replace(/\\/g, "/") });
}

const OUT = path.join(ROOT, "src", "generated", "word-index.json");

// A committed word-index.json is the safety net: the Vercel build environment
// may not expose TURSO_AUTH_TOKEN to the build step (our 2026-11-28 deploy
// failed on a 401), and a fresh checkout has no local file DB. In those cases
// the last committed map ships as-is; regenerating requires a DB (Vercel with
// the token visible to builds, or any local checkout with data/ present).
function keepCommitted(reason) {
  if (fs.existsSync(OUT)) {
    console.log(`word-index: ${reason} — keeping the committed map (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
    process.exit(0);
  }
  console.error(`word-index: ${reason} and no committed map at src/generated/word-index.json — cannot continue`);
  process.exit(1);
}

let db;
try {
  db = await openDb();
} catch (e) {
  keepCommitted(`DB connection failed (${e.message.split(
)[0]})`);
}
let rows;
try {
  rows = (await db.execute(
    "SELECT slug, language, concept_id FROM words WHERE status = 'published' AND concept_id IS NOT NULL"
  )).rows;
} catch (e) {
  keepCommitted(`DB query failed (${e.message.split(
)[0]})`);
}

const langs = ["en", "de", "es", "fr"];
const byConcept = new Map();
for (const r of rows) {
  const cid = String(r.concept_id);
  if (!byConcept.has(cid)) byConcept.set(cid, {});
  byConcept.get(cid)[String(r.language)] = String(r.slug);
}

// Shape: { [slug]: { lang: string, fam: { en?: slug, de?: slug, es?: slug, fr?: slug } } }
// lang = the word's OWN language — the middleware needs it to tell "URL says
// /de but the word is English" (redirect) from "URL language matches" (pass).
const index = {};
for (const fam of byConcept.values()) {
  for (const l of langs) {
    const slug = fam[l];
    if (!slug) continue;
    index[slug] = { lang: l, fam: Object.fromEntries(langs.filter((x) => fam[x]).map((x) => [x, fam[x]])) };
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index));
console.log(`word-index: ${Object.keys(index).length} slugs -> ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
await db.close();
