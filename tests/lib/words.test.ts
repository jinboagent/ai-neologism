import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import {
  alphabetWithCounts,
  countPublished,
  getWord,
  hydrate,
  listByLetter,
  listPublished,
  popularity,
  recordVote,
  searchWords,
  slugify,
  uniqueSlug,
  type WordRow,
} from "@/lib/words";
import { insertKey, insertVote, insertWord, resetDb, rawAll, rawGet, rawRun } from "../helpers/db";

beforeEach(async () => {
  await resetDb();
});

describe("slugify", () => {
  it("lowercases and trims", async () => {
    expect(slugify("  Graywashing  ")).toBe("graywashing");
  });

  it("converts spaces and underscores to single hyphens", async () => {
    expect(slugify("ping dread")).toBe("ping-dread");
    expect(slugify("micro_legacy")).toBe("micro-legacy");
    expect(slugify("a   b")).toBe("a-b");
    expect(slugify("a-_b")).toBe("a-b");
  });

  it("never merges separate words joined by an underscore", async () => {
    // Regression: "_" used to be deleted before it could become a hyphen,
    // collapsing "micro_legacy" to "microlegacy".
    expect(slugify("micro_legacy")).not.toBe("microlegacy");
    expect(await uniqueSlug("micro_legacy")).toBe("micro-legacy");
  });

  it("strips punctuation and collapses repeated hyphens", async () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("--dashes--")).toBe("dashes");
    expect(slugify("a---b")).toBe("a-b");
  });

  it("returns an empty string when nothing survives sanitisation", async () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("drops non-ASCII characters rather than transliterating them", async () => {
    // Documents current behaviour: accented input loses the accented letters.
    expect(slugify("café")).toBe("caf");
    expect(slugify("新词")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when it is free", async () => {
    expect(await uniqueSlug("Graywashing")).toBe("graywashing");
  });

  it("appends an incrementing suffix on collision", async () => {
    await insertWord({ slug: "pingdread", word: "pingdread" });
    expect(await uniqueSlug("pingdread")).toBe("pingdread-2");
    await insertWord({ slug: "pingdread-2", word: "pingdread two" });
    expect(await uniqueSlug("pingdread")).toBe("pingdread-3");
  });

  it("falls back to 'word' when the input slugifies to nothing", async () => {
    expect(await uniqueSlug("!!!")).toBe("word");
    await insertWord({ slug: "word", word: "!!!" });
    expect(await uniqueSlug("!!!")).toBe("word-2");
  });
});

describe("hydrate", () => {
  const baseRow = (): WordRow =>
    ({
      id: 1,
      slug: "graywashing",
      word: "graywashing",
      pronunciation: null,
      part_of_speech: "noun",
      definition: "d",
      explanation: "e",
      why_this_word: "w",
      alternatives_json: "[]",
      verification_json: "{}",
      references_json: "[]",
      related_words: "[]",
      categories_json: "[]",
      ai_assisted: 0,
      status: "published",
      return_notes: null,
      badge: "new",
      input_type: "form",
      contributor_key_hash: null,
      use_votes: 0,
      work_votes: 0,
      published_at: null,
      created_at: "2026-09-01 00:00:00",
      updated_at: "2026-09-01 00:00:00",
    }) as WordRow;

  it("parses JSON columns into typed fields", async () => {
    const row = baseRow();
    row.alternatives_json = JSON.stringify([{ word: "alt", rationale: "why" }]);
    row.categories_json = JSON.stringify(["Health"]);
    row.related_words = JSON.stringify(["other"]);
    row.verification_json = JSON.stringify({ verdict: "NEW" });

    const w = hydrate(row);
    expect(w.alternatives).toEqual([{ word: "alt", rationale: "why" }]);
    expect(w.categories).toEqual(["Health"]);
    expect(w.related_words).toEqual(["other"]);
    expect(w.verification).toEqual({ verdict: "NEW" });
  });

  it("converts ai_assisted from 0/1 to a boolean", async () => {
    expect(hydrate(baseRow()).ai_assisted).toBe(false);
    expect(hydrate({ ...baseRow(), ai_assisted: 1 }).ai_assisted).toBe(true);
  });

  it("survives corrupt JSON in every column without throwing", async () => {
    const row = baseRow();
    row.alternatives_json = "{not json";
    row.verification_json = "][";
    row.references_json = "null bytes \u0000";
    row.related_words = "";
    row.categories_json = undefined as unknown as string;

    const w = hydrate(row);
    expect(w.alternatives).toEqual([]);
    expect(w.verification).toEqual({ verdict: "UNVERIFIED" });
    expect(w.references).toEqual([]);
    expect(w.related_words).toEqual([]);
    expect(w.categories).toEqual([]);
  });
});

describe("listPublished / countPublished", () => {
  it("returns only published words", async () => {
    await insertWord({ slug: "a", word: "a", status: "published" });
    await insertWord({ slug: "b", word: "b", status: "in_review" });
    await insertWord({ slug: "c", word: "c", status: "declined" });
    await insertWord({ slug: "d", word: "d", status: "returned" });

    expect(await countPublished()).toBe(1);
    expect((await listPublished()).map((w) => w.slug)).toEqual(["a"]);
  });

  it("orders newest-published first and honours limit/offset", async () => {
    await insertWord({ slug: "old", word: "old", status: "published", published_at: "2026-01-01 00:00:00" });
    await insertWord({ slug: "mid", word: "mid", status: "published", published_at: "2026-05-01 00:00:00" });
    await insertWord({ slug: "new", word: "new", status: "published", published_at: "2026-09-01 00:00:00" });

    expect((await listPublished()).map((w) => w.slug)).toEqual(["new", "mid", "old"]);
    expect((await listPublished({ limit: 2 })).map((w) => w.slug)).toEqual(["new", "mid"]);
    expect((await listPublished({ limit: 2, offset: 2 })).map((w) => w.slug)).toEqual(["old"]);
  });
});

describe("getWord visibility", () => {
  const OWNER = "hash-owner";
  const REVIEWER = "hash-reviewer";
  const STRANGER = "hash-stranger";

  beforeEach(async () => {
    await insertKey(REVIEWER, 3); // meets REVIEW_THRESHOLD
    await insertKey(STRANGER, 0);
    await insertWord({ slug: "pub", word: "pub", status: "published" });
    await insertWord({ slug: "queue", word: "queue", status: "in_review", contributor_key_hash: OWNER });
  });

  it("shows published words to anonymous callers", async () => {
    expect((await getWord("pub"))?.slug).toBe("pub");
    expect((await getWord("pub", null))?.slug).toBe("pub");
  });

  it("hides unpublished words from anonymous callers", async () => {
    expect(await getWord("queue")).toBeNull();
    expect(await getWord("queue", null)).toBeNull();
  });

  it("shows unpublished words to their contributor", async () => {
    expect((await getWord("queue", OWNER))?.slug).toBe("queue");
  });

  it("shows unpublished words to a reviewer who has met the threshold", async () => {
    expect((await getWord("queue", REVIEWER))?.slug).toBe("queue");
  });

  it("hides unpublished words from a key holder below the review threshold", async () => {
    expect(await getWord("queue", STRANGER)).toBeNull();
  });

  it("returns null for an unknown slug", async () => {
    expect(await getWord("nope", OWNER)).toBeNull();
  });
});

describe("listByLetter / alphabetWithCounts", () => {
  beforeEach(async () => {
    await insertWord({ slug: "apple", word: "apple", status: "published" });
    await insertWord({ slug: "avocado", word: "Avocado", status: "published" });
    await insertWord({ slug: "banana", word: "banana", status: "published" });
    await insertWord({ slug: "pending", word: "apricot", status: "in_review" });
    await insertWord({ slug: "numeric", word: "4chanism", status: "published" });
  });

  it("matches case-insensitively and excludes unpublished words", async () => {
    expect((await listByLetter("A")).map((w) => w.word)).toEqual(["apple", "Avocado"]);
    expect((await listByLetter("a")).map((w) => w.word)).toEqual(["apple", "Avocado"]);
  });

  it("returns an empty list for a letter with no published words", async () => {
    expect(await listByLetter("Z")).toEqual([]);
  });

  it("counts published words per letter and drops non A-Z initials", async () => {
    expect(await alphabetWithCounts()).toEqual([
      { letter: "A", count: 2 },
      { letter: "B", count: 1 },
    ]);
  });
});

describe("searchWords", () => {
  beforeEach(async () => {
    await insertWord({
      slug: "graywashing",
      word: "graywashing",
      status: "published",
      definition: "Performing superficial philanthropy to mask a harmful record.",
    });
    await insertWord({
      slug: "pingdread",
      word: "pingdread",
      status: "published",
      definition: "Anxiety about opening a notification that carries a request.",
    });
    await insertWord({ slug: "hidden", word: "hiddencoin", status: "in_review", definition: "philanthropy" });
  });

  it("matches on the word itself", async () => {
    expect((await searchWords("graywashing")).map((w) => w.slug)).toEqual(["graywashing"]);
  });

  it("matches on definition text", async () => {
    expect((await searchWords("philanthropy")).map((w) => w.slug)).toEqual(["graywashing"]);
  });

  it("never returns unpublished words", async () => {
    expect(await searchWords("hiddencoin")).toEqual([]);
  });

  it("returns an empty list for blank or fully-stripped queries", async () => {
    expect(await searchWords("")).toEqual([]);
    expect(await searchWords("   ")).toEqual([]);
    expect(await searchWords("\"\"")).toEqual([]);
    expect(await searchWords("*()")).toEqual([]);
  });

  it("does not throw on FTS operator injection attempts", async () => {
    const attacks = [
      '" OR word:*',
      'graywashing" AND "pingdread',
      "NEAR(a b)",
      "word:*)",
      "col:filter",
      "it's",
      "gray-washing",
      "\\",
      "%",
      "_",
    ];
    for (const q of attacks) {
      let threw = false;
      try {
        await searchWords(q);
      } catch {
        threw = true;
      }
      expect(threw, `query: ${q}`).toBe(false);
    }
  });

  it("honours the limit argument", async () => {
    expect((await searchWords("a", 1)).length).toBeLessThanOrEqual(1);
  });
});

describe("popularity lenses", () => {
  beforeEach(async () => {
    await insertWord({
      slug: "hot",
      word: "hot",
      status: "published",
      use_votes: 5,
      work_votes: 4,
      published_at: "2026-09-01 00:00:00",
    });
    await insertWord({
      slug: "loved",
      word: "loved",
      status: "published",
      use_votes: 20,
      work_votes: 0,
      published_at: "2026-08-01 00:00:00",
    });
    await insertWord({
      slug: "quiet",
      word: "quiet",
      status: "published",
      use_votes: 0,
      work_votes: 0,
      published_at: "2026-09-03 00:00:00",
    });
    await insertWord({ slug: "draft", word: "draft", status: "in_review", use_votes: 99 });
  });

  it("endorsed ranks by use_votes and excludes words with none", async () => {
    expect((await popularity("endorsed")).map((w) => w.slug)).toEqual(["loved", "hot"]);
  });

  it("contested requires both vote types and ranks by their product", async () => {
    expect((await popularity("contested")).map((w) => w.slug)).toEqual(["hot"]);
  });

  it("verified orders by publication date, newest first", async () => {
    expect((await popularity("verified")).map((w) => w.slug)).toEqual(["quiet", "hot", "loved"]);
  });

  it("trending ranks by votes cast in the last seven days", async () => {
    const hotId = (await rawGet("SELECT id FROM words WHERE slug = 'hot'")) as { id: number };
    const quietId = (await rawGet("SELECT id FROM words WHERE slug = 'quiet'")) as { id: number };
    await insertVote(hotId.id, "v1", 1);
    await insertVote(hotId.id, "v2", 1);
    await insertVote(quietId.id, "v3", -1);

    // hot=+2, loved=0 (no recent votes), quiet=-1 — a downvote ranks below silence.
    expect((await popularity("trending")).map((w) => w.slug)).toEqual(["hot", "loved", "quiet"]);
  });

  it("trending ignores votes older than seven days", async () => {
    const lovedId = (await rawGet("SELECT id FROM words WHERE slug = 'loved'")) as { id: number };
    await insertVote(lovedId.id, "old-voter", 1, "2020-01-01 00:00:00");

    expect((await popularity("trending")).map((w) => w.slug)).toEqual(["quiet", "hot", "loved"]);
  });

  it("never returns unpublished words from any lens", async () => {
    for (const lens of ["trending", "endorsed", "contested", "verified"] as const) {
      expect((await popularity(lens)).map((w) => w.slug)).not.toContain("draft");
    }
  });

  it("honours the limit argument", async () => {
    expect(await popularity("verified", 2)).toHaveLength(2);
  });
});

describe("recordVote", () => {
  let slug: string;

  beforeEach(async () => {
    slug = "votable";
    await insertWord({ slug, word: slug, status: "published" });
  });

  it("rejects a vote on a word that is not published", async () => {
    await insertWord({ slug: "pending", word: "pending", status: "in_review" });
    expect(await recordVote("pending", "voter", 1)).toEqual({ ok: false, use_votes: 0, work_votes: 0 });
  });

  it("rejects a vote on an unknown slug", async () => {
    expect((await recordVote("nope", "voter", 1)).ok).toBe(false);
  });

  it("records a first upvote", async () => {
    expect(await recordVote(slug, "voter", 1)).toEqual({ ok: true, use_votes: 1, work_votes: 0 });
  });

  it("withdraws the vote when the same voter repeats it", async () => {
    await recordVote(slug, "voter", 1);
    expect(await recordVote(slug, "voter", 1)).toEqual({ ok: true, use_votes: 0, work_votes: 0 });
  });

  it("switches an existing vote instead of double-counting", async () => {
    await recordVote(slug, "voter", 1);
    expect(await recordVote(slug, "voter", -1)).toEqual({ ok: true, use_votes: 0, work_votes: 1 });
  });

  it("counts distinct voters, not raw vote events", async () => {
    await recordVote(slug, "a", 1);
    await recordVote(slug, "b", 1);
    await recordVote(slug, "c", -1);
    const row = (await rawGet("SELECT use_votes, work_votes FROM words WHERE slug = ?", [slug])) as { use_votes: number; work_votes: number };
    expect(row).toEqual({ use_votes: 2, work_votes: 1 });
  });

  it("persists the cached counts onto the words row", async () => {
    await recordVote(slug, "a", 1);
    await recordVote(slug, "b", -1);
    const row = (await rawGet("SELECT use_votes, work_votes FROM words WHERE slug = ?", [slug])) as { use_votes: number; work_votes: number };
    expect(row).toEqual({ use_votes: 1, work_votes: 1 });
  });

  it("keeps at most one votes row per voter", async () => {
    await recordVote(slug, "a", 1);
    await recordVote(slug, "a", -1); // switches the existing row rather than inserting a second
    expect(await voteRowCount()).toBe(1);

    await recordVote(slug, "a", -1); // repeating the same vote toggles it off
    expect(await voteRowCount()).toBe(0);
  });
});

async function voteRowCount(): Promise<number> {
  return ((await rawGet("SELECT COUNT(*) AS n FROM votes")) as { n: number }).n;
}
