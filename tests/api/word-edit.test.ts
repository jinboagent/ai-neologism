import { beforeEach, describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/words/[slug]/route";
import { getDb } from "@/lib/db";
import { hashKey } from "@/lib/keys";
import { fetchWordRow, insertKey, insertWord, resetDb } from "../helpers/db";

beforeEach(() => {
  resetDb();
});

let seq = 0;
/** A fresh key per test also gives a fresh `edit:` rate-limit bucket. */
function makeKey(acceptedWords = 0): string {
  const key = `ck_edit_${++seq}_${"0".repeat(30)}`;
  insertKey(hashKey(key), acceptedWords);
  return key;
}

type Ctx = { params: Promise<{ slug: string }> };
const ctx = (slug: string): Ctx => ({ params: Promise.resolve({ slug }) });

function put(slug: string, body: unknown, key?: string): Request {
  return new Request(`http://localhost/api/words/${slug}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-Contribution-Key": key } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });
}

function get(slug: string, key?: string): Request {
  return new Request(`http://localhost/api/words/${slug}`, {
    headers: key ? { "X-Contribution-Key": key } : {},
  });
}

const GOOD_DEFINITION = "A revised definition that is comfortably within bounds.";

describe("GET /api/words/[slug]", () => {
  beforeEach(() => {
    insertWord({ slug: "pub", word: "pub", status: "published" });
    insertWord({ slug: "queue", word: "queue", status: "in_review", contributor_key_hash: hashKey("ck_owner") });
  });

  it("returns a published word to an anonymous caller", async () => {
    const res = await GET(get("pub"), ctx("pub"));
    expect(res.status).toBe(200);
    expect((await res.json()).word.slug).toBe("pub");
  });

  it("returns 404 for a queued word to an anonymous caller", async () => {
    const res = await GET(get("queue"), ctx("queue"));
    expect(res.status).toBe(404);
  });

  it("returns a queued word to its contributor", async () => {
    const res = await GET(get("queue", "ck_owner"), ctx("queue"));
    expect(res.status).toBe(200);
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await GET(get("nope"), ctx("nope"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/words/[slug] · authentication", () => {
  let owner: string;

  beforeEach(() => {
    owner = makeKey(0);
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });
  });

  it("requires a contribution key", async () => {
    const res = await PUT(put("pub", { definition: GOOD_DEFINITION }), ctx("pub"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("NO_KEY");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await PUT(put("nope", { definition: GOOD_DEFINITION }, owner), ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("rejects a malformed body from an authorised editor", async () => {
    const res = await PUT(put("pub", "{broken", owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_JSON");
  });

  it("checks authorization before parsing the body", async () => {
    // An unrelated caller gets 403 rather than a 400 that would leak validation rules.
    const stranger = makeKey(0);
    const res = await PUT(put("pub", "{broken", stranger), ctx("pub"));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/words/[slug] · authorization", () => {
  it("refuses to let an unrelated key holder edit a published word", async () => {
    // Regression: the guard was `contributor_key_hash !== key && status !== 'published'`,
    // so for any published word the second clause was false and the whole check passed.
    // Anyone could POST /api/key for a fresh key and rewrite every published entry.
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey("ck_real_owner") });
    const stranger = makeKey(0);

    const res = await PUT(put("pub", { definition: "Rewritten by a stranger." }, stranger), ctx("pub"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("FORBIDDEN");
    expect(fetchWordRow("pub")?.definition).not.toBe("Rewritten by a stranger.");
  });

  it("refuses to let an unrelated key holder edit a queued word", async () => {
    insertWord({ slug: "queue", word: "queue", status: "in_review", contributor_key_hash: hashKey("ck_real_owner") });
    const stranger = makeKey(0);

    const res = await PUT(put("queue", { definition: GOOD_DEFINITION }, stranger), ctx("queue"));
    expect(res.status).toBe(403);
  });

  it("allows the contributor to edit their own published word", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    const res = await PUT(put("pub", { definition: GOOD_DEFINITION }, owner), ctx("pub"));
    expect(res.status).toBe(200);
    expect(fetchWordRow("pub")?.definition).toBe(GOOD_DEFINITION);
  });

  it("allows the contributor to edit their own queued word", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "queue", word: "queue", status: "in_review", contributor_key_hash: hashKey(owner) });

    const res = await PUT(put("queue", { definition: GOOD_DEFINITION }, owner), ctx("queue"));
    expect(res.status).toBe(200);
  });

  it("allows a reviewer who has met the threshold to edit someone else's word", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey("ck_someone_else") });
    const reviewer = makeKey(3);

    const res = await PUT(put("pub", { definition: GOOD_DEFINITION }, reviewer), ctx("pub"));
    expect(res.status).toBe(200);
  });

  it("refuses a reviewer one accepted word short of the threshold", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey("ck_someone_else") });
    const almost = makeKey(2);

    const res = await PUT(put("pub", { definition: GOOD_DEFINITION }, almost), ctx("pub"));
    expect(res.status).toBe(403);
  });

  it("does not treat a key that was never issued as a reviewer", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey("ck_someone_else") });

    const res = await PUT(put("pub", { definition: GOOD_DEFINITION }, "ck_forged_and_unissued"), ctx("pub"));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/words/[slug] · validation", () => {
  let owner: string;

  beforeEach(() => {
    owner = makeKey(0);
    insertWord({
      slug: "pub",
      word: "pub",
      status: "published",
      contributor_key_hash: hashKey(owner),
      definition: "An original definition of a reasonable length.",
      explanation: "Original explanation.",
    });
  });

  it("rejects a definition longer than the POST limit", async () => {
    // Regression: PUT applied no length bounds at all, so a word accepted at
    // <=600 characters could later be rewritten to any size.
    const res = await PUT(put("pub", { definition: "d".repeat(601) }, owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_DEFINITION");
    expect(fetchWordRow("pub")?.definition).toBe("An original definition of a reasonable length.");
  });

  it("rejects a definition shorter than the POST minimum", async () => {
    const res = await PUT(put("pub", { definition: "tiny" }, owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_DEFINITION");
  });

  it("accepts a definition at both boundaries", async () => {
    expect((await PUT(put("pub", { definition: "d".repeat(600) }, owner), ctx("pub"))).status).toBe(200);
    expect((await PUT(put("pub", { definition: "d".repeat(10) }, owner), ctx("pub"))).status).toBe(200);
  });

  it("rejects an over-long explanation", async () => {
    const res = await PUT(put("pub", { explanation: "e".repeat(4001) }, owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FIELD_TOO_LONG");
  });

  it("rejects an over-long why_this_word", async () => {
    const res = await PUT(put("pub", { why_this_word: "w".repeat(4001) }, owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FIELD_TOO_LONG");
  });

  it("rejects an over-long pronunciation", async () => {
    const res = await PUT(put("pub", { pronunciation: "p".repeat(121) }, owner), ctx("pub"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FIELD_TOO_LONG");
  });

  it("keeps the existing value when a field is omitted", async () => {
    await PUT(put("pub", { definition: GOOD_DEFINITION }, owner), ctx("pub"));
    expect(fetchWordRow("pub")?.explanation).toBe("Original explanation.");
  });

  it("keeps the existing value when a field is blank", async () => {
    await PUT(put("pub", { definition: GOOD_DEFINITION, explanation: "   " }, owner), ctx("pub"));
    expect(fetchWordRow("pub")?.explanation).toBe("Original explanation.");
  });
});

describe("PUT /api/words/[slug] · stored JSON resilience", () => {
  let owner: string;

  beforeEach(() => {
    owner = makeKey(0);
  });

  it("does not 500 when a stored JSON column is corrupt", async () => {
    // Regression: the handler called JSON.parse(row.alternatives_json) with no guard.
    insertWord({
      slug: "corrupt",
      word: "corrupt",
      status: "published",
      contributor_key_hash: hashKey(owner),
      alternatives_json: "{not json at all",
      categories_json: "",
    });

    const res = await PUT(put("corrupt", { definition: GOOD_DEFINITION }, owner), ctx("corrupt"));
    expect(res.status).toBe(200);
    expect(() => JSON.parse(fetchWordRow("corrupt")!.alternatives_json)).not.toThrow();
  });

  it("ignores a non-array alternatives payload instead of storing it verbatim", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    const res = await PUT(put("pub", { definition: GOOD_DEFINITION, alternatives: "DROP TABLE words" }, owner), ctx("pub"));
    expect(res.status).toBe(200);
    expect(fetchWordRow("pub")?.alternatives_json).toBe("[]");
  });

  it("caps list lengths on the way in", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    await PUT(
      put(
        "pub",
        {
          definition: GOOD_DEFINITION,
          alternatives: Array.from({ length: 30 }, (_, i) => ({ word: `a${i}`, rationale: "r" })),
          related_words: Array.from({ length: 30 }, (_, i) => `r${i}`),
        },
        owner
      ),
      ctx("pub")
    );
    const row = fetchWordRow("pub")!;
    expect(JSON.parse(row.alternatives_json)).toHaveLength(8);
    expect(JSON.parse(row.related_words)).toHaveLength(12);
  });
});

describe("PUT /api/words/[slug] · review workflow", () => {
  it("returns a 'returned' word to the review queue and clears the notes", async () => {
    const owner = makeKey(0);
    insertWord({
      slug: "sent-back",
      word: "sentback",
      status: "returned",
      contributor_key_hash: hashKey(owner),
    });
    getDb().prepare("UPDATE words SET return_notes = 'Needs a better definition.' WHERE slug = 'sent-back'").run();

    const res = await PUT(put("sent-back", { definition: GOOD_DEFINITION }, owner), ctx("sent-back"));
    expect(res.status).toBe(200);
    const row = fetchWordRow("sent-back");
    expect(row?.status).toBe("in_review");
    expect(row?.return_notes).toBeNull();
  });

  it("does not resurrect a declined word", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "dead", word: "dead", status: "declined", contributor_key_hash: hashKey(owner) });

    await PUT(put("dead", { definition: GOOD_DEFINITION }, owner), ctx("dead"));
    expect(fetchWordRow("dead")?.status).toBe("declined");
  });

  it("records a revision holding the pre-edit values", async () => {
    const owner = makeKey(0);
    insertWord({
      slug: "pub",
      word: "pub",
      status: "published",
      contributor_key_hash: hashKey(owner),
      definition: "The definition before the edit.",
    });

    await PUT(put("pub", { definition: GOOD_DEFINITION, summary: "Tightened wording" }, owner), ctx("pub"));
    const rev = getDb()
      .prepare("SELECT editor_key_hash, summary, snapshot_json FROM revisions ORDER BY id DESC LIMIT 1")
      .get() as { editor_key_hash: string; summary: string; snapshot_json: string };

    expect(rev.summary).toBe("Tightened wording");
    expect(rev.editor_key_hash).toBe(hashKey(owner));
    expect(JSON.parse(rev.snapshot_json).definition).toBe("The definition before the edit.");
  });

  it("truncates an absurdly long revision summary", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    await PUT(put("pub", { definition: GOOD_DEFINITION, summary: "s".repeat(5000) }, owner), ctx("pub"));
    const rev = getDb().prepare("SELECT summary FROM revisions ORDER BY id DESC LIMIT 1").get() as { summary: string };
    expect(rev.summary.length).toBeLessThanOrEqual(200);
  });

  it("returns the updated word in the response", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    const body = await (await PUT(put("pub", { definition: GOOD_DEFINITION }, owner), ctx("pub"))).json();
    expect(body.word.definition).toBe(GOOD_DEFINITION);
  });
});

describe("PUT /api/words/[slug] · rate limiting", () => {
  it("allows thirty edits per key per hour, then returns 429", async () => {
    const owner = makeKey(0);
    insertWord({ slug: "pub", word: "pub", status: "published", contributor_key_hash: hashKey(owner) });

    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await PUT(put("pub", { definition: GOOD_DEFINITION }, owner), ctx("pub"));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
