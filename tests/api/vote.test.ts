import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/words/[slug]/vote/route";
import { getDb } from "@/lib/db";
import { fetchWordRow, insertWord, resetDb } from "../helpers/db";

beforeEach(() => {
  resetDb();
  insertWord({ slug: "pub", word: "pub", status: "published" });
});

let ipSeq = 0;
/** A distinct IP per test gives each one a fresh `vote:` rate-limit bucket. */
const voter = () => ({ "x-forwarded-for": `203.0.113.${++ipSeq}`, "user-agent": `Voter/${ipSeq}` });

function vote(body: unknown, headers: Record<string, string> = voter(), slug = "pub"): [Request, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/words/${slug}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

const send = async (body: unknown, headers?: Record<string, string>, slug?: string) =>
  POST(...vote(body, headers, slug));

describe("POST /api/words/[slug]/vote · accepted votes", () => {
  it("records an adoption vote", async () => {
    const res = await send({ vote: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, use_votes: 1, work_votes: 0 });
  });

  it("records a needs-work vote", async () => {
    const res = await send({ vote: -1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, use_votes: 0, work_votes: 1 });
  });

  it("persists the totals onto the word", async () => {
    await send({ vote: 1 });
    expect(fetchWordRow("pub")).toMatchObject({ use_votes: 1, work_votes: 0 });
  });

  it("tallies distinct voters", async () => {
    await send({ vote: 1 });
    await send({ vote: 1 });
    await send({ vote: -1 });
    expect(fetchWordRow("pub")).toMatchObject({ use_votes: 2, work_votes: 1 });
  });

  it("withdraws a repeated vote from the same voter", async () => {
    const headers = voter();
    await send({ vote: 1 }, headers);
    const res = await send({ vote: 1 }, headers);
    expect(await res.json()).toEqual({ ok: true, use_votes: 0, work_votes: 0 });
  });

  it("counts the same voter twice for different words", async () => {
    insertWord({ slug: "other", word: "other", status: "published" });
    const headers = voter();
    await send({ vote: 1 }, headers, "pub");
    await send({ vote: 1 }, headers, "other");
    expect(fetchWordRow("pub")?.use_votes).toBe(1);
    expect(fetchWordRow("other")?.use_votes).toBe(1);
  });
});

describe("POST /api/words/[slug]/vote · rejected votes", () => {
  it.each([0, 2, -2, 1.5, NaN, Infinity])("rejects the numeric vote %s", async (value) => {
    const res = await send({ vote: value });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_VOTE");
  });

  it.each(["1", "-1", "yes", "", null, true, {}, [1], []])("rejects the non-numeric vote %j", async (value) => {
    // Number([1]) === 1, so the old coercion accepted an array as an upvote.
    const res = await send({ vote: value });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_VOTE");
  });

  it("rejects a body with no vote field", async () => {
    const res = await send({});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_VOTE");
  });

  it("reports malformed JSON distinctly from an invalid vote", async () => {
    const res = await send("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("BAD_JSON");
  });

  it("does not write a row for a rejected vote", async () => {
    await send({ vote: 0 });
    await send({ vote: [1] });
    expect((getDb().prepare("SELECT COUNT(*) AS n FROM votes").get() as { n: number }).n).toBe(0);
  });

  it("returns 404 for a word that is not published", async () => {
    insertWord({ slug: "queue", word: "queue", status: "in_review" });
    const res = await send({ vote: 1 }, voter(), "queue");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("NOT_FOUND");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await send({ vote: 1 }, voter(), "nope");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/words/[slug]/vote · rate limiting", () => {
  it("allows twenty votes per minute per fingerprint, then returns 429", async () => {
    const headers = voter();
    insertWord({ slug: "b", word: "b", status: "published" });

    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const res = await send({ vote: i % 2 === 0 ? 1 : -1 }, headers);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it("keeps separate budgets per fingerprint", async () => {
    const a = voter();
    for (let i = 0; i < 20; i++) await send({ vote: 1 }, a);
    expect((await send({ vote: 1 }, a)).status).toBe(429);
    expect((await send({ vote: 1 }, voter())).status).toBe(200);
  });

  it("does not record a vote once the rate limit is hit", async () => {
    const headers = voter();
    for (let i = 0; i < 20; i++) await send({ vote: i % 2 === 0 ? 1 : -1 }, headers);
    const before = fetchWordRow("pub");

    const res = await send({ vote: 1 }, headers);
    expect(res.status).toBe(429);
    expect(fetchWordRow("pub")).toMatchObject({ use_votes: before?.use_votes, work_votes: before?.work_votes });
  });
});
