import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as keyRoute from "@/app/api/key/route";
import * as searchRoute from "@/app/api/search/route";
import * as popularityRoute from "@/app/api/popularity/route";
import * as verifyRoute from "@/app/api/coin/verify/route";
import * as candidatesRoute from "@/app/api/coin/candidates/route";
import { getDb } from "@/lib/db";
import { hashKey } from "@/lib/keys";
import { insertKey, insertWord, resetDb } from "../helpers/db";
import { DDG_NO_RESULTS_HTML, ddgHtml, dictionaryPayload, mockFetch } from "../helpers/fetch";

beforeEach(() => {
  resetDb();
  vi.unstubAllGlobals();
});

afterEach(() => {
  delete process.env.AI_API_KEY;
  delete process.env.SEARCH_PROVIDER;
  delete process.env.TAVILY_API_KEY;
});

let ipSeq = 0;
const clientIp = () => `203.0.113.${++ipSeq}`;
const headers = (extra: Record<string, string> = {}) => ({
  "x-forwarded-for": clientIp(),
  "user-agent": "EndpointTest/1.0",
  ...extra,
});

function jsonRequest(url: string, body?: unknown, hdrs: Record<string, string> = {}) {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? hdrs : { "Content-Type": "application/json", ...hdrs },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/key", () => {
  it("reports no key for an anonymous caller", async () => {
    const res = await keyRoute.GET(jsonRequest("http://localhost/api/key"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ has_key: false, review_threshold: 3 });
  });

  it("reports no key for a key that was never issued", async () => {
    const res = await keyRoute.GET(
      jsonRequest("http://localhost/api/key", undefined, { "X-Contribution-Key": "ck_forged" })
    );
    expect(await res.json()).toMatchObject({ has_key: false });
  });

  it("reports standing for an issued key", async () => {
    const key = "ck_issued_key_value";
    insertKey(hashKey(key), 2);

    const body = await (
      await keyRoute.GET(jsonRequest("http://localhost/api/key", undefined, { "X-Contribution-Key": key }))
    ).json();
    expect(body).toMatchObject({ has_key: true, accepted_words: 2, review_threshold: 3, can_review: false });
  });

  it("grants review rights at the threshold", async () => {
    const key = "ck_reviewer_key";
    insertKey(hashKey(key), 3);

    const body = await (
      await keyRoute.GET(jsonRequest("http://localhost/api/key", undefined, { "X-Contribution-Key": key }))
    ).json();
    expect(body.can_review).toBe(true);
  });
});

describe("POST /api/key", () => {
  it("issues a key with a 201 and a cookie", async () => {
    const res = await keyRoute.POST();
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.key).toMatch(/^ck_[0-9a-f]{48}$/);
    const cookie = res.headers.getSetCookie().join(";");
    expect(cookie).toContain("ck=");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=31536000/);
  });

  it("persists the issued key so /api/key recognises it afterwards", async () => {
    const { key } = await (await keyRoute.POST()).json();
    const status = await (
      await keyRoute.GET(jsonRequest("http://localhost/api/key", undefined, { "X-Contribution-Key": key }))
    ).json();
    expect(status).toMatchObject({ has_key: true, accepted_words: 0, can_review: false });
  });

  it("never stores the plaintext key", async () => {
    const { key } = await (await keyRoute.POST()).json();
    const rows = getDb().prepare("SELECT * FROM keys").all();
    expect(JSON.stringify(rows)).not.toContain(key);
  });

  it("issues a distinct key on every call", async () => {
    const a = await (await keyRoute.POST()).json();
    const b = await (await keyRoute.POST()).json();
    expect(a.key).not.toBe(b.key);
  });
});

describe("GET /api/search", () => {
  beforeEach(() => {
    insertWord({
      slug: "graywashing",
      word: "graywashing",
      status: "published",
      definition: "Superficial philanthropy masking a harmful record.",
    });
    insertWord({ slug: "hidden", word: "hiddenword", status: "in_review", definition: "philanthropy" });
  });

  it("finds a published word by name", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q=graywashing"))).json();
    expect(body.query).toBe("graywashing");
    expect(body.words.map((w: { slug: string }) => w.slug)).toEqual(["graywashing"]);
  });

  it("finds a published word by definition text", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q=philanthropy"))).json();
    expect(body.words.map((w: { slug: string }) => w.slug)).toEqual(["graywashing"]);
  });

  it("never surfaces unpublished words", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q=hiddenword"))).json();
    expect(body.words).toEqual([]);
  });

  it("short-circuits on a blank query", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q="))).json();
    expect(body).toEqual({ query: "", words: [] });
  });

  it("short-circuits on a missing q parameter", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search"))).json();
    expect(body.words).toEqual([]);
  });

  it("short-circuits on a whitespace-only query", async () => {
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q=%20%20"))).json();
    expect(body.words).toEqual([]);
  });

  it("survives FTS operator injection in the query string", async () => {
    for (const q of ['" OR word:*', "NEAR(a b)", "col:filter", "*)", "%", "_"]) {
      const res = await searchRoute.GET(jsonRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`));
      expect(res.status, `q=${q}`).toBe(200);
    }
  });

  it("caps the result count at thirty", async () => {
    for (let i = 0; i < 40; i++) {
      insertWord({ slug: `bulk${i}`, word: `bulkword${i}`, status: "published", definition: "shared definition token" });
    }
    const body = await (await searchRoute.GET(jsonRequest("http://localhost/api/search?q=shared"))).json();
    expect(body.words.length).toBeLessThanOrEqual(30);
  });
});

describe("GET /api/popularity", () => {
  beforeEach(() => {
    insertWord({ slug: "hot", word: "hot", status: "published", use_votes: 5, work_votes: 4, published_at: "2026-09-01 00:00:00" });
    insertWord({ slug: "loved", word: "loved", status: "published", use_votes: 20, published_at: "2026-08-01 00:00:00" });
    insertWord({ slug: "draft", word: "draft", status: "in_review", use_votes: 99 });
  });

  it("defaults to the trending lens", async () => {
    const body = await (await popularityRoute.GET(jsonRequest("http://localhost/api/popularity"))).json();
    expect(body.lens).toBe("trending");
  });

  it.each(["trending", "endorsed", "contested", "verified"])("serves the %s lens", async (lens) => {
    const res = await popularityRoute.GET(jsonRequest(`http://localhost/api/popularity?lens=${lens}`));
    expect(res.status).toBe(200);
    expect((await res.json()).lens).toBe(lens);
  });

  it("falls back to trending for an unknown lens instead of erroring", async () => {
    const body = await (await popularityRoute.GET(jsonRequest("http://localhost/api/popularity?lens=DROP+TABLE"))).json();
    expect(body.lens).toBe("trending");
    expect(Array.isArray(body.words)).toBe(true);
  });

  it("orders endorsed by adoption votes", async () => {
    const body = await (await popularityRoute.GET(jsonRequest("http://localhost/api/popularity?lens=endorsed"))).json();
    expect(body.words.map((w: { slug: string }) => w.slug)).toEqual(["loved", "hot"]);
  });

  it("never exposes unpublished words through any lens", async () => {
    for (const lens of ["trending", "endorsed", "contested", "verified", "bogus"]) {
      const body = await (await popularityRoute.GET(jsonRequest(`http://localhost/api/popularity?lens=${lens}`))).json();
      expect(body.words.map((w: { slug: string }) => w.slug), lens).not.toContain("draft");
    }
  });
});

describe("POST /api/coin/verify", () => {
  const call = (body: unknown) =>
    verifyRoute.POST(jsonRequest("http://localhost/api/coin/verify", body, headers()));

  it("rejects malformed JSON", async () => {
    const res = await call("{broken");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_JSON");
  });

  it("rejects a word shorter than two characters", async () => {
    const res = await call({ word: "x", definition: "A definition long enough to pass." });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_INPUT");
  });

  it("rejects a definition shorter than ten characters", async () => {
    const res = await call({ word: "zephquake", definition: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing body", async () => {
    const res = await call({});
    expect(res.status).toBe(400);
  });

  it("returns a verification verdict without writing to the database", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });

    const res = await call({ word: "zephquake", definition: "A sudden tremor of public confidence." });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.word).toBe("zephquake");
    expect(body.verification.verdict).toBe("NEW");
    expect((getDb().prepare("SELECT COUNT(*) AS n FROM words").get() as { n: number }).n).toBe(0);
  });

  it("reports UNVERIFIED when the search provider is unreachable", async () => {
    mockFetch({ search: { throws: "down" }, dictionary: { status: 404 } });

    const body = await (await call({ word: "zephquake", definition: "A sudden tremor of confidence." })).json();
    expect(body.verification.verdict).toBe("UNVERIFIED");
  });

  it("rate limits a single fingerprint to fifteen runs per hour", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });
    const hdrs = headers();
    const body = { word: "zephquake", definition: "A sudden tremor of public confidence." };

    const statuses: number[] = [];
    for (let i = 0; i < 16; i++) {
      statuses.push((await verifyRoute.POST(jsonRequest("http://localhost/api/coin/verify", body, hdrs))).status);
    }
    expect(statuses.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(statuses[15]).toBe(429);
  });
});

describe("POST /api/coin/candidates", () => {
  const call = (body: unknown) =>
    candidatesRoute.POST(jsonRequest("http://localhost/api/coin/candidates", body, headers()));

  beforeEach(() => {
    delete process.env.AI_API_KEY;
  });

  const MATERIAL = "Workers describe seeing the notification and choosing, for hours, not to open it.";

  it("rejects malformed JSON", async () => {
    const res = await call("{broken");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_JSON");
  });

  it("rejects material shorter than sixty characters", async () => {
    const res = await call({ text: "too short" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("MATERIAL_TOO_SHORT");
  });

  it("reports 503 when no AI provider is configured", async () => {
    const res = await call({ text: MATERIAL });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("AI_NOT_CONFIGURED");
  });

  it("refuses to fetch an internal address supplied as a link", async () => {
    const { calls } = mockFetch({ other: () => new Response("<p>internal</p>", { status: 200 }) });

    const res = await call({ url: "http://169.254.169.254/latest/meta-data/" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_URL");
    expect(calls).toHaveLength(0);
  });

  it("refuses a link that redirects to an internal address", async () => {
    const { calls } = mockFetch({
      other: (url) =>
        url.includes("public.example")
          ? new Response("", { status: 302, headers: { Location: "http://127.0.0.1:3000/api/words" } })
          : new Response("internal", { status: 200 }),
    });

    const res = await call({ url: "https://public.example/article" });
    expect(res.status).toBe(400);
    expect(calls.some((c) => c.url.includes("127.0.0.1"))).toBe(false);
  });

  it("treats an unreadable link as a client error, not a server fault", async () => {
    mockFetch({ other: () => new Response("gone", { status: 404 }) });

    const res = await call({ url: "https://example.com/missing" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FETCH_404");
  });

  it("still rejects material that is too short after a successful fetch", async () => {
    mockFetch({ other: () => new Response("<p>tiny</p>", { status: 200 }) });

    const res = await call({ url: "https://example.com/short" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("MATERIAL_TOO_SHORT");
  });

  it("rate limits a single fingerprint to ten requests per hour", async () => {
    const hdrs = headers();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await candidatesRoute.POST(jsonRequest("http://localhost/api/coin/candidates", { text: MATERIAL }, hdrs))).status
      );
    }
    expect(statuses[10]).toBe(429);
  });
});

describe("search adapter wiring", () => {
  it("uses Tavily when configured, for the verification endpoint too", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "tvly_test";
    const { calls } = mockFetch({
      tavily: { json: { results: [{ title: "t", url: "https://t.example", content: "zephquake body" }] } },
      dictionary: { status: 404 },
    });

    await verifyRoute.POST(
      jsonRequest("http://localhost/api/coin/verify", { word: "zephquake", definition: "A sudden tremor of confidence." }, headers())
    );
    expect(calls.some((c) => c.url.includes("api.tavily.com"))).toBe(true);
  });

  it("passes the dictionary senses into the verdict", async () => {
    mockFetch({
      search: { html: ddgHtml([]) },
      dictionary: { status: 200, json: dictionaryPayload(["A tremor of public confidence caused by disclosure."], "zephquake") },
    });

    const body = await (
      await verifyRoute.POST(
        jsonRequest("http://localhost/api/coin/verify", { word: "zephquake", definition: "A sudden tremor of public confidence." }, headers())
      )
    ).json();
    expect(body.verification.verdict).toBe("EXISTS");
  });
});
