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

const db = await openDb();
const rows = (await db.execute(
  "SELECT slug, language, concept_id FROM words WHERE status = 'published' AND concept_id IS NOT NULL"
)).rows;

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

const out = path.join(ROOT, "src", "generated", "word-index.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(index));
console.log(`word-index: ${Object.keys(index).length} slugs -> ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
await db.close();
