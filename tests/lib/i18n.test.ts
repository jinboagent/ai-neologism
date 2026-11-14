import { describe, expect, it } from "vitest";
import { detectLocale, isLocale, localePath, LOCALES, splitLinks, stripLocale } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n";
import { en, type Dictionary } from "@/lib/i18n/en";

/** Deep key-shape comparison: every locale must mirror the EN dictionary exactly. */
function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value === "function") return [prefix]; // functions are leaves too
  if (value === null || typeof value !== "object") return [prefix];
  if (Array.isArray(value)) {
    // Arrays compared by length + element shape of the first item
    return value.flatMap((v, i) => keysOf(v, `${prefix}[${i}]`));
  }
  return Object.keys(value as Record<string, unknown>).flatMap((k) => keysOf((value as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
}

describe("i18n core", () => {
  it("routes paths with the locale prefix, EN stays at the root", () => {
    expect(localePath("en", "/words/graywashing")).toBe("/words/graywashing");
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("de", "/words/grauwaescherei")).toBe("/de/words/grauwaescherei");
    expect(localePath("de", "/")).toBe("/de");
    expect(localePath("es", "/popularity?lens=trending")).toBe("/es/popularity?lens=trending");
  });

  it("detects and strips the locale prefix", () => {
    expect(detectLocale("/de/words/x")).toBe("de");
    expect(detectLocale("/es")).toBe("es");
    expect(detectLocale("/fr/about")).toBe("fr");
    expect(detectLocale("/words/x")).toBe("en");
    expect(detectLocale("/")).toBe("en");
    expect(stripLocale("/de/words/x")).toBe("/words/x");
    expect(stripLocale("/de")).toBe("");
    expect(stripLocale("/about")).toBe("/about");
  });

  it("validates locales", () => {
    expect(isLocale("de")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(LOCALES).toEqual(["en", "de", "es", "fr"]);
  });

  it("splits [[label|href]] link tokens into renderable segments", () => {
    expect(splitLinks("plain text")).toEqual([{ kind: "text", value: "plain text" }]);
    const segs = splitLinks("see the [[review criteria page|/criteria]] for more");
    expect(segs).toEqual([
      { kind: "text", value: "see the " },
      { kind: "link", label: "review criteria page", href: "/criteria" },
      { kind: "text", value: " for more" },
    ]);
  });
});

describe("dictionaries", () => {
  it("every locale mirrors the EN key shape exactly", () => {
    const enKeys = keysOf(en).sort();
    for (const locale of ["de", "es", "fr"] as const) {
      const dict = getDictionary(locale);
      expect(keysOf(dict).sort(), `locale ${locale}`).toEqual(enKeys);
    }
  });

  it("localized home strings differ from EN (they are real translations)", () => {
    for (const locale of ["de", "es", "fr"] as const) {
      const dict = getDictionary(locale) as Dictionary;
      expect(dict.homeHeroTitle).not.toBe(en.homeHeroTitle);
      expect(dict.alsoIn).not.toBe(en.alsoIn);
    }
  });

  it("count helpers pluralize per language", () => {
    expect(en.homeCount(1)).toBe("1 word in the collection");
    expect(en.homeCount(2)).toBe("2 words in the collection");
    expect(getDictionary("de").homeCount(2)).toBe("2 Wörter in der Sammlung");
    expect(getDictionary("es").indexCount(1)).toBe("1 palabra");
  });
});
