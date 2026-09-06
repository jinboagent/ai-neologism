import { afterEach, describe, expect, it, vi } from "vitest";
import { searchWeb } from "@/lib/search";
import {
  DDG_ANOMALY_HTML,
  DDG_NO_RESULTS_HTML,
  ddgHtml,
  dictionaryPayload,
  mockFetch,
} from "../helpers/fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SEARCH_PROVIDER;
  delete process.env.TAVILY_API_KEY;
});

const sample = [
  { title: "First Result", url: "https://example.com/a", snippet: "snippet about alpha" },
  { title: "Second Result", url: "https://example.com/b", snippet: "snippet about beta" },
  { title: "Third Result", url: "https://example.com/c", snippet: "snippet about gamma" },
];

describe("searchWeb · DuckDuckGo provider", () => {
  it("is the default provider when nothing is configured", async () => {
    const { calls } = mockFetch({ search: { html: ddgHtml(sample) } });
    await searchWeb("probe query");
    expect(calls[0].url).toContain("html.duckduckgo.com");
  });

  it("extracts title, url and snippet from each result block", async () => {
    mockFetch({ search: { html: ddgHtml(sample) } });
    const { results } = await searchWeb("anything");
    expect(results).toEqual(sample);
  });

  it("decodes uddg redirect hrefs back to the target URL", async () => {
    mockFetch({ search: { html: ddgHtml(sample, { viaRedirect: true }) } });
    const { results } = await searchWeb("anything");
    expect(results.map((r) => r.url)).toEqual(sample.map((r) => r.url));
  });

  it("caps the result count at maxResults", async () => {
    mockFetch({ search: { html: ddgHtml(sample) } });
    const { results } = await searchWeb("anything", 2);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.title)).toEqual(["First Result", "Second Result"]);
  });

  it("decodes HTML entities in titles and snippets", async () => {
    mockFetch({
      search: { html: ddgHtml([{ title: "Tom &amp; <b>Jerry</b>", url: "https://example.com", snippet: "it&#x27;s &quot;fine&quot;" }]) },
    });
    const { results } = await searchWeb("anything");
    expect(results[0].title).toBe("Tom & Jerry");
    expect(results[0].snippet).toBe(`it's "fine"`);
  });

  it("reports ok with zero results when the search genuinely found nothing", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML } });
    const outcome = await searchWeb("zzzzqqq");
    expect(outcome).toEqual({ results: [], ok: true });
  });

  it("reports ok:false on an HTTP error", async () => {
    mockFetch({ search: { html: "", status: 503 } });
    const outcome = await searchWeb("anything");
    expect(outcome.ok).toBe(false);
    expect(outcome.results).toEqual([]);
  });

  it("reports ok:false when the request throws", async () => {
    mockFetch({ search: { throws: "network down" } });
    const outcome = await searchWeb("anything");
    expect(outcome.ok).toBe(false);
  });

  it("reports ok:false on a rate-limit anomaly page rather than claiming zero results", async () => {
    // Regression: a challenge page carries no result anchors, so it used to look
    // identical to "searched and found nothing" — which verify.ts then scored as NEW.
    mockFetch({ search: { html: DDG_ANOMALY_HTML } });
    const outcome = await searchWeb("anything");
    expect(outcome.results).toEqual([]);
    expect(outcome.ok).toBe(false);
  });

  it("never lets a malformed uddg parameter throw", async () => {
    const html = `<a class="result__a" href="//duckduckgo.com/l/?uddg=%E0%A4%A">Bad</a>`;
    mockFetch({ search: { html } });
    await expect(searchWeb("anything")).resolves.not.toThrow();
  });

  it("sends the query as a form-encoded POST body", async () => {
    const { calls } = mockFetch({ search: { html: ddgHtml([]) } });
    await searchWeb("a b&c");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toBe("q=a+b%26c");
  });
});

describe("searchWeb · Tavily provider", () => {
  it("is selected when SEARCH_PROVIDER=tavily and a key is set", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_test";
    const { calls } = mockFetch({
      tavily: { json: { results: [{ title: "T", url: "https://t.example", content: "body" }] } },
    });

    const { results } = await searchWeb("anything");
    expect(calls[0].url).toContain("api.tavily.com");
    expect(results).toEqual([{ title: "T", url: "https://t.example", snippet: "body" }]);
  });

  it("falls back to DuckDuckGo when the provider is set but the key is missing", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    delete process.env.TAVILY_API_KEY;
    const { calls } = mockFetch({ search: { html: ddgHtml([]) } });

    await searchWeb("anything");
    expect(calls[0].url).toContain("html.duckduckgo.com");
  });

  it("reports ok:false when Tavily returns an error status", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_test";
    mockFetch({ tavily: { status: 401, json: { error: "bad key" } } });

    const outcome = await searchWeb("anything");
    expect(outcome).toEqual({ results: [], ok: false });
  });

  it("reports ok when Tavily answers with no results", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_test";
    mockFetch({ tavily: { json: { results: [] } } });

    expect(await searchWeb("anything")).toEqual({ results: [], ok: true });
  });

  it("passes the API key and query in the request body", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_secret";
    const { calls } = mockFetch({ tavily: { json: { results: [] } } });

    await searchWeb("my query", 4);
    const body = JSON.parse(calls[0].body ?? "{}");
    expect(body).toMatchObject({ api_key: "tvly_secret", query: "my query", max_results: 4 });
  });
});

describe("searchWeb · resilience", () => {
  it("does not reject when the response body is not the expected shape", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_test";
    mockFetch({ tavily: { json: { unexpected: true } } });

    await expect(searchWeb("anything")).resolves.toEqual({ results: [], ok: true });
  });

  it("returns results the caller can safely iterate", async () => {
    mockFetch({
      search: { html: ddgHtml(sample) },
      dictionary: { status: 200, json: dictionaryPayload(["x"]) },
    });
    const { results } = await searchWeb("anything", 8);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(8);
  });
});
