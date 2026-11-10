// UD + Wiktionary sweep over published batch words.
// Catches dictionary-entry collisions the review passes' web searches missed
// (the necroping / thermocracy class). Writes a JSON of hits for adjudication.
//
//   node scripts/batch/ud-sweep.mjs
//
// Reads words directly from the local DB (status='published', input_type='batch').
// UD: api.urbandictionary.com/v0/define?term=X (per word).
// Wiktionary: en.wiktionary.org API, 50 titles per query (exact title exists?).

import { createClient } from "@libsql/client";

const db = createClient({ url: `file:data/ai-neologism.db`.replace(/\\/g, "/") });
const r = await db.execute("SELECT word FROM words WHERE status='published' AND input_type='batch' ORDER BY word");
const words = r.rows.map((x) => x.word);
console.log(`sweeping ${words.length} published batch words…`);

const udHits = [];
let done = 0;
const CONC = 10;
// reuse a previous UD pass if present (the UD section is word-keyed and stable)
let prior = null;
try { prior = JSON.parse(fs.readFileSync("wordstoreview/ud-sweep-results.json", "utf8")); } catch {}
if (prior && Array.isArray(prior.udHits)) {
  udHits.push(...prior.udHits);
  console.log(`UD: reused ${udHits.length} hits from previous sweep`);
} else {
const queue = [...words];
await Promise.all(Array.from({ length: CONC }, async () => {
  const udOne = async (word) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j.list && j.list.length > 0) {
        udHits.push({ word, definitions: j.list.slice(0, 2).map((d) => d.definition.replace(/[\r\n]+/g, " ").slice(0, 220)) });
      }
      done++;
      if (done % 100 === 0) console.log(`  UD ${done}/${words.length}`);
      return;
    } catch (e) {
      if (attempt === 2) console.log(`  UD FAIL ${word}: ${e.message}`);
      else await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
  };
  while (queue.length) await udOne(queue.shift());
}));
}

// Wiktionary in batches of 50 titles (first letter capitalized per title rules).
// formatversion=2 so missing pages carry a boolean `missing: true`.
const wtHits = [];
for (let i = 0; i < words.length; i += 50) {
  const chunk = words.slice(i, i + 50);
  const titles = chunk.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("|");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://en.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&titles=${encodeURIComponent(titles)}`);
      const j = await res.json();
      for (const page of j.query.pages) {
        if (!("missing" in page)) wtHits.push({ word: page.title.toLowerCase(), note: "Wiktionary entry exists" });
      }
      break;
    } catch (e) {
      if (attempt === 2) console.log(`  WT FAIL batch ${i}: ${e.message}`);
      else await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
}

import fs from "node:fs";
fs.writeFileSync("wordstoreview/ud-sweep-results.json", JSON.stringify({ udHits, wtHits, sweptAt: new Date().toISOString() }, null, 2));
console.log(`\nUD hits: ${udHits.length}  |  Wiktionary hits: ${wtHits.length}`);
for (const h of udHits) console.log(`  UD  ${h.word}: ${h.definitions[0]}`);
for (const h of wtHits) console.log(`  WT  ${h.word}`);
