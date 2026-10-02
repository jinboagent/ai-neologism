// Daily auto-coiner: harvests material from the seed queue (then built-in feeds),
// coins candidate words via the AI adapter, verifies novelty, and submits the
// survivors into the review queue — same gates as every other submission path.

import { getDb } from "./db";
import { aiConfigured, fetchUrlContent, generateCandidates } from "./ai";
import { badgeFromVerdict, verifyNovelty } from "./verify";
import { uniqueSlug, type Verification } from "./words";

export type CoinOutcome =
  | { ok: true; slug: string; word: string; verdict: string; from: string }
  | { ok: false; from: string; error: string };

export type CoinReport = {
  requested: number;
  coined: CoinOutcome[];
  error?: string;
};

// Fixed, code-owned sources — never user-supplied, so no SSRF surface here.
const FALLBACK_FEEDS = [
  { name: "r/neology", url: "https://www.reddit.com/r/neology/.rss" },
];

type Material = { from: string; url?: string; text: string };

async function gatherMaterial(count: number): Promise<Material[]> {
  const db = getDb();
  const materials: Material[] = [];

  const seeds = db
    .prepare("SELECT id, url, note FROM seeds WHERE status = 'pending' ORDER BY id ASC LIMIT ?")
    .all(count * 2) as { id: number; url: string; note: string }[];
  for (const s of seeds) {
    materials.push({ from: `seed#${s.id}`, url: s.url, text: s.note ?? "" });
  }

  if (materials.length >= count) return materials;

  for (const feed of FALLBACK_FEEDS) {
    try {
      const items = await fetchRssItems(feed.url, 10);
      for (const item of items) {
        if (materials.length >= count * 2) break;
        materials.push({ from: feed.name, text: `${item.title}\n\n${item.description}`.slice(0, 4000) });
      }
    } catch {
      // feed unreachable — skip it; the report shows whatever was coined
    }
  }
  return materials;
}

async function fetchRssItems(url: string, max: number): Promise<{ title: string; description: string; link: string }[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Neologism/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`FEED_${res.status}`);
  const xml = await res.text();
  const items: { title: string; description: string; link: string }[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && items.length < max) {
    const block = m[0];
    const pick = (tag: string) => {
      const t = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return t ? t[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
    };
    const title = pick("title");
    const link = pick("link");
    const description = pick("description");
    if (title) items.push({ title, description, link });
  }
  return items;
}

function wordExists(word: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM words WHERE LOWER(word) = LOWER(?)").get(word);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

/** Coin up to `count` words. Every submission lands in the review queue (input_type 'auto'). */
export async function coinDaily(count: number): Promise<CoinReport> {
  if (!aiConfigured()) {
    return { requested: count, coined: [], error: "AI_NOT_CONFIGURED" };
  }
  const db = getDb();
  const report: CoinReport = { requested: count, coined: [] };
  const materials = await gatherMaterial(count);

  for (const material of materials) {
    if (report.coined.length >= count) break;

    let text = material.text;
    let reference: { type: "news"; title: string; url: string; excerpt: string } | null = null;
    if (material.url) {
      try {
        const fetched = await fetchUrlContent(material.url);
        if (fetched.length >= 60) text = fetched;
        reference = {
          type: "news",
          title: domainOf(material.url),
          url: material.url,
          excerpt: fetched.slice(0, 180),
        };
      } catch {
        reference = null; // unreadable link — fall back to the stored text
      }
    }
    if (!text || text.length < 60) continue;

    let candidates: Awaited<ReturnType<typeof generateCandidates>>;
    try {
      candidates = await generateCandidates(text);
    } catch (e) {
      const code = e instanceof Error ? e.message : "AI_FAILED";
      if (code === "AI_NOT_CONFIGURED") {
        report.error = code;
        break;
      }
      report.coined.push({ ok: false, from: material.from, error: code });
      continue;
    }

    const chosen = candidates[0];
    if (!chosen) {
      report.coined.push({ ok: false, from: material.from, error: "AI returned no candidates" });
      continue;
    }

    const others = candidates.slice(1).map((c) => ({ word: c.word, rationale: c.rationale }));
    let verification: Verification;
    try {
      verification = await verifyNovelty(chosen.word, chosen.suggested_definition);
    } catch {
      verification = { verdict: "UNVERIFIED", note: "verification services unreachable during auto-coin run" };
    }
    if (verification.verdict === "EXISTS" || wordExists(chosen.word)) {
      report.coined.push({ ok: false, from: material.from, error: `collision: "${chosen.word}" already exists` });
      continue;
    }

    const slug = uniqueSlug(chosen.word);
    db.prepare(
      `INSERT INTO words (slug, word, definition, explanation, why_this_word,
        alternatives_json, verification_json, references_json,
        ai_assisted, status, badge, input_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'in_review', ?, 'auto')`
    ).run(
      slug,
      chosen.word,
      chosen.suggested_definition,
      "",
      `${chosen.rationale}\n\nEtymology: ${chosen.etymology}`,
      JSON.stringify(others),
      JSON.stringify(verification),
      JSON.stringify(reference ? [reference] : []),
      badgeFromVerdict(verification.verdict)
    );
    db.prepare("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, NULL, 'Auto-coined daily run', '{}')").run(
      (db.prepare("SELECT id FROM words WHERE slug = ?").get(slug) as { id: number }).id
    );

    // Bookkeeping: mark the seed this came from as coined.
    const seedMatch = material.from.match(/^seed#(\d+)$/);
    if (seedMatch) {
      db.prepare("UPDATE seeds SET status = 'coined', slug = ?, updated_at = datetime('now') WHERE id = ?").run(slug, Number(seedMatch[1]));
    }

    report.coined.push({ ok: true, slug, word: chosen.word, verdict: verification.verdict, from: material.from });
  }

  return report;
}
