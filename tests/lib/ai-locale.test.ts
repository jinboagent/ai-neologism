import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch } from "../helpers/fetch";

// Locale-aware coining (multilingual phase 3): prompt selection per language,
// gender/plural whitelist enforcement, and the localized gate reason.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.AI_API_KEY;
  delete process.env.AI_BASE_URL;
  delete process.env.AI_MODEL;
});

async function loadAi(env: { AI_API_KEY?: string } = {}) {
  vi.resetModules();
  delete process.env.AI_API_KEY;
  Object.assign(process.env, env);
  return import("@/lib/ai");
}

const env = { AI_API_KEY: "test-key" };

function aiReply(content: string) {
  return () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

const DE_OK = JSON.stringify([
  { word: "Grauwäscherei", gender: "die", plural: "Grauwäschereien", pronunciation: "/ˈɡraʊvɛʃəraɪ/", etymology: "grau + Wäscherei", rationale: "benennt die Praktik", suggested_definition: "Die Praxis der Scheinwohltätigkeit." },
  { word: "Falschspende", gender: "die", plural: "Falschspenden", pronunciation: "/ˈfalsʃpendə/", etymology: "falsch + Spende", rationale: "die Getränkte-Spende", suggested_definition: "Eine Spende zum Schein." },
  { word: "Tugendwaschung", gender: "banana", plural: "Tugendwaschungen", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
  { word: "Scheintugend", gender: "die", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
]);

describe("localized coining prompts", () => {
  it("selects the German grammar card when locale=de and enforces gender+plural", async () => {
    const { generateCandidates } = await loadAi(env);
    const { calls } = mockFetch({ other: aiReply(DE_OK) });
    const candidates = await generateCandidates("Material here.", undefined, "de");
    const body = JSON.parse(calls[0].body!);
    expect(body.messages[0].content).toContain("Genus folgt dem Grundwort");
    expect(body.messages[0].content).toContain("-washing");
    // Invalid gender and missing plural are dropped, valid ones survive
    expect(candidates.map((c) => c.word)).toEqual(["Grauwäscherei", "Falschspende"]);
    expect(candidates[0]).toMatchObject({ gender: "die", plural: "Grauwäschereien" });
  });

  it("selects the Spanish card (suffix derivation + el/la)", async () => {
    const { generateCandidates } = await loadAi(env);
    const { calls } = mockFetch({
      other: aiReply(
        JSON.stringify([
          { word: "grisilavado", gender: "el", plural: "grisilavados", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
          { word: "mala", gender: "le", plural: "malas", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
        ])
      ),
    });
    const candidates = await generateCandidates("Material here.", undefined, "es");
    expect(JSON.parse(calls[0].body!).messages[0].content).toContain("derivación sufijal");
    expect(candidates.map((c) => c.word)).toEqual(["grisilavado"]);
    expect(candidates[0].gender).toBe("el");
  });

  it("selects the French card (dérivation + le/la + élision)", async () => {
    const { generateCandidates } = await loadAi(env);
    const { calls } = mockFetch({
      other: aiReply(
        JSON.stringify([
          { word: "grisblanchiment", gender: "le", plural: "grisblanchiments", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
        ])
      ),
    });
    const candidates = await generateCandidates("Material here.", undefined, "fr");
    expect(JSON.parse(calls[0].body!).messages[0].content).toContain("dérivation");
    expect(candidates[0]).toMatchObject({ word: "grisblanchiment", gender: "le", plural: "grisblanchiments" });
  });

  it("keeps the English prompt and strips grammar fields for EN", async () => {
    const { generateCandidates } = await loadAi(env);
    const { calls } = mockFetch({
      other: aiReply(
        JSON.stringify([
          { word: "graywashing", gender: "die", plural: "grauwäschereien", pronunciation: "/x/", etymology: "x", rationale: "x", suggested_definition: "x" },
        ])
      ),
    });
    const candidates = await generateCandidates("Material here.");
    expect(JSON.parse(calls[0].body!).messages[0].content).toContain("great concept-namers");
    expect(candidates[0].word).toBe("graywashing");
    expect(candidates[0].gender).toBeUndefined();
    expect(candidates[0].plural).toBeUndefined();
  });

  it("writes the gate reason in the site language", async () => {
    const { assessCoiningIntent } = await loadAi(env);
    const { calls } = mockFetch({
      other: aiReply(JSON.stringify({ proceed: false, reason: "Das Material enthält kein Phänomen.", phenomenon: null })),
    });
    const verdict = await assessCoiningIntent("A product listing.", "de");
    expect(verdict.proceed).toBe(false);
    expect(JSON.parse(calls[0].body!).messages[0].content).toContain('Write "reason" in German.');
  });
});
