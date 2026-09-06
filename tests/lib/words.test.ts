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
import { insertKey, insertVote, insertWord, resetDb } from "../helpers/db";

beforeEach(() => {
  resetDb();
});

describe("slugify", () => {
  it("lowercases and trims", () => {
    expect(slugify("  Graywashing  ")).toBe("graywashing");
  });

  it("converts spaces and underscores to single hyphens", () => {
    expect(slugify("ping dread")).toBe("ping-dread");
    expect(slugify("micro_legacy")).toBe("micro-legacy");
    expect(slugify("a   b")).toBe("a-b");
    expect(slugify("a-_b")).toBe("a-b");
  });

  it("never merges separate words joined by an underscore", () => {
    // Regression: "_" used to be deleted before it could become a hyphen,
    // collapsing "micro_legacy" to "microlegacy".
    expect(slugify("micro_legacy")).not.toBe("microlegacy");
    expect(uniqueSlug("micro_legacy")).toBe("micro-legacy");
  });

  it("strips punctuation and collapses repeated hyphens", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("--dashes--")).toBe("dashes");
    expect(slugify("a---b")).toBe("a-b");
  });

  it("returns an empty string when nothing survives sanitisation", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("drops non-ASCII characters rather than transliterating them", () => {
    // Documents current behaviour: accented input loses the accented letters.
    expect(slugify("café")).toBe("caf");
    expect(slugify("新词")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when it is free", () => {
    expect(uniqueSlug("Graywashing")).toBe("graywashing");
  });

  it("appends an incrementing suffix on collision", () => {
    insertWord({ slug: "pingdread", word: "pingdread" });
    expect(uniqueSlug("pingdread")).toBe("pingdread-2");
    insertWord({ slug: "pingdread-2", word: "pingdread two" });
    expect(uniqueSlug("pingdread")).toBe("pingdread-3");
  });

  it("falls back to 'word' when the input slugifies to nothing", () => {
    expect(uniqueSlug("!!!")).toBe("word");
    insertWord({ slug: "word", word: "!!!" });
    expect(uniqueSlug("!!!")).toBe("word-2");
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

  it("parses JSON columns into typed fields", () => {
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

  it("converts ai_assisted from 0/1 to a boolean", () => {
    expect(hydrate(baseRow()).ai_assisted).toBe(false);
    expect(hydrate({ ...baseRow(), ai_assisted: 1 }).ai_assisted).toBe(true);
  });

  it("survives corrupt JSON in every column without throwing", () => {
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
  it("returns only published words", () => {
    insertWord({ slug: "a", word: "a", status: "published" });
    insertWord({ slug: "b", word: "b", status: "in_review" });
    insertWord({ slug: "c", word: "c", status: "declined" });
    insertWord({ slug: "d", word: "d", status: "returned" });

    expect(countPublished()).toBe(1);
    expect(listPublished().map((w) => w.slug)).toEqual(["a"]);
  });

  it("orders newest-published first and honours limit/offset", () => {
    insertWord({ slug: "old", word: "old", status: "published", published_at: "2026-01-01 00:00:00" });
    insertWord({ slug: "mid", word: "mid", status: "published", published_at: "2026-05-01 00:00:00" });
    insertWord({ slug: "new", word: "new", status: "published", published_at: "2026-09-01 00:00:00" });

    expect(listPublished().map((w) => w.slug)).toEqual(["new", "mid", "old"]);
    expect(listPublished({ limit: 2 }).map((w) => w.slug)).toEqual(["new", "mid"]);
    expect(listPublished({ limit: 2, offset: 2 }).map((w) => w.slug)).toEqual(["old"]);
  });
});

describe("getWord visibility", () => {
  const OWNER = "hash-owner";
  const REVIEWER = "hash-reviewer";
  const STRANGER = "hash-stranger";

  beforeEach(() => {
    insertKey(REVIEWER, 3); // meets REVIEW_THRESHOLD
    insertKey(STRANGER, 0);
    insertWord({ slug: "pub", word: "pub", status: "published" });
    insertWord({ slug: "queue", word: "queue", status: "in_review", contributor_key_hash: OWNER });
  });

  it("shows published words to anonymous callers", () => {
    expect(getWord("pub")?.slug).toBe("pub");
    expect(getWord("pub", null)?.slug).toBe("pub");
  });

  it("hides unpublished words from anonymous callers", () => {
    expect(getWord("queue")).toBeNull();
    expect(getWord("queue", null)).toBeNull();
  });

  it("shows unpublished words to their contributor", () => {
    expect(getWord("queue", OWNER)?.slug).toBe("queue");
  });

  it("shows unpublished words to a reviewer who has met the threshold", () => {
    expect(getWord("queue", REVIEWER)?.slug).toBe("queue");
  });

  it("hides unpublished words from a key holder below the review threshold", () => {
    expect(getWord("queue", STRANGER)).toBeNull();
  });

  it("returns null for an unknown slug", () => {
    expect(getWord("nope", OWNER)).toBeNull();
  });
});

describe("listByLetter / alphabetWithCounts", () => {
  beforeEach(() => {
    insertWord({ slug: "apple", word: "apple", status: "published" });
    insertWord({ slug: "avocado", word: "Avocado", status: "published" });
    insertWord({ slug: "banana", word: "banana", status: "published" });
    insertWord({ slug: "pending", word: "apricot", status: "in_review" });
    insertWord({ slug: "numeric", word: "4chanism", status: "published" });
  });

  it("matches case-insensitively and excludes unpublished words", () => {
    expect(listByLetter("A").map((w) => w.word)).toEqual(["apple", "Avocado"]);
    expect(listByLetter("a").map((w) => w.word)).toEqual(["apple", "Avocado"]);
  });

  it("returns an empty list for a letter with no published words", () => {
    expect(listByLetter("Z")).toEqual([]);
  });

  it("counts published words per letter and drops non A-Z initials", () => {
    expect(alphabetWithCounts()).toEqual([
      { letter: "A", count: 2 },
      { letter: "B", count: 1 },
    ]);
  });
});

describe("searchWords", () => {
  beforeEach(() => {
    insertWord({
      slug: "graywashing",
      word: "graywashing",
      status: "published",
      definition: "Performing superficial philanthropy to mask a harmful record.",
    });
    insertWord({
      slug: "pingdread",
      word: "pingdread",
      status: "published",
      definition: "Anxiety about opening a notification that carries a request.",
    });
    insertWord({ slug: "hidden", word: "hiddencoin", status: "in_review", definition: "philanthropy" });
  });

  it("matches on the word itself", () => {
    expect(searchWords("graywashing").map((w) => w.slug)).toEqual(["graywashing"]);
  });

  it("matches on definition text", () => {
    expect(searchWords("philanthropy").map((w) => w.slug)).toEqual(["graywashing"]);
  });

  it("never returns unpublished words", () => {
    expect(searchWords("hiddencoin")).toEqual([]);
  });

  it("returns an empty list for blank or fully-stripped queries", () => {
    expect(searchWords("")).toEqual([]);
    expect(searchWords("   ")).toEqual([]);
    expect(searchWords("\"\"")).toEqual([]);
    expect(searchWords("*()")).toEqual([]);
  });

  it("does not throw on FTS operator injection attempts", () => {
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
      expect(() => searchWords(q), `query: ${q}`).not.toThrow();
    }
  });

  it("honours the limit argument", () => {
    expect(searchWords("a", 1).length).toBeLessThanOrEqual(1);
  });
});

describe("popularity lenses", () => {
  beforeEach(() => {
    insertWord({
      slug: "hot",
      word: "hot",
      status: "published",
      use_votes: 5,
      work_votes: 4,
      published_at: "2026-09-01 00:00:00",
    });
    insertWord({
      slug: "loved",
      word: "loved",
      status: "published",
      use_votes: 20,
      work_votes: 0,
      published_at: "2026-08-01 00:00:00",
    });
    insertWord({
      slug: "quiet",
      word: "quiet",
      status: "published",
      use_votes: 0,
      work_votes: 0,
      published_at: "2026-09-03 00:00:00",
    });
    insertWord({ slug: "draft", word: "draft", status: "in_review", use_votes: 99 });
  });

  it("endorsed ranks by use_votes and excludes words with none", () => {
    expect(popularity("endorsed").map((w) => w.slug)).toEqual(["loved", "hot"]);
  });

  it("contested requires both vote types and ranks by their product", () => {
    expect(popularity("contested").map((w) => w.slug)).toEqual(["hot"]);
  });

  it("verified orders by publication date, newest first", () => {
    expect(popularity("verified").map((w) => w.slug)).toEqual(["quiet", "hot", "loved"]);
  });

  it("trending ranks by votes cast in the last seven days", () => {
    const hotId = getDb().prepare("SELECT id FROM words WHERE slug = 'hot'").get() as { id: number };
    const quietId = getDb().prepare("SELECT id FROM words WHERE slug = 'quiet'").get() as { id: number };
    insertVote(hotId.id, "v1", 1);
    insertVote(hotId.id, "v2", 1);
    insertVote(quietId.id, "v3", -1);

    // hot=+2, loved=0 (no recent votes), quiet=-1 — a downvote ranks below silence.
    expect(popularity("trending").map((w) => w.slug)).toEqual(["hot", "loved", "quiet"]);
  });

  it("trending ignores votes older than seven days", () => {
    const lovedId = getDb().prepare("SELECT id FROM words WHERE slug = 'loved'").get() as { id: number };
    insertVote(lovedId.id, "old-voter", 1, "2020-01-01 00:00:00");

    expect(popularity("trending").map((w) => w.slug)).toEqual(["quiet", "hot", "loved"]);
  });

  it("never returns unpublished words from any lens", () => {
    for (const lens of ["trending", "endorsed", "contested", "verified"] as const) {
      expect(popularity(lens).map((w) => w.slug)).not.toContain("draft");
    }
  });

  it("honours the limit argument", () => {
    expect(popularity("verified", 2)).toHaveLength(2);
  });
});

describe("recordVote", () => {
  let slug: string;

  beforeEach(() => {
    slug = "votable";
    insertWord({ slug, word: slug, status: "published" });
  });

  it("rejects a vote on a word that is not published", () => {
    insertWord({ slug: "pending", word: "pending", status: "in_review" });
    expect(recordVote("pending", "voter", 1)).toEqual({ ok: false, use_votes: 0, work_votes: 0 });
  });

  it("rejects a vote on an unknown slug", () => {
    expect(recordVote("nope", "voter", 1).ok).toBe(false);
  });

  it("records a first upvote", () => {
    expect(recordVote(slug, "voter", 1)).toEqual({ ok: true, use_votes: 1, work_votes: 0 });
  });

  it("withdraws the vote when the same voter repeats it", () => {
    recordVote(slug, "voter", 1);
    expect(recordVote(slug, "voter", 1)).toEqual({ ok: true, use_votes: 0, work_votes: 0 });
  });

  it("switches an existing vote instead of double-counting", () => {
    recordVote(slug, "voter", 1);
    expect(recordVote(slug, "voter", -1)).toEqual({ ok: true, use_votes: 0, work_votes: 1 });
  });

  it("counts distinct voters, not raw vote events", () => {
    recordVote(slug, "a", 1);
    recordVote(slug, "b", 1);
    recordVote(slug, "c", -1);
    const row = getDb()
      .prepare("SELECT use_votes, work_votes FROM words WHERE slug = ?")
      .get(slug) as { use_votes: number; work_votes: number };
    expect(row).toEqual({ use_votes: 2, work_votes: 1 });
  });

  it("persists the cached counts onto the words row", () => {
    recordVote(slug, "a", 1);
    recordVote(slug, "b", -1);
    const row = getDb()
      .prepare("SELECT use_votes, work_votes FROM words WHERE slug = ?")
      .get(slug) as { use_votes: number; work_votes: number };
    expect(row).toEqual({ use_votes: 1, work_votes: 1 });
  });

  it("keeps at most one votes row per voter", () => {
    recordVote(slug, "a", 1);
    recordVote(slug, "a", -1); // switches the existing row rather than inserting a second
    expect(voteRowCount()).toBe(1);

    recordVote(slug, "a", -1); // repeating the same vote toggles it off
    expect(voteRowCount()).toBe(0);
  });
});

function voteRowCount(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM votes").get() as { n: number }).n;
}
