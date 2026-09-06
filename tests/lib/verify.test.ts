import { afterEach, describe, expect, it, vi } from "vitest";
import { badgeFromVerdict, verifyNovelty } from "@/lib/verify";
import { DDG_ANOMALY_HTML, DDG_NO_RESULTS_HTML, ddgHtml, dictionaryPayload, mockFetch } from "../helpers/fetch";

afterEach(() => {
  vi.unstubAllGlobals();
});

const WORD = "zephquake";
// keywords() keeps tokens longer than 3 chars that are not stopwords, so this
// definition yields {sudden, tremor, public, confidence, triggered, small, disclosure}.
// Because that set is larger than 6, a result needs >= 2 overlapping keywords to
// count as "same sense".
const DEFINITION = "A sudden tremor of public confidence triggered by one small disclosure.";

// A result only counts if it contains the word itself AND overlaps the definition,
// so the same-sense fixture must carry the coinage too.
const SAME_SENSE = {
  title: "Result One",
  url: "https://example.com/same-sense",
  snippet: "The zephquake disclosure triggered a tremor in public confidence.",
};

const OTHER_SENSE = {
  title: "Result Two",
  url: "https://example.com/other-sense",
  snippet: `zephquake is a geological survey term describing minor faults.`,
};

const UNRELATED = {
  title: "Result Three",
  url: "https://example.com/unrelated",
  snippet: "A recipe for sourdough bread with a long fermentation.",
};

const wordNotFound = { status: 404 } as const;

describe("badgeFromVerdict", () => {
  it("maps every verdict to its badge", () => {
    expect(badgeFromVerdict("NEW")).toBe("new");
    expect(badgeFromVerdict("NEAR_EXISTING")).toBe("near_existing");
    expect(badgeFromVerdict("EXISTS")).toBe("collision");
    expect(badgeFromVerdict("UNVERIFIED")).toBe("unverified");
  });

  it("falls back to unverified for an unrecognised verdict", () => {
    expect(badgeFromVerdict("SOMETHING_ELSE" as never)).toBe("unverified");
  });
});

describe("verifyNovelty · verdicts", () => {
  it("returns NEW when searches succeed and nothing matches", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEW");
    expect(v.note).toContain("zephquake");
  });

  it("returns NEW when results exist but none contain the word", async () => {
    mockFetch({ search: { html: ddgHtml([UNRELATED]) }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEW");
  });

  it("returns EXISTS when the dictionary already carries this sense", async () => {
    mockFetch({
      search: { html: DDG_NO_RESULTS_HTML },
      dictionary: { status: 200, json: dictionaryPayload(["A tremor of public confidence caused by disclosure."], WORD) },
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("EXISTS");
    expect(v.note).toMatch(/dictionary/i);
  });

  it("returns EXISTS when two or more web results use the word in this sense", async () => {
    mockFetch({
      search: { html: ddgHtml([SAME_SENSE, { ...SAME_SENSE, url: "https://example.com/second" }]) },
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("EXISTS");
  });

  it("returns NEAR_EXISTING when exactly one web result shares the sense", async () => {
    // Only the bare quoted query returns a hit; the "meaning"/"definition" variants find nothing.
    mockFetch({
      search: (q) => ({ html: q === `"${WORD}"` ? ddgHtml([SAME_SENSE]) : DDG_NO_RESULTS_HTML }),
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEAR_EXISTING");
    expect(v.queries?.map((x) => x.meaningful_matches)).toEqual([1, 0, 0]);
  });

  it("returns NEAR_EXISTING when the word exists in the dictionary with a different sense", async () => {
    mockFetch({
      search: { html: DDG_NO_RESULTS_HTML },
      dictionary: { status: 200, json: dictionaryPayload(["A geological survey term for minor faults."], WORD) },
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEAR_EXISTING");
  });

  it("returns NEAR_EXISTING when the word appears three or more times in other senses", async () => {
    mockFetch({
      search: { html: ddgHtml([OTHER_SENSE, { ...OTHER_SENSE, url: "https://example.com/o2" }, { ...OTHER_SENSE, url: "https://example.com/o3" }]) },
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEAR_EXISTING");
  });

  it("returns UNVERIFIED when both search and dictionary are unreachable", async () => {
    mockFetch({ search: { throws: "network down" }, dictionary: { throws: "network down" } });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("UNVERIFIED");
    expect(v.note).toMatch(/unreachable/i);
  });

  it("returns UNVERIFIED rather than NEW when every search failed but the dictionary answered", async () => {
    // Regression: this used to fall through to NEW and publish a badge claiming
    // "no established usage found in 0 checked results" — a novelty claim with no evidence.
    mockFetch({ search: { throws: "network down" }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("UNVERIFIED");
  });

  it("returns UNVERIFIED when search is rate-limited to an anomaly page", async () => {
    mockFetch({ search: { html: DDG_ANOMALY_HTML }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("UNVERIFIED");
  });

  it("still reports EXISTS on dictionary evidence even when every search failed", async () => {
    // Positive evidence beats a dead search channel.
    mockFetch({
      search: { throws: "network down" },
      dictionary: { status: 200, json: dictionaryPayload(["A tremor of public confidence caused by disclosure."], WORD) },
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("EXISTS");
  });
});

describe("verifyNovelty · evidence record", () => {
  it("runs the three-query quoted search plan", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.queries?.map((q) => q.query)).toEqual([`"${WORD}"`, `"${WORD}" meaning`, `"${WORD}" definition`]);
  });

  it("records how many results each query checked", async () => {
    mockFetch({ search: { html: ddgHtml([UNRELATED, OTHER_SENSE]) }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.queries?.every((q) => q.results_checked === 2)).toBe(true);
  });

  it("counts zero results when the search failed", async () => {
    mockFetch({ search: { throws: "down" }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.queries?.every((q) => q.results_checked === 0)).toBe(true);
  });

  it("caps closest_matches at three entries", async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...OTHER_SENSE, url: `https://example.com/o${i}` }));
    mockFetch({ search: { html: ddgHtml(many) }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.closest_matches).toHaveLength(3);
    expect(v.closest_matches?.every((m) => m.url && m.note)).toBe(true);
  });

  it("distinguishes same-sense from other-sense notes", async () => {
    mockFetch({
      search: (q) => ({ html: q === `"${WORD}"` ? ddgHtml([SAME_SENSE, OTHER_SENSE]) : DDG_NO_RESULTS_HTML }),
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    const notes = v.closest_matches?.map((m) => m.note) ?? [];
    expect(notes.some((n) => n.includes("possibly related sense"))).toBe(true);
    expect(notes.some((n) => n.includes("another sense"))).toBe(true);
  });

  it("truncates long snippets inside closest_matches notes", async () => {
    const long = { ...OTHER_SENSE, snippet: `${WORD} ` + "x".repeat(400) };
    mockFetch({ search: { html: ddgHtml([long]) }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect((v.closest_matches?.[0].note ?? "").length).toBeLessThan(220);
  });

  it("stamps checked_at as a YYYY-MM-DD date", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("describes the method it used", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.method).toMatch(/search/i);
    expect(v.method).toMatch(/dictionary/i);
  });

  it("always supplies a non-empty note", async () => {
    const scenarios = [
      { search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound },
      { search: { throws: "down" }, dictionary: { throws: "down" } },
      { search: { html: ddgHtml([SAME_SENSE, SAME_SENSE]) }, dictionary: wordNotFound },
    ] as const;

    for (const plan of scenarios) {
      mockFetch({ ...plan });
      const v = await verifyNovelty(WORD, DEFINITION);
      expect(v.note?.length, JSON.stringify(plan)).toBeGreaterThan(0);
    }
  });

  it("queries the dictionary for the lowercased word", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    await verifyNovelty("ZephQuake", DEFINITION);
    const dictCall = calls.find((c) => c.url.includes("dictionaryapi.dev"));
    expect(dictCall?.url).toContain("/entries/en/zephquake");
  });

  it("URL-encodes the word in the dictionary request", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: wordNotFound });

    await verifyNovelty("a/b c", DEFINITION);
    const dictCall = calls.find((c) => c.url.includes("dictionaryapi.dev"));
    expect(dictCall?.url).toContain("a%2Fb%20c");
  });
});

describe("verifyNovelty · input handling", () => {
  it("treats a definition with no usable keywords as unmatched", async () => {
    mockFetch({ search: { html: ddgHtml([SAME_SENSE]) }, dictionary: wordNotFound });

    const v = await verifyNovelty(WORD, "the a of to");
    expect(["NEW", "NEAR_EXISTING", "EXISTS"]).toContain(v.verdict);
  });

  it("does not throw when the dictionary returns a malformed body", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 200, json: { not: "an array" } } });

    await expect(verifyNovelty(WORD, DEFINITION)).resolves.toBeTruthy();
  });

  it("does not throw when the dictionary returns null", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 200, json: null } });

    await expect(verifyNovelty(WORD, DEFINITION)).resolves.toBeTruthy();
  });

  it("matches the word case-insensitively in results", async () => {
    mockFetch({
      search: { html: ddgHtml([{ ...OTHER_SENSE, snippet: "ZEPHQUAKE is a survey term for minor faults." }]) },
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.closest_matches?.length ?? 0).toBeGreaterThan(0);
  });

  it("does not count a substring as an appearance of the word", async () => {
    mockFetch({
      search: { html: ddgHtml([{ ...UNRELATED, snippet: "the zephquaker tool is unrelated here" }]) },
      dictionary: wordNotFound,
    });

    const v = await verifyNovelty(WORD, DEFINITION);
    expect(v.verdict).toBe("NEW");
    expect(v.closest_matches).toEqual([]);
  });
});
