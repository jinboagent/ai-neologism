import { vi } from "vitest";

export type FakeSearchResult = { title: string; url: string; snippet: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Build a DuckDuckGo HTML results page in the exact shape src/lib/search.ts scrapes:
 * an anchor with class="result__a" carrying the href and title, followed by the snippet anchor.
 */
export function ddgHtml(results: FakeSearchResult[], opts: { viaRedirect?: boolean } = {}): string {
  const blocks = results
    .map((r, i) => {
      const href = opts.viaRedirect
        ? `//duckduckgo.com/l/?uddg=${encodeURIComponent(r.url)}&rut=${i}`
        : escapeHtml(r.url);
      return (
        `<div class="result results_links">` +
        `<a rel="nofollow" class="result__a" href="${href}">${r.title}</a>` +
        `<a class="result__snippet" href="${href}">${r.snippet}</a>` +
        `</div>`
      );
    })
    .join("\n");
  return `<html><body><div id="links">${blocks}</div></body></html>`;
}

/** What DuckDuckGo serves instead of results when it rate-limits or challenges a client. */
export const DDG_ANOMALY_HTML = `<html><body><div class="anomaly">
If this persists, please email us at support@duckduckgo.com and let us know.</div></body></html>`;

export const DDG_NO_RESULTS_HTML = `<html><body><div id="links">
<div class="no-results">No results found for your query.</div></div></body></html>`;

export type SearchBehaviour =
  | { html: string; status?: number }
  | { throws: Error | string };

/** A fixed response, or one chosen per query (verify.ts runs a three-query plan). */
export type SearchPlan = SearchBehaviour | ((query: string) => SearchBehaviour);

export type DictionaryBehaviour =
  | { status: number; json?: unknown }
  | { throws: Error | string };

export type FetchPlan = {
  search?: SearchPlan;
  dictionary?: DictionaryBehaviour;
  tavily?: { status?: number; json?: unknown };
  /** Catch-all for any other URL (used by the AI and link-fetch tests). */
  other?: (url: string, init?: RequestInit) => Response | Promise<Response>;
};

function response(body: string, status: number, type = "text/html"): Response {
  return new Response(body, { status, headers: { "Content-Type": type } });
}

/**
 * Replace global fetch with a router keyed by hostname. Every adapter in src/lib
 * reaches the network through fetch, so this is the single control point.
 */
export function mockFetch(plan: FetchPlan = {}) {
  const calls: { url: string; method: string; body?: string }[] = [];

  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({
      url,
      method: (init?.method ?? (typeof input === "object" && !(input instanceof URL) ? input.method : "GET")) ?? "GET",
      body,
    });

    if (url.includes("html.duckduckgo.com")) {
      const query = new URLSearchParams(body ?? "").get("q") ?? "";
      const s = typeof plan.search === "function" ? plan.search(query) : (plan.search ?? { html: ddgHtml([]) });
      if ("throws" in s) throw typeof s.throws === "string" ? new Error(s.throws) : s.throws;
      return response(s.html, s.status ?? 200);
    }

    if (url.includes("api.tavily.com")) {
      const t = plan.tavily ?? { status: 200, json: { results: [] } };
      return response(JSON.stringify(t.json ?? {}), t.status ?? 200, "application/json");
    }

    if (url.includes("dictionaryapi.dev")) {
      const d = plan.dictionary ?? { status: 404 };
      if ("throws" in d) throw typeof d.throws === "string" ? new Error(d.throws) : d.throws;
      return response(JSON.stringify(d.json ?? []), d.status, "application/json");
    }

    if (plan.other) return plan.other(url, init);
    return response("", 404);
  });

  vi.stubGlobal("fetch", impl);
  return { impl, calls };
}

/** A dictionaryapi.dev 200 payload carrying the given definition strings. */
export function dictionaryPayload(senses: string[], word = "probe") {
  return [
    {
      word,
      meanings: senses.map((definition) => ({
        partOfSpeech: "noun",
        definitions: [{ definition }],
      })),
    },
  ];
}
