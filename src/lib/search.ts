// Web search adapter for novelty verification.
// Default: keyless DuckDuckGo HTML (best-effort). Optional: Tavily if SEARCH_PROVIDER=tavily.

export type SearchResult = { title: string; url: string; snippet: string };

/**
 * `ok` separates "the search ran and found nothing" from "the search did not run".
 * verify.ts depends on that distinction: a blocked or failed search must never be
 * reported as evidence of novelty.
 */
export type SearchOutcome = { results: SearchResult[]; ok: boolean };

const FAILED: SearchOutcome = { results: [], ok: false };

export async function searchWeb(query: string, maxResults = 8): Promise<SearchOutcome> {
  if (process.env.SEARCH_PROVIDER === "tavily" && process.env.TAVILY_API_KEY) {
    return tavilySearch(query, maxResults);
  }
  return duckduckgoSearch(query, maxResults);
}

async function tavilySearch(query: string, maxResults: number): Promise<SearchOutcome> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
      }),
    });
    if (!res.ok) return FAILED;
    const data = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
    const results = (Array.isArray(data.results) ? data.results : []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
    return { results, ok: true };
  } catch {
    return FAILED;
  }
}

// DuckDuckGo serves an HTTP 200 challenge page instead of results when it rate-limits
// a client. It carries no result anchors, so without this check it is indistinguishable
// from a genuine "nothing found".
const ANOMALY_RE = /anomaly|if this persists|please let us know|not a robot|are you human/i;

async function duckduckgoSearch(query: string, maxResults: number): Promise<SearchOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Neologism/1.0",
      },
      body: new URLSearchParams({ q: query }).toString(),
      signal: controller.signal,
    });
    if (!res.ok) return FAILED;
    const html = await res.text();

    const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const links = [...html.matchAll(linkRe)];
    const snippets = [...html.matchAll(snippetRe)];

    if (links.length === 0) {
      return snippets.length === 0 && ANOMALY_RE.test(html) ? FAILED : { results: [], ok: true };
    }

    const results: SearchResult[] = [];
    let cursor = 0;
    for (const lm of links) {
      if (results.length >= maxResults) break;
      const href = decodeDdgHref(lm[1]);
      if (!href) continue;
      // Pair each link with the first snippet appearing after it in the document.
      // Zipping the two lists by index desyncs whenever DuckDuckGo inserts a block
      // (ad, video, related search) that carries one anchor but not the other.
      while (cursor < snippets.length && (snippets[cursor].index ?? 0) < (lm.index ?? 0)) cursor += 1;
      results.push({
        title: stripTags(lm[2]),
        url: href,
        snippet: snippets[cursor] ? stripTags(snippets[cursor][1]) : "",
      });
      cursor += 1;
    }
    return { results, ok: true };
  } catch {
    return FAILED;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeDdgHref(href: string): string | null {
  const match = href.match(/[?&]uddg=([^&]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  if (href.startsWith("http")) return href;
  return null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
