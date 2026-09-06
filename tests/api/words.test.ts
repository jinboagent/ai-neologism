import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/words/route";
import { getDb } from "@/lib/db";
import { hashKey } from "@/lib/keys";
import { fetchWordRow, insertKey, insertWord, resetDb } from "../helpers/db";
import { DDG_NO_RESULTS_HTML, mockFetch } from "../helpers/fetch";

beforeEach(() => {
  resetDb();
  vi.unstubAllGlobals();
});

const NEW_VERIFICATION = { verdict: "NEW" as const, note: "supplied by test" };

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/words", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(query = "", headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/words${query}`, { headers });
}

const valid = (word = "zephquake", definition = "A sudden tremor of public confidence after a disclosure.") => ({
  word,
  definition,
  verification: NEW_VERIFICATION,
});

let keySeq = 0;
/** A distinct contribution key per call keeps the shared rate-limit buckets apart. */
const nextKey = () => `ck_test_${++keySeq}_${"0".repeat(32)}`;

describe("POST /api/words · validation", () => {
  it("rejects a body that is not valid JSON", async () => {
    const res = await POST(post("{not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "BAD_JSON" });
  });

  it("rejects a word shorter than the minimum", async () => {
    const res = await POST(post(valid("x")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_WORD");
  });

  it("rejects a word longer than the maximum", async () => {
    const res = await POST(post(valid("a".repeat(81))));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_WORD");
  });

  it("accepts a word at both length boundaries", async () => {
    expect((await POST(post(valid("ab")))).status).toBe(202);
    expect((await POST(post(valid("b".repeat(80))))).status).toBe(202);
  });

  it("rejects a definition shorter than the minimum", async () => {
    const res = await POST(post(valid("zephquake", "too short")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_DEFINITION");
  });

  it("rejects a definition longer than the maximum", async () => {
    const res = await POST(post(valid("zephquake", "d".repeat(601))));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_DEFINITION");
  });

  it("trims surrounding whitespace before validating", async () => {
    const res = await POST(post({ word: "  zephquake  ", definition: "  A tremor of public confidence.  ", verification: NEW_VERIFICATION }));
    expect(res.status).toBe(202);
    expect(fetchWordRow("zephquake")?.word).toBe("zephquake");
  });
});

describe("POST /api/words · contribution keys", () => {
  it("issues a key and sets a cookie when the caller has none", async () => {
    const res = await POST(post(valid()));
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.key).toMatch(/^ck_[0-9a-f]{48}$/);
    expect(res.headers.getSetCookie().some((c) => c.startsWith("ck="))).toBe(true);
    expect(res.headers.getSetCookie().join(";")).toMatch(/HttpOnly/i);
  });

  it("does not echo a key back when one was supplied", async () => {
    const key = nextKey();
    const res = await POST(post(valid(), { "X-Contribution-Key": key }));
    const body = await res.json();
    expect(body.key).toBeUndefined();
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("attributes the submission to the supplied key", async () => {
    const key = nextKey();
    await POST(post(valid(), { "X-Contribution-Key": key }));
    expect(fetchWordRow("zephquake")?.contributor_key_hash).toBe(hashKey(key));
  });

  it("does not crash on a key that was never issued", async () => {
    // Regression: the response read keys.accepted_words directly, and an unknown
    // header key has no row — the documented curl path returned a 500.
    const res = await POST(post(valid(), { "X-Contribution-Key": "ck_never_issued_by_this_server" }));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.accepted_words).toBe(0);
  });

  it("reports review_threshold from the same source as /api/key", async () => {
    const res = await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    expect((await res.json()).review_threshold).toBe(3);
  });
});

describe("POST /api/words · duplicates", () => {
  it("rejects a word that already exists", async () => {
    insertWord({ slug: "zephquake", word: "zephquake", status: "in_review" });
    const res = await POST(post(valid()));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("DUPLICATE_WORD");
  });

  it("matches duplicates case-insensitively", async () => {
    insertWord({ slug: "zephquake", word: "ZephQuake", status: "published" });
    const res = await POST(post(valid("ZEPHQUAKE")));
    expect(res.status).toBe(409);
  });

  it("allows resubmitting a word that was declined", async () => {
    insertWord({ slug: "zephquake", word: "zephquake", status: "declined" });
    const res = await POST(post(valid()));
    expect(res.status).toBe(202);
    expect((await res.json()).slug).toBe("zephquake-2");
  });

  it("creates one row, not two, when the same word is submitted twice", async () => {
    await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    const n = getDb().prepare("SELECT COUNT(*) AS n FROM words").get() as { n: number };
    expect(n.n).toBe(1);
  });
});

describe("POST /api/words · novelty gate", () => {
  it("blocks a submission whose verification verdict is EXISTS", async () => {
    const res = await POST(post({ ...valid(), verification: { verdict: "EXISTS" } }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("NAME_COLLISION");
    expect(body.verification.verdict).toBe("EXISTS");
    expect(fetchWordRow("zephquake")).toBeUndefined();
  });

  it("accepts NEAR_EXISTING and stamps the matching badge", async () => {
    const res = await POST(post({ ...valid(), verification: { verdict: "NEAR_EXISTING" } }));
    expect(res.status).toBe(202);
    expect((await res.json()).badge).toBe("near_existing");
    expect(fetchWordRow("zephquake")?.badge).toBe("near_existing");
  });

  it("accepts UNVERIFIED so a reviewer can inspect it, flagged", async () => {
    const res = await POST(post({ ...valid(), verification: { verdict: "UNVERIFIED" } }));
    expect(res.status).toBe(202);
    expect((await res.json()).badge).toBe("unverified");
  });

  it("runs the novelty search itself when no verification is supplied", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });
    const res = await POST(post({ word: "zephquake", definition: "A sudden tremor of public confidence." }));

    expect(res.status).toBe(202);
    expect(calls.some((c) => c.url.includes("duckduckgo"))).toBe(true);
    expect((await res.json()).badge).toBe("new");
  });

  it("re-runs verification when the supplied package has no verdict", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });
    const res = await POST(post({ word: "zephquake", definition: "A sudden tremor of confidence.", verification: { note: "no verdict" } as never }));

    expect(res.status).toBe(202);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("stores the word in the review queue rather than publishing it", async () => {
    await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    const row = fetchWordRow("zephquake");
    expect(row?.status).toBe("in_review");
    expect(row?.published_at).toBeNull();
  });

  it("writes an initial revision snapshot", async () => {
    await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    const rev = getDb()
      .prepare("SELECT summary, snapshot_json FROM revisions ORDER BY id DESC LIMIT 1")
      .get() as { summary: string; snapshot_json: string };
    expect(rev.summary).toBe("Initial submission");
    expect(JSON.parse(rev.snapshot_json)).toMatchObject({ word: "zephquake" });
  });
});

describe("POST /api/words · field limits", () => {
  it("caps the number of stored alternatives, references and related words", async () => {
    const res = await POST(
      post(
        {
          ...valid(),
          alternatives: Array.from({ length: 20 }, (_, i) => ({ word: `alt${i}`, rationale: "r" })),
          references: Array.from({ length: 20 }, (_, i) => ({ type: "news", title: `t${i}` })),
          related_words: Array.from({ length: 20 }, (_, i) => `rel${i}`),
          categories: Array.from({ length: 20 }, (_, i) => `cat${i}`),
        },
        { "X-Contribution-Key": nextKey() }
      )
    );
    expect(res.status).toBe(202);
    const row = fetchWordRow("zephquake");
    expect(JSON.parse(row!.alternatives_json)).toHaveLength(8);
    expect(JSON.parse(row!.references_json)).toHaveLength(12);
    expect(JSON.parse(row!.related_words)).toHaveLength(12);
    expect(JSON.parse(row!.categories_json)).toHaveLength(6);
  });

  it("defaults part_of_speech to noun and leaves pronunciation null", async () => {
    await POST(post(valid(), { "X-Contribution-Key": nextKey() }));
    const row = fetchWordRow("zephquake");
    expect(row?.part_of_speech).toBe("noun");
    expect(row?.pronunciation).toBeNull();
  });
});

describe("POST /api/words · rate limiting", () => {
  it("allows ten submissions per key per hour, then returns 429", async () => {
    const key = nextKey();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await POST(post(valid(`word${i}aaaa`, "A distinct definition for each submission."), {
        "X-Contribution-Key": key,
      }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
  });
});

describe("GET /api/words", () => {
  beforeEach(() => {
    insertWord({ slug: "a", word: "a", status: "published", published_at: "2026-01-01 00:00:00" });
    insertWord({ slug: "b", word: "b", status: "published", published_at: "2026-02-01 00:00:00" });
    insertWord({ slug: "c", word: "c", status: "in_review" });
  });

  it("lists published words only", async () => {
    const body = await (await GET(get())).json();
    expect(body.words.map((w: { slug: string }) => w.slug)).toEqual(["b", "a"]);
    expect(body.count).toBe(2);
  });

  it("paginates", async () => {
    const page2 = await (await GET(get("?page=2&limit=1"))).json();
    expect(page2.words.map((w: { slug: string }) => w.slug)).toEqual(["a"]);
    expect(page2.page).toBe(2);
  });

  it("clamps an oversized limit to 50", async () => {
    const body = await (await GET(get("?limit=5000"))).json();
    expect(body.words.length).toBeLessThanOrEqual(50);
  });

  it("clamps a nonsense page to 1 rather than returning nothing", async () => {
    const body = await (await GET(get("?page=-5"))).json();
    expect(body.page).toBe(1);
    expect(body.words).toHaveLength(2);
  });

  it("treats a non-numeric limit as the default instead of erroring", async () => {
    // Regression: Number("abc") is NaN, which reached LIMIT ? and threw SqliteError.
    const res = await GET(get("?limit=abc"));
    expect(res.status).toBe(200);
    expect((await res.json()).words).toHaveLength(2);
  });

  it("treats a non-numeric page as the first page instead of erroring", async () => {
    const res = await GET(get("?page=abc"));
    expect(res.status).toBe(200);
    expect((await res.json()).page).toBe(1);
  });

  it("treats a negative limit as the minimum", async () => {
    const res = await GET(get("?limit=-10"));
    expect(res.status).toBe(200);
    expect((await res.json()).words).toHaveLength(1);
  });

  it("requires a key for mine=1", async () => {
    const res = await GET(get("?mine=1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("NO_KEY");
  });

  it("returns only the caller's own submissions for mine=1", async () => {
    const key = nextKey();
    insertKey(hashKey(key), 0);
    insertWord({ slug: "mine", word: "mine", status: "in_review", contributor_key_hash: hashKey(key) });

    const body = await (await GET(get("?mine=1", { "X-Contribution-Key": key }))).json();
    expect(body.words.map((w: { slug: string }) => w.slug)).toEqual(["mine"]);
  });

  it("returns an empty list for a key with no submissions", async () => {
    const key = nextKey();
    insertKey(hashKey(key), 0);
    const body = await (await GET(get("?mine=1", { "X-Contribution-Key": key }))).json();
    expect(body.words).toEqual([]);
  });
});
