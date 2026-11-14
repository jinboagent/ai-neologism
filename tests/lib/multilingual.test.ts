import { beforeEach, describe, expect, it } from "vitest";
import { getWordFamily, hydrate, toPublic } from "@/lib/words";
import { fetchWordRow, insertWord, rawRun, resetDb } from "../helpers/db";

beforeEach(async () => {
  await resetDb();
});

async function setConcept(id: number, conceptId: number, language: string): Promise<void> {
  await rawRun("UPDATE words SET concept_id = ?, language = ? WHERE id = ?", [conceptId, language, id]);
}

describe("concept family (multilingual phase 1)", () => {
  it("orders a full family en → de → es → fr", async () => {
    const en = await insertWord({ slug: "graywashing", word: "graywashing", status: "published" });
    const de = await insertWord({ slug: "grauwaescherei", word: "Grauwäscherei", status: "published" });
    const es = await insertWord({ slug: "lavadogris", word: "lavadogris", status: "published" });
    const fr = await insertWord({ slug: "grisblanchiment", word: "grisblanchiment", status: "published" });
    await setConcept(en, 402, "en");
    await setConcept(de, 402, "de");
    await setConcept(es, 402, "es");
    await setConcept(fr, 402, "fr");
    const family = await getWordFamily(402);
    expect(family.map((m) => m.language)).toEqual(["en", "de", "es", "fr"]);
    expect(family.map((m) => m.word)).toEqual(["graywashing", "Grauwäscherei", "lavadogris", "grisblanchiment"]);
    expect(family[0].slug).toBe("graywashing");
  });

  it("keeps unpublished siblings out of the family", async () => {
    const en = await insertWord({ slug: "alpha-en", word: "alpha", status: "published" });
    const de = await insertWord({ slug: "alpha-de", word: "alphawort", status: "in_review" });
    const rejected = await insertWord({ slug: "alpha-fr", word: "motalpha", status: "rejected" });
    await setConcept(en, 7, "en");
    await setConcept(de, 7, "de");
    await setConcept(rejected, 7, "fr");
    expect((await getWordFamily(7)).map((m) => m.language)).toEqual(["en"]);
  });

  it("returns an empty family for entries without a concept", async () => {
    await insertWord({ slug: "lonely", word: "lonely", status: "published" });
    const row = await fetchWordRow("lonely");
    expect(row).toBeDefined();
    expect(await getWordFamily(null)).toEqual([]);
    expect(await getWordFamily(row!.concept_id ?? null)).toEqual([]);
  });

  it("blocks a second live entry for the same concept+language", async () => {
    const first = await insertWord({ slug: "graywashing", word: "graywashing", status: "published" });
    await setConcept(first, 1, "en");
    const second = await insertWord({ slug: "graywashing-2", word: "graywashing two", status: "published" });
    await expect(setConcept(second, 1, "en")).rejects.toThrow();
    // in_review counts as live too
    const queued = await insertWord({ slug: "graywashing-3", word: "graywashing three" });
    await expect(setConcept(queued, 1, "en")).rejects.toThrow();
  });

  it("permits siblings in other languages and rejected duplicates", async () => {
    const first = await insertWord({ slug: "graywashing", word: "graywashing", status: "published" });
    await setConcept(first, 1, "en");
    const de = await insertWord({ slug: "grauwaescherei", word: "Grauwäscherei", status: "published" });
    await expect(setConcept(de, 1, "de")).resolves.toBeUndefined();
    const rejected = await insertWord({ slug: "old-try", word: "oldtry", status: "rejected" });
    await expect(setConcept(rejected, 1, "en")).resolves.toBeUndefined();
  });

  it("hydrate exposes language, concept_id and parsed grammar; toPublic keeps them", async () => {
    await insertWord({
      slug: "g1",
      word: "Grauwäscherei",
      status: "published",
      language: "de",
      concept_id: 9,
      grammar_json: '{"gender":"die","plural":"Grauwäschereien"}',
    });
    const row = await fetchWordRow("g1");
    expect(row).toBeDefined();
    const w = hydrate(row!);
    expect(w.language).toBe("de");
    expect(w.concept_id).toBe(9);
    expect(w.grammar).toEqual({ gender: "die", plural: "Grauwäschereien" });
    expect("grammar_json" in w).toBe(false);
    const pub = toPublic(w);
    expect(pub.language).toBe("de");
    expect(pub.concept_id).toBe(9);
    expect("grammar_json" in pub).toBe(false);
    expect("contributor_key_hash" in pub).toBe(false);
  });
});
