import { describe, expect, it } from "vitest";
import { countPublishedThisWeek, FEATURED_SLUGS, listFeatured } from "@/lib/words";
import { qRun } from "@/lib/db";

/** Minimal published-style row: enough columns for hydrate + the featured query. */
async function insertWord(slug: string, language: string, status: string): Promise<void> {
  await qRun(
    `INSERT INTO words (slug, word, language, part_of_speech, definition, explanation, why_this_word,
       status, badge, published_at)
     VALUES (?, ?, ?, 'noun', 'Test definition for the homepage card.', '', '', ?, 'new', datetime('now'))`,
    [slug, slug, language, status]
  );
}

describe("listFeatured", () => {
  it("returns curated words in listed order and drops missing/unpublished slugs", async () => {
    const slugs = FEATURED_SLUGS.en!;
    await insertWord(slugs[0], "en", "published");
    await insertWord(slugs[1], "en", "published");
    // A third curated slug exists only as an in-review draft: it must not appear.
    await insertWord(slugs[2], "en", "in_review");

    const got = await listFeatured("en");
    expect(got.map((w) => w.slug)).toEqual([slugs[0], slugs[1]]);
  });

  it("returns nothing for a locale without curation", async () => {
    expect(await listFeatured("es")).toEqual([]);
  });

  it("counts only words published in the last seven days", async () => {
    const before = await countPublishedThisWeek("en");
    await insertWord("weeklycounter", "en", "published");
    expect(await countPublishedThisWeek("en")).toBe(before + 1);
  });
});
