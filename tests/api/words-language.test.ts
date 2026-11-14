import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/words/route";
import { fetchWordRow, insertWord, rawGet, rawRun, resetDb } from "../helpers/db";
import { DDG_NO_RESULTS_HTML, mockFetch } from "../helpers/fetch";

// Concept-family submission API (multilingual phase 3): language, concept_id,
// grammar validation, and the one-live-entry-per-concept-per-language 409.

beforeEach(async () => {
  await resetDb();
  vi.unstubAllGlobals();
  mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });
});

function post(body: unknown): Request {
  return new Request("http://localhost/api/words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validDe = (word = "Grauwäscherei", concept_id?: number) => ({
  word,
  definition: "Die Praxis, oberflächliche Wohltätigkeit zu betreiben.",
  language: "de",
  concept_id,
  grammar: { gender: "die", plural: "Grauwäschereien" },
  ai_assisted: true,
  input_type: "ai",
});

async function makeConcept(): Promise<number> {
  await rawRun("INSERT INTO concepts (label) VALUES ('graywashing')");
  const row = await rawGet<{ id: number }>("SELECT id FROM concepts LIMIT 1");
  return row!.id;
}

describe("POST /api/words · concept-family fields", () => {
  it("stores language, transliterated slug and grammar for a German entry", async () => {
    const res = await POST(post(validDe()));
    expect(res.status).toBe(202);
    const data = (await res.json()) as { slug: string };
    expect(data.slug).toBe("grauwaescherei"); // ä → ae (Duden transliteration)
    const row = await fetchWordRow("grauwaescherei");
    expect(row?.language).toBe("de");
    expect(row?.concept_id).toBeNull();
    expect(JSON.parse(row?.grammar_json ?? "{}")).toEqual({ gender: "die", plural: "Grauwäschereien" });
  });

  it("rejects an unknown language", async () => {
    const res = await POST(post({ word: "whatever", definition: "A definition that is long enough.", language: "xx" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("BAD_LANGUAGE");
  });

  it("rejects a non-English entry without valid grammar", async () => {
    const noGrammar = await POST(post({ word: "Etwaswort", definition: "Eine Definition, die lang genug ist.", language: "de" }));
    expect(noGrammar.status).toBe(400);
    expect(((await noGrammar.json()) as { error: string }).error).toBe("INVALID_GRAMMAR");

    const badGender = await POST(post({ ...validDe("Falschwort"), grammar: { gender: "banana", plural: "Falschwörter" } }));
    expect(badGender.status).toBe(400);
    expect(((await badGender.json()) as { error: string }).error).toBe("INVALID_GRAMMAR");
  });

  it("ignores grammar on English entries (keeps '{}')", async () => {
    const res = await POST(post({ word: "plainword", definition: "A plain English definition.", grammar: { gender: "die", plural: "x" } }));
    expect(res.status).toBe(202);
    const row = await fetchWordRow("plainword");
    expect(row?.language).toBe("en");
    expect(row?.grammar_json).toBe("{}");
  });

  it("links concept_id when it exists and rejects unknown ids", async () => {
    const conceptId = await makeConcept();
    const ok = await POST(post(validDe(undefined, conceptId)));
    expect(ok.status).toBe(202);
    const row = await fetchWordRow("grauwaescherei");
    expect(row?.concept_id).toBe(conceptId);

    const bad = await POST(post(validDe("Grauwäscherei zwei", 424242)));
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe("INVALID_CONCEPT");
  });

  it("409s a second live entry for the same concept+language", async () => {
    const conceptId = await makeConcept();
    const first = await POST(post(validDe(undefined, conceptId)));
    expect(first.status).toBe(202);
    const second = await POST(post(validDe("Grauwäscherei zwei", conceptId)));
    expect(second.status).toBe(409);
    expect(((await second.json()) as { error: string }).error).toBe("CONCEPT_LANGUAGE_TAKEN");
  });
});

describe("GET /api/words · language filter", () => {
  it("filters by language and rejects unknown ones", async () => {
    // Published rows only — submissions land as in_review, so seed directly.
    await insertWord({ slug: "grauwaescherei", word: "Grauwäscherei", status: "published", language: "de" });
    await insertWord({ slug: "plainword", word: "plainword", status: "published" });

    const de = await GET(new Request("http://localhost/api/words?language=de"));
    const deData = (await de.json()) as { words: { language: string }[]; count: number };
    expect(deData.count).toBe(1);
    expect(deData.words[0].language).toBe("de");

    const all = await GET(new Request("http://localhost/api/words"));
    expect(((await all.json()) as { count: number }).count).toBe(2);

    const bad = await GET(new Request("http://localhost/api/words?language=xx"));
    expect(bad.status).toBe(400);
  });
});
