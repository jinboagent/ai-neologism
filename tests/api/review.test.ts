import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/review/route";
import { getDb } from "@/lib/db";
import { hashKey } from "@/lib/keys";
import { insertKey, insertWord, resetDb } from "../helpers/db";

beforeEach(() => {
  resetDb();
});

let seq = 0;
function makeKey(acceptedWords = 0): string {
  const key = `ck_review_${++seq}_${"0".repeat(28)}`;
  insertKey(hashKey(key), acceptedWords);
  return key;
}

function req(body?: unknown, key?: string): Request {
  return new Request("http://localhost/api/review", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "X-Contribution-Key": key } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

function reviewRow(slug: string) {
  return getDb()
    .prepare("SELECT r.action, r.reason, r.reviewer_key_hash FROM reviews r JOIN words w ON w.id = r.word_id WHERE w.slug = ?")
    .all(slug) as { action: string; reason: string; reviewer_key_hash: string }[];
}

describe("GET /api/review · gate", () => {
  it("refuses an anonymous caller", async () => {
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("REVIEW_RIGHTS_REQUIRED");
  });

  it("refuses a contributor below the threshold", async () => {
    const res = await GET(req(undefined, makeKey(2)));
    expect(res.status).toBe(403);
  });

  it("refuses a key that was never issued", async () => {
    const res = await GET(req(undefined, "ck_forged"));
    expect(res.status).toBe(403);
  });

  it("serves the queue to a reviewer at the threshold", async () => {
    insertWord({ slug: "q1", word: "q1", status: "in_review" });
    const res = await GET(req(undefined, makeKey(3)));
    expect(res.status).toBe(200);
    expect((await res.json()).queue.map((w: { slug: string }) => w.slug)).toEqual(["q1"]);
  });
});

describe("GET /api/review · queue contents", () => {
  it("lists only words awaiting review, oldest first", async () => {
    insertWord({ slug: "newer", word: "newer", status: "in_review", created_at: "2026-09-02 00:00:00" });
    insertWord({ slug: "older", word: "older", status: "in_review", created_at: "2026-09-01 00:00:00" });
    insertWord({ slug: "pub", word: "pub", status: "published" });
    insertWord({ slug: "dead", word: "dead", status: "declined" });

    const body = await (await GET(req(undefined, makeKey(3)))).json();
    expect(body.queue.map((w: { slug: string }) => w.slug)).toEqual(["older", "newer"]);
  });

  it("flags a reviewer's own submissions so the UI can block them", async () => {
    const reviewer = makeKey(3);
    insertWord({ slug: "theirs", word: "theirs", status: "in_review", contributor_key_hash: hashKey("ck_other") });
    insertWord({ slug: "mine", word: "mine", status: "in_review", contributor_key_hash: hashKey(reviewer) });

    const body = await (await GET(req(undefined, reviewer))).json();
    const flags = Object.fromEntries(body.queue.map((w: { slug: string; is_own: boolean }) => [w.slug, w.is_own]));
    expect(flags).toEqual({ theirs: false, mine: true });
  });

  it("returns an empty queue rather than an error when nothing is pending", async () => {
    const body = await (await GET(req(undefined, makeKey(3)))).json();
    expect(body.queue).toEqual([]);
  });

  it("hydrates the verification package for the reviewer", async () => {
    insertWord({
      slug: "v",
      word: "v",
      status: "in_review",
      verification_json: JSON.stringify({ verdict: "UNVERIFIED", note: "search was down" }),
    });

    const body = await (await GET(req(undefined, makeKey(3)))).json();
    expect(body.queue[0].verification).toEqual({ verdict: "UNVERIFIED", note: "search was down" });
  });
});

describe("POST /api/review · decisions", () => {
  it("publishes a word on approve and stamps published_at", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review", contributor_key_hash: hashKey("ck_author") });

    const res = await POST(req({ slug: "q", action: "approve", reason: "Evidence log is complete." }, makeKey(3)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ slug: "q", action: "approve", status: "published" });

    const row = getDb().prepare("SELECT status, published_at FROM words WHERE slug = 'q'").get() as {
      status: string;
      published_at: string | null;
    };
    expect(row.status).toBe("published");
    expect(row.published_at).not.toBeNull();
  });

  it("credits the contributor's accepted-word count on approve", async () => {
    insertKey(hashKey("ck_author"), 1);
    insertWord({ slug: "q", word: "q", status: "in_review", contributor_key_hash: hashKey("ck_author") });

    await POST(req({ slug: "q", action: "approve", reason: "Looks good to me." }, makeKey(3)));
    const rec = getDb().prepare("SELECT accepted_words FROM keys WHERE key_hash = ?").get(hashKey("ck_author")) as {
      accepted_words: number;
    };
    expect(rec.accepted_words).toBe(2);
  });

  it("does not credit the reviewer's own count", async () => {
    const reviewer = makeKey(3);
    insertWord({ slug: "q", word: "q", status: "in_review", contributor_key_hash: hashKey("ck_author") });

    await POST(req({ slug: "q", action: "approve", reason: "Looks good to me." }, reviewer));
    const rec = getDb().prepare("SELECT accepted_words FROM keys WHERE key_hash = ?").get(hashKey(reviewer)) as {
      accepted_words: number;
    };
    expect(rec.accepted_words).toBe(3);
  });

  it("returns a word to the contributor on request_changes, with notes", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });

    const res = await POST(req({ slug: "q", action: "request_changes", reason: "Definition is circular." }, makeKey(3)));
    expect((await res.json()).status).toBe("returned");

    const row = getDb().prepare("SELECT status, return_notes FROM words WHERE slug = 'q'").get() as {
      status: string;
      return_notes: string | null;
    };
    expect(row).toEqual({ status: "returned", return_notes: "Definition is circular." });
  });

  it("declines a word and records the reason", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });

    const res = await POST(req({ slug: "q", action: "decline", reason: "Collides with an existing term." }, makeKey(3)));
    expect((await res.json()).status).toBe("declined");

    const row = getDb().prepare("SELECT status, return_notes FROM words WHERE slug = 'q'").get() as {
      status: string;
      return_notes: string | null;
    };
    expect(row.status).toBe("declined");
    expect(row.return_notes).toContain("Collides");
  });

  it("writes an audit row for every decision", async () => {
    const reviewer = makeKey(3);
    insertWord({ slug: "q", word: "q", status: "in_review" });

    await POST(req({ slug: "q", action: "approve", reason: "Verified by search." }, reviewer));
    expect(reviewRow("q")).toEqual([
      { action: "approve", reason: "Verified by search.", reviewer_key_hash: hashKey(reviewer) },
    ]);
  });

  it("leaves a declined word out of the public listing", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    await POST(req({ slug: "q", action: "decline", reason: "Not a coinage." }, makeKey(3)));
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM words WHERE status = 'published'").get()).toEqual({ n: 0 });
  });
});

describe("POST /api/review · guards", () => {
  it("refuses an anonymous decision", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    const res = await POST(req({ slug: "q", action: "approve", reason: "Fine by me." }));
    expect(res.status).toBe(403);
  });

  it("refuses a reviewer below the threshold", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    const res = await POST(req({ slug: "q", action: "approve", reason: "Fine by me." }, makeKey(0)));
    expect(res.status).toBe(403);
  });

  it("refuses to let a contributor approve their own word", async () => {
    const reviewer = makeKey(3);
    insertWord({ slug: "q", word: "q", status: "in_review", contributor_key_hash: hashKey(reviewer) });

    const res = await POST(req({ slug: "q", action: "approve", reason: "Self approving." }, reviewer));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("SELF_REVIEW");
    expect((getDb().prepare("SELECT status FROM words WHERE slug = 'q'").get() as { status: string }).status).toBe(
      "in_review"
    );
  });

  it("refuses to let a contributor decline their own word", async () => {
    const reviewer = makeKey(3);
    insertWord({ slug: "q", word: "q", status: "in_review", contributor_key_hash: hashKey(reviewer) });

    const res = await POST(req({ slug: "q", action: "decline", reason: "Self declining." }, reviewer));
    expect(res.status).toBe(403);
  });

  it("requires a reason of at least three characters", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    for (const reason of ["", "  ", "ab"]) {
      const res = await POST(req({ slug: "q", action: "approve", reason }, makeKey(3)));
      expect(res.status, `reason: "${reason}"`).toBe(400);
      expect((await res.json()).error).toBe("INVALID_REQUEST");
    }
  });

  it("requires slug and action", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    expect((await POST(req({ action: "approve", reason: "Looks fine." }, makeKey(3)))).status).toBe(400);
    expect((await POST(req({ slug: "q", reason: "Looks fine." }, makeKey(3)))).status).toBe(400);
  });

  it("rejects an unknown action", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    const res = await POST(req({ slug: "q", action: "publish_now", reason: "Looks fine." }, makeKey(3)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ACTION");
  });

  it("rejects a malformed body", async () => {
    const res = await POST(req("{broken", makeKey(3)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_JSON");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await POST(req({ slug: "nope", action: "approve", reason: "Looks fine." }, makeKey(3)));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the word has already left the queue", async () => {
    insertWord({ slug: "pub", word: "pub", status: "published" });
    const res = await POST(req({ slug: "pub", action: "approve", reason: "Looks fine." }, makeKey(3)));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("NOT_FOUND");
  });

  it("does not record a review row for a rejected decision", async () => {
    insertWord({ slug: "q", word: "q", status: "in_review" });
    await POST(req({ slug: "q", action: "approve", reason: "x" }, makeKey(3)));
    expect(reviewRow("q")).toEqual([]);
  });
});
