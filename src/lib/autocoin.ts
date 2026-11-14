// Daily auto-coiner: harvests material from the seed queue (then built-in feeds),
// coins candidate words via the AI adapter, verifies novelty, and submits the
// survivors into the review queue — same gates as every other submission path.

import { qAll, qGet, qRun } from "./db";
import { aiConfigured, fetchUrlContent, generateCandidates } from "./ai";
import { badgeFromVerdict, verifyNovelty } from "./verify";
import { slugify, uniqueSlug, type Verification } from "./words";

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
  const materials: Material[] = [];

  const seedRows = await qAll<{ id: number; url: string; note: string }>(
    "SELECT id, url, note FROM seeds WHERE status = 'pending' ORDER BY id ASC LIMIT ?",
    [count * 2]
  );
  for (const s of seedRows) {
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

async function wordExists(word: string): Promise<boolean> {
  return !!(await qGet("SELECT 1 FROM words WHERE LOWER(word) = LOWER(?)", [word]));
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
    if (verification.verdict === "EXISTS" || (await wordExists(chosen.word))) {
      report.coined.push({ ok: false, from: material.from, error: `collision: "${chosen.word}" already exists` });
      continue;
    }

    // N6 (security report 2026-11-14): the auto-coin path selects its slug
    // outside a transaction (unlike POST /api/words), so two concurrent runs
    // can pick the same slug and the second INSERT hits the UNIQUE constraint.
    // Retry with a fresh slug instead of letting the exception abort the whole
    // cron run — the constraint itself already protects integrity.
    let slug = "";
    let wordId = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      slug = await uniqueSlug(chosen.word);
      try {
        const relatedSlugs: string[] = [];
        for (const w of chosen.related_concepts) {
          const s = slugify(w);
          if (s && (await qGet("SELECT 1 FROM words WHERE slug = ? AND status = 'published'", [s]))) relatedSlugs.push(s);
        }
        const info = await qRun(
          `INSERT INTO words (slug, word, pronunciation, definition, explanation, why_this_word,
        alternatives_json, verification_json, references_json, related_words, categories_json,
        ai_assisted, status, badge, input_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'in_review', ?, 'auto')`,
          [
            slug,
            chosen.word,
            chosen.pronunciation || null,
            chosen.suggested_definition,
            "",
            `${chosen.rationale}\n\nEtymology: ${chosen.etymology}`,
            JSON.stringify(others),
            JSON.stringify(verification),
            JSON.stringify(reference ? [reference] : []),
            // Related words are best-effort: keep only suggestions that name existing
            // entries, so no word page ever links into a 404.
            JSON.stringify(relatedSlugs),
            // Categories are pre-selected by the coiner (protocol §2 rule 9).
            JSON.stringify(chosen.categories),
            badgeFromVerdict(verification.verdict),
          ]
        );
        wordId = info.lastInsertRowid;
        break;
      } catch (e) {
        if (e instanceof Error && e.message.includes("UNIQUE constraint failed: words.slug") && attempt < 4) continue;
        throw e;
      }
    }
    await qRun("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, NULL, 'Auto-coined daily run', '{}')", [
      wordId,
    ]);

    // Bookkeeping: mark the seed this came from as coined.
    const seedMatch = material.from.match(/^seed#(\d+)$/);
    if (seedMatch) {
      await qRun("UPDATE seeds SET status = 'coined', slug = ?, updated_at = datetime('now') WHERE id = ?", [
        slug,
        Number(seedMatch[1]),
      ]);
    }

    report.coined.push({ ok: true, slug, word: chosen.word, verdict: verification.verdict, from: material.from });
  }

  return report;
}
