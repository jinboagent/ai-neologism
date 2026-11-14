import { beforeEach, describe, expect, it } from "vitest";
import { alphabetWithCounts, countPublished, getWord, listByLetter, popularity, searchWords } from "@/lib/words";
import { insertWord, rawRun, resetDb } from "../helpers/db";

beforeEach(async () => {
  await resetDb();
});

// Seed a small bilingual dictionary: two published EN words, one published DE
// word, one in_review DE word.
async function seedBilingual() {
  const en1 = await insertWord({ slug: "graywashing", word: "graywashing", status: "published", definition: "washing in gray", language: "en" });
  const en2 = await insertWord({ slug: "doomspending", word: "doomspending", status: "published", definition: "spending out of dread", language: "en" });
  const de1 = await insertWord({ slug: "grauwaescherei", word: "Grauwäscherei", status: "published", definition: "Grauwaschen", language: "de" });
  const de2 = await insertWord({ slug: "dummwortschopf", word: "Dummwortschöpfung", language: "de" }); // in_review
  return { en1, en2, de1, de2 };
}

describe("per-language listing filters (multilingual phase 2)", () => {
  it("countPublished counts per language", async () => {
    await seedBilingual();
    expect(await countPublished()).toBe(3); // all languages
    expect(await countPublished("en")).toBe(2);
    expect(await countPublished("de")).toBe(1); // in_review word excluded
    expect(await countPublished("fr")).toBe(0);
  });

  it("alphabetWithCounts and listByLetter respect the language", async () => {
    await seedBilingual();
    const enLetters = await alphabetWithCounts("en");
    expect(enLetters).toEqual([
      { letter: "D", count: 1 },
      { letter: "G", count: 1 },
    ]);
    const deLetters = await alphabetWithCounts("de");
    expect(deLetters).toEqual([{ letter: "G", count: 1 }]); // in_review word not listed
    expect((await listByLetter("G", "en")).map((w) => w.slug)).toEqual(["graywashing"]);
    expect((await listByLetter("G", "de")).map((w) => w.slug)).toEqual(["grauwaescherei"]);
    // umlaut initials are counted, not dropped
    await rawRun("UPDATE words SET word = 'Ärgerwort', status = 'published', language = 'de' WHERE slug = 'dummwortschopf'");
    expect((await alphabetWithCounts("de")).map((l) => l.letter)).toContain("Ä");
  });

  it("popularity lenses filter by language", async () => {
    await seedBilingual();
    // Same published_at for both seeds → insertion-order tiebreak, so compare as sets
    expect((await popularity("verified", 10, "en")).map((w) => w.slug).sort()).toEqual(["doomspending", "graywashing"]);
    expect((await popularity("verified", 10, "de")).map((w) => w.slug)).toEqual(["grauwaescherei"]);
    expect((await popularity("verified", 10)).length).toBe(3);
  });

  it("searchWords restricts FTS hits to the language", async () => {
    await seedBilingual();
    expect((await searchWords("gray", 30, "en")).map((w) => w.slug)).toEqual(["graywashing"]);
    expect(await searchWords("gray", 30, "de")).toEqual([]);
  });

  it("getWord refuses to serve another language's entry under a locale URL", async () => {
    await seedBilingual();
    expect(await getWord("graywashing", null, "en")).not.toBeNull();
    expect(await getWord("graywashing", null, "de")).toBeNull();
    expect(await getWord("grauwaescherei", null, "de")).not.toBeNull();
    expect(await getWord("grauwaescherei", null)).not.toBeNull(); // no language → legacy behavior
  });
});
