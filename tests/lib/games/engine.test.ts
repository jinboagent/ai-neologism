// Engine tests for the games — pure core only, no database involved.
// Fixtures are synthetic coinages crafted so every computation (parsing,
// families, chains, boards) has a known expected outcome, mirroring the
// prototype's Python behaviour exactly.
import { describe, expect, it } from "vitest";
import {
  availability,
  buildFamilies,
  buildGramIndex,
  categorySortPayload,
  chainRound,
  compact,
  dailyIndex,
  flowerPayload,
  fusionPayload,
  longestSharedRun,
  meaningPayload,
  mulberry32,
  parseComponents,
  realOrFakePayload,
  reversePayload,
  sample,
  semanticPayload,
  stats,
  validatedComponents,
  type GameWord,
} from "@/lib/games/engine";

function W(word: string, why: string, definition = `def of ${word}`, categories: string[] = []): GameWord {
  return { word, pos: "noun", definition, explanation: "", why, ipa: "", related: [], categories };
}

// The grief trio shares the 5-gram "grief" and can chain; bed* words share the
// morpheme "bed" but no 5-gram; the oddities carry no why-field at all.
const FIXTURES: GameWord[] = [
  W("beddrift", "bed + drift; the slow slide of bedtime"),
  W("bedframe", "bed + frame"),
  W("bedrock", "bed + rock"),
  W("screbgret", "screw + grief", "", ["Work & Office"]),
  W("feedshame", "feed + shame", "", ["Work & Office", "Digital Life"]),
  W("feedsadness", "feed + sadness", "", ["Digital Life"]),
  W("clockgrief", "clock + grief; meetings that eat the day", "", ["Work & Office"]),
  W("cloudgrief", "cloud + grief", "", ["Digital Life"]),
  W("griefcase", "grief + case", "", ["Work & Office"]),
  W("griefmare", "grief + mare", "", ["Work & Office"]),
  W("feedfog", "feed + fog", "", ["Digital Life"]),
  W("moonlite", "moon + lite; a pale imitation of romance"),
  W("sunmate", "sun + mate"),
  W("qxzwoj", "", "", ["Oddities"]),
  W("zqvvlka", "", "", ["Oddities"]),
];

describe("parseComponents", () => {
  it("splits A + B and stops at the reason clause", () => {
    expect(parseComponents("bed + drift; the slow slide of bedtime")).toEqual(["bed", "drift"]);
  });
  it("takes up to three components", () => {
    expect(parseComponents("sun + burn + care")).toEqual(["sun", "burn", "care"]);
  });
  it("cuts the whole string at the first dash/paren when there is no +", () => {
    // Prototype parity: the cut runs per part, so "cloud — grief" yields only "cloud".
    expect(parseComponents("cloud — grief (from cloud computing)")).toEqual(["cloud"]);
    expect(parseComponents("bed + drift — note")).toEqual(["bed", "drift"]);
  });
  it("strips markers but keeps spaces inside a part (prototype parity)", () => {
    expect(parseComponents("moon * lite; x")).toEqual(["moon lite"]);
  });
  it("returns [] for empty input", () => {
    expect(parseComponents("")).toEqual([]);
  });
});

describe("compact / validatedComponents", () => {
  it("compacts to a-z only", () => {
    expect(compact("Bed-Drift!")).toBe("beddrift");
  });
  it("accepts components that rebuild the word", () => {
    expect(validatedComponents(FIXTURES[0])).toEqual(["bed", "drift"]);
  });
  it("rejects components that do not rebuild the word", () => {
    expect(validatedComponents(W("totallyoff", "bed + drift"))).toBeNull();
  });
  it("needs at least two components", () => {
    expect(validatedComponents(W("bedonly", "bed"))).toBeNull();
  });
  it("validates accented and hyphenated compounds via accent folding; blends still fail", () => {
    expect(validatedComponents(W("vozherencia", "voz + herencia; el audio que reclama a su ausente"))).toEqual([
      "voz",
      "herencia",
    ]);
    expect(validatedComponents(W("Chatversteinerung", "Chat + Versteinerung; der eingebaute alte Gruppenname"))).toEqual([
      "chat",
      "versteinerung",
    ]);
    expect(validatedComponents(W("Jawort-Schleicher", "Jawort + Schleicher; dem Ringtausch ausweichen"))).toEqual([
      "jawort",
      "schleicher",
    ]);
    expect(compact("Cousinenkasse")).toBe("cousinenkasse");
    // alliésquive is a blend (the é swallows esquive's first e) — like screbgret, no exact rebuild.
    expect(validatedComponents(W("alliésquive", "allié + esquive; esquive des alliances"))).toBeNull();
  });
});

describe("buildFamilies", () => {
  it("groups words by shared morpheme and grows via substring sweep", () => {
    const fams = buildFamilies(FIXTURES);
    expect(fams["grief"]).toEqual(["clockgrief", "cloudgrief", "griefcase", "griefmare", "screbgret"]);
    expect(fams["bed"]).toEqual(["beddrift", "bedframe", "bedrock"]);
  });
  it("drops families under three members", () => {
    const fams = buildFamilies(FIXTURES);
    expect(fams["moon"]).toBeUndefined(); // moonlite alone
    expect(fams["shame"]).toBeUndefined();
  });
});

describe("longestSharedRun / chains", () => {
  it("finds the longest common substring", () => {
    expect(longestSharedRun("clockgrief", "cloudgrief")).toBe("grief");
    expect(longestSharedRun("abcxyz", "zzzqqq")).toBe("z");
    expect(longestSharedRun("abcde", "fghij")).toBe("");
  });

  const gi = buildGramIndex(FIXTURES);

  it("builds a real chain with ≥5-letter shared runs and safe distractors", () => {
    const chain = chainRound(FIXTURES, gi, { length: 3, rng: mulberry32(1) });
    expect(chain).not.toBeNull();
    expect(chain!.links).toHaveLength(2);
    for (const link of chain!.links) {
      expect(link.via.length).toBeGreaterThanOrEqual(5);
      expect(link.dists).not.toContain(link.next);
      for (const d of link.dists) {
        const shared = [...gi.gramsOf.get(d)!].filter((g) => gi.gramsOf.get(link.w)!.has(g));
        expect(shared).toHaveLength(0); // distractors share no 5-gram
      }
    }
  });

  it("returns null when the vocabulary cannot chain", () => {
    const lonely = [W("aaaabbb", ""), W("cccdddd", "")];
    expect(chainRound(lonely, buildGramIndex(lonely))).toBeNull();
  });
});

describe("meaningPayload", () => {
  it("includes the daily word exactly once and marks its position", () => {
    const data = meaningPayload(FIXTURES, 5, mulberry32(7));
    const words = data.words.map((x) => x.w);
    expect(words.filter((w) => w === data.dailyWord)).toHaveLength(1);
    expect(words[data.dailyIndex]).toBe(data.dailyWord);
    expect(data.words).toHaveLength(6); // 5 practice + 1 daily
  });
  it("is deterministic for a fixed rng", () => {
    const a = meaningPayload(FIXTURES, 5, mulberry32(7));
    const b = meaningPayload(FIXTURES, 5, mulberry32(7));
    expect(a.words.map((w) => w.w)).toEqual(b.words.map((w) => w.w));
  });
  it("keeps practice words to ones with definitions (the daily word may be any word)", () => {
    const data = meaningPayload(FIXTURES, 11);
    for (const [i, w] of data.words.entries()) {
      if (i === data.dailyIndex) continue;
      expect(w.def).toBeTruthy();
    }
  });
});

describe("realOrFakePayload", () => {
  it("decoys are other real definitions, distinct and never the truth", () => {
    const { rounds } = realOrFakePayload(FIXTURES, 4, mulberry32(3));
    expect(rounds).toHaveLength(4);
    for (const r of rounds) {
      expect(r.fakes).toHaveLength(3);
      expect(new Set(r.fakes).size).toBe(3);
      expect(r.fakes).not.toContain(r.real);
    }
  });
});

describe("categorySortPayload", () => {
  it("picks up to four categories with four words each", () => {
    const data = categorySortPayload(FIXTURES, mulberry32(5));
    expect(data.categories.length).toBeGreaterThanOrEqual(1);
    expect(data.categories.length).toBeLessThanOrEqual(4);
    for (const c of data.categories) {
      expect(c.words).toHaveLength(4);
      expect(new Set(c.words).size).toBe(4);
    }
  });
});

describe("fusionPayload", () => {
  it("parts rebuild the word; decoys are foreign morphemes", () => {
    const rounds = fusionPayload(FIXTURES, 4, mulberry32(11));
    expect(rounds.length).toBeGreaterThanOrEqual(3);
    for (const r of rounds) {
      expect(r.parts.join("")).toBe(r.word.toLowerCase());
      for (const d of r.decoys) {
        expect(r.parts).not.toContain(d);
        expect(r.word.toLowerCase()).not.toContain(d);
        expect(d.length).toBeGreaterThanOrEqual(3);
      }
    }
    const words = rounds.map((r) => r.word);
    expect(new Set(words).size).toBe(words.length); // no duplicate rounds
  });
});

describe("reversePayload", () => {
  it("only uses two-morpheme words and suggests reorderings/derivatives", () => {
    const rounds = reversePayload(FIXTURES, 3, mulberry32(13));
    expect(rounds.length).toBeGreaterThanOrEqual(2);
    for (const r of rounds) {
      expect(r.morph.split(" + ")).toHaveLength(2);
      expect(r.sugg).toContain(r.ai);
      expect(r.sugg.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("flowerPayload", () => {
  it("rounds hide a family of ≥3 words plus distractors outside the family", () => {
    const fams = buildFamilies(FIXTURES);
    const rounds = flowerPayload(FIXTURES, fams, 2, mulberry32(17));
    expect(rounds.length).toBeGreaterThanOrEqual(1);
    for (const r of rounds) {
      expect(r.words.length).toBeGreaterThanOrEqual(3);
      for (const d of r.distractors) expect(d.toLowerCase()).not.toContain(r.key);
    }
  });
  it("returns [] when no language families exist", () => {
    const noWhy = [W("aaaabbb", ""), W("bbbcccc", ""), W("cccaaaa", "")];
    expect(flowerPayload(noWhy, buildFamilies(noWhy))).toEqual([]);
  });
});

describe("semanticPayload", () => {
  const bank = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
  it("builds the fixed board size with a seeded closeness arc", () => {
    const { words } = semanticPayload(FIXTURES, bank, "en", 739_000);
    expect(words).toHaveLength(4);
    const arc = [88, 83, 78, 73, 69, 65, 61, 57, 52, 47, 11, 6];
    for (const board of words) {
      const values = Object.values(board.scores).sort((x, y) => y - x);
      expect(values).toEqual(arc); // every bank word ranked exactly once
      expect(values[0]).toBeGreaterThan(values[11]); // climbable ladder
    }
  });
  it("is deterministic per (locale, day) but differs across locales", () => {
    const a = semanticPayload(FIXTURES, bank, "en", 739_000);
    const b = semanticPayload(FIXTURES, bank, "en", 739_000);
    expect(a).toEqual(b);
    const c = semanticPayload(FIXTURES, bank, "de", 739_000);
    expect(a.words.map((w) => w.w)).not.toEqual(c.words.map((w) => w.w));
  });
});

describe("dailyIndex / stats / availability", () => {
  it("daily index is stable within a day and inside bounds", () => {
    const i = dailyIndex(FIXTURES.length);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(FIXTURES.length);
    expect(dailyIndex(0)).toBe(0);
  });
  it("stats count words, families and categories", () => {
    const s = stats(FIXTURES, buildFamilies(FIXTURES));
    expect(s.words).toBe(FIXTURES.length);
    expect(s.families).toBeGreaterThanOrEqual(2);
    expect(s.categories).toBeGreaterThanOrEqual(3);
  });
  it("flags morpheme games off when why_this_word is missing", () => {
    const noWhy = [W("aaaa", ""), W("bbbb", ""), W("cccc", ""), W("dddd", ""), W("eeee", ""), W("ffff", "")];
    const av = availability(noWhy, buildFamilies(noWhy), buildGramIndex(noWhy));
    expect(av.meaning).toBe(true); // definitions exist
    expect(av.fusion).toBe(false);
    expect(av.reverse).toBe(false);
    expect(av.flower).toBe(false);
  });
  it("flags everything on for the fixture lexicon", () => {
    const av = availability(FIXTURES, buildFamilies(FIXTURES), buildGramIndex(FIXTURES));
    expect(av.meaning).toBe(true);
    expect(av.realOrFake).toBe(true);
    expect(av.categorySort).toBe(true);
    expect(av.semantic).toBe(true);
    expect(av.fusion).toBe(true);
    expect(av.reverse).toBe(true);
    expect(av.flower).toBe(true);
    expect(av.chain).toBe(true);
  });
});

describe("sample helper", () => {
  it("samples without replacement and clamps to the pool size", () => {
    const out = sample([1, 2, 3], 10, mulberry32(2));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
  it("is deterministic for a seeded rng", () => {
    expect(sample([1, 2, 3, 4, 5], 3, mulberry32(9))).toEqual(sample([1, 2, 3, 4, 5], 3, mulberry32(9)));
  });
});
