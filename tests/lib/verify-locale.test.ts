import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyNovelty } from "@/lib/verify";
import { DDG_NO_RESULTS_HTML, ddgHtml, mockFetch } from "../helpers/fetch";

// Localized novelty verification (multilingual phase 3): per-language search
// plans, diacritic-aware word matching, EN-only dictionary API.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("verifyNovelty · locale", () => {
  it("runs the German search plan and skips the EN dictionary API", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML } });
    const v = await verifyNovelty("Grauwäscherei", "Die Praxis der Scheinwohltätigkeit.", "de");
    const queries = (v.queries ?? []).map((q) => q.query);
    expect(queries.some((q) => q.includes("Bedeutung"))).toBe(true);
    expect(queries.some((q) => q.includes("Duden"))).toBe(true);
    expect(v.method).toContain("de");
    // The free dictionary API is EN-only — no call for a German entry.
    expect(calls.filter((c) => c.url.includes("dictionaryapi.dev")).length).toBe(0);
  });

  it("runs the Spanish plan (significado + diccionario)", async () => {
    mockFetch({ search: { html: DDG_NO_RESULTS_HTML } });
    const v = await verifyNovelty("grisilavado", "Lavado de imagen en tono gris.", "es");
    expect((v.queries ?? []).map((q) => q.query).some((q) => q.includes("significado"))).toBe(true);
    expect((v.queries ?? []).map((q) => q.query).some((q) => q.includes("diccionario"))).toBe(true);
  });

  it("still calls the EN dictionary for the default locale", async () => {
    const { calls } = mockFetch({ search: { html: DDG_NO_RESULTS_HTML }, dictionary: { status: 404 } });
    await verifyNovelty("graywashing", "Superficial philanthropy to mask corporate harm.");
    expect(calls.filter((c) => c.url.includes("dictionaryapi.dev")).length).toBe(1);
  });

  it("matches accented word forms through diacritic folding", async () => {
    // A German page writing "Grauwäscherei" must register as a same-sense
    // appearance of the headword — diacritic folding on both sides.
    mockFetch({
      search: () => ({
        html: ddgHtml([
          {
            title: "Das Phänomen Grauwäscherei erklärt",
            url: "https://example.de/grauwaescherei",
            snippet: "Von Grauwäscherei spricht man, wenn Firmen Scheinwohltätigkeit betreiben, um Schaden zu verschleiern.",
          },
        ]),
      }),
    });
    const v = await verifyNovelty("Grauwäscherei", "Die Praxis, oberflächliche Wohltätigkeit zu betreiben, um Schaden zu verschleiern.", "de");
    expect(v.queries![0].results_checked).toBe(1);
    // keyword overlap ≥ 2 → judged the same sense → EXISTS
    expect(v.verdict).toBe("EXISTS");
  });
});
