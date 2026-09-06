import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch } from "../helpers/fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.AI_API_KEY;
  delete process.env.AI_BASE_URL;
  delete process.env.AI_MODEL;
});

type AiEnv = { AI_API_KEY?: string; AI_BASE_URL?: string; AI_MODEL?: string };

/**
 * src/lib/ai.ts reads its configuration at module load, so each test imports a
 * fresh copy after setting the environment it wants to exercise.
 */
async function loadAi(env: AiEnv = {}) {
  vi.resetModules();
  delete process.env.AI_API_KEY;
  delete process.env.AI_BASE_URL;
  delete process.env.AI_MODEL;
  Object.assign(process.env, env);
  return import("@/lib/ai");
}

/** Serve a chat-completions response whose message content is `content`. */
function aiReply(content: string, status = 200) {
  return {
    other: () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  };
}

const VALID = JSON.stringify([
  { word: "dreadping", etymology: "dread + ping", rationale: "names the avoidance loop", suggested_definition: "Anxiety at an unopened notification." },
  { word: "microlegacy", etymology: "micro- + legacy", rationale: "small unintended archive", suggested_definition: "An accidental digital legacy." },
]);

describe("aiConfigured", () => {
  it("is false without an API key", async () => {
    const { aiConfigured } = await loadAi({});
    expect(aiConfigured()).toBe(false);
  });

  it("is true with an API key", async () => {
    const { aiConfigured } = await loadAi({ AI_API_KEY: "sk-test" });
    expect(aiConfigured()).toBe(true);
  });

  it("is false for an empty-string key", async () => {
    const { aiConfigured } = await loadAi({ AI_API_KEY: "" });
    expect(aiConfigured()).toBe(false);
  });
});

describe("generateCandidates · configuration", () => {
  it("throws AI_NOT_CONFIGURED when no key is set, without calling the network", async () => {
    const { calls } = mockFetch(aiReply(VALID));
    const { generateCandidates } = await loadAi({});

    await expect(generateCandidates("some material")).rejects.toThrow("AI_NOT_CONFIGURED");
    expect(calls).toHaveLength(0);
  });
});

describe("generateCandidates · response parsing", () => {
  it("parses a bare JSON array", async () => {
    mockFetch(aiReply(VALID));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    const out = await generateCandidates("material about notifications");
    expect(out).toHaveLength(2);
    expect(out[0].word).toBe("dreadping");
    expect(out[1].suggested_definition).toBe("An accidental digital legacy.");
  });

  it("parses a ```json fenced block", async () => {
    mockFetch(aiReply("```json\n" + VALID + "\n```"));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    expect(await generateCandidates("material")).toHaveLength(2);
  });

  it("parses a bare fence without a language tag", async () => {
    mockFetch(aiReply("```\n" + VALID + "\n```"));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    expect(await generateCandidates("material")).toHaveLength(2);
  });

  it("extracts the array from surrounding commentary", async () => {
    mockFetch(aiReply(`Sure! Here are the coinages:\n${VALID}\nHope that helps.`));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    expect(await generateCandidates("material")).toHaveLength(2);
  });

  it("fills missing optional fields with empty strings", async () => {
    mockFetch(aiReply(JSON.stringify([{ word: "solo" }])));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    const [c] = await generateCandidates("material");
    expect(c).toEqual({ word: "solo", etymology: "", rationale: "", suggested_definition: "" });
  });

  it("drops entries that have no usable word", async () => {
    mockFetch(aiReply(JSON.stringify([{ word: "" }, { rationale: "no word" }, null, { word: "  kept  " }])));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    const out = await generateCandidates("material");
    expect(out).toHaveLength(1);
    expect(out[0].word).toBe("kept");
  });

  it("caps the result at five candidates", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ word: `coin${i}` }));
    mockFetch(aiReply(JSON.stringify(many)));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    expect(await generateCandidates("material")).toHaveLength(5);
  });

  it("coerces non-string optional fields to strings but drops a non-string word", async () => {
    mockFetch(aiReply(JSON.stringify([{ word: 42 }, { word: "kept", rationale: 7 }])));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    const out = await generateCandidates("material");
    expect(out).toHaveLength(1);
    expect(out[0].word).toBe("kept");
    expect(out[0].rationale).toBe("7");
  });

  it("throws AI_BAD_FORMAT when the reply contains no array", async () => {
    mockFetch(aiReply("I cannot help with that."));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_BAD_FORMAT");
  });

  it("throws AI_BAD_FORMAT when the reply is a JSON object instead of an array", async () => {
    mockFetch(aiReply('{"word": "single"}'));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_BAD_FORMAT");
  });

  it("throws AI_BAD_FORMAT rather than leaking a raw JSON parse error", async () => {
    // Regression: a malformed array used to surface SyntaxError text such as
    // "Unexpected token } in JSON at position 12" as the public error code.
    mockFetch(aiReply('[{"word": "broken",}]'));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_BAD_FORMAT");
  });

  it("throws AI_BAD_FORMAT for an empty array payload wrapped in prose", async () => {
    mockFetch(aiReply("Here you go: [] done"));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).resolves.toEqual([]);
  });
});

describe("generateCandidates · request and transport", () => {
  it("sends the configured model, an authorization header and the system prompt", async () => {
    const { calls } = mockFetch(aiReply(VALID));
    const { generateCandidates } = await loadAi({
      AI_API_KEY: "sk-secret",
      AI_BASE_URL: "https://llm.example/v1",
      AI_MODEL: "test-model",
    });

    await generateCandidates("material about notifications");
    const call = calls[0];
    expect(call.url).toBe("https://llm.example/v1/chat/completions");
    expect(call.method).toBe("POST");

    const body = JSON.parse(call.body ?? "{}");
    expect(body.model).toBe("test-model");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("material about notifications");
  });

  it("defaults to the OpenAI endpoint when AI_BASE_URL is unset", async () => {
    const { calls } = mockFetch(aiReply(VALID));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await generateCandidates("material");
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("truncates very long material before sending it", async () => {
    const { calls } = mockFetch(aiReply(VALID));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await generateCandidates("x".repeat(20_000));
    const body = JSON.parse(calls[0].body ?? "{}");
    expect(body.messages[1].content.length).toBeLessThan(6_200);
  });

  it("throws AI_HTTP_<status> when the provider returns an error", async () => {
    mockFetch(aiReply("", 500));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_HTTP_500");
  });

  it("surfaces a 401 from the provider distinctly", async () => {
    mockFetch(aiReply("", 401));
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_HTTP_401");
  });

  it("handles an empty choices array without throwing a TypeError", async () => {
    mockFetch({ other: () => new Response(JSON.stringify({ choices: [] }), { status: 200 }) });
    const { generateCandidates } = await loadAi({ AI_API_KEY: "sk-test" });

    await expect(generateCandidates("material")).rejects.toThrow("AI_BAD_FORMAT");
  });
});

describe("fetchUrlContent · protocol and host guards", () => {
  const ok = () => mockFetch({ other: () => new Response("<p>hello world</p>", { status: 200 }) });

  it("rejects a string that is not a URL", async () => {
    ok();
    const { fetchUrlContent } = await loadAi({});
    await expect(fetchUrlContent("not a url")).rejects.toThrow("BAD_URL");
  });

  it.each(["ftp://example.com/f", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,<script>"])(
    "rejects the non-HTTP protocol %s",
    async (url) => {
      ok();
      const { fetchUrlContent } = await loadAi({});
      await expect(fetchUrlContent(url)).rejects.toThrow("BAD_URL");
    }
  );

  it.each([
    "http://localhost/admin",
    "http://LOCALHOST/admin",
    "http://127.0.0.1/admin",
    "http://127.1/admin",
    "http://0.0.0.0/",
    "http://0/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://10.0.0.5/internal",
    "http://192.168.1.1/router",
    "http://172.16.0.1/internal",
    "http://172.31.255.255/internal",
    "http://169.254.169.254/latest/meta-data/",
    "http://printer.local/status",
  ])("refuses to fetch the internal address %s", async (url) => {
    const { calls } = ok();
    const { fetchUrlContent } = await loadAi({});
    await expect(fetchUrlContent(url)).rejects.toThrow("BAD_URL");
    expect(calls).toHaveLength(0);
  });

  it.each(["http://[::1]/admin", "http://[::ffff:127.0.0.1]/admin", "http://[fe80::1]/admin", "http://[fc00::1]/admin"])(
    "refuses the internal IPv6 address %s",
    async (url) => {
      const { calls } = ok();
      const { fetchUrlContent } = await loadAi({});
      await expect(fetchUrlContent(url)).rejects.toThrow("BAD_URL");
      expect(calls).toHaveLength(0);
    }
  );

  it.each(["http://172.15.0.1/", "http://172.32.0.1/", "http://11.0.0.1/", "http://192.169.1.1/"])(
    "allows the public address %s that merely looks private",
    async (url) => {
      ok();
      const { fetchUrlContent } = await loadAi({});
      await expect(fetchUrlContent(url)).resolves.toBeTruthy();
    }
  );

  it("allows an ordinary public HTTPS URL", async () => {
    ok();
    const { fetchUrlContent } = await loadAi({});
    await expect(fetchUrlContent("https://example.com/article")).resolves.toContain("hello world");
  });
});

describe("fetchUrlContent · redirects", () => {
  it("refuses to follow a redirect into an internal address", async () => {
    // Regression: redirect:"follow" let a public URL bounce the server into
    // 169.254.169.254 (cloud metadata) — the guard only checked the first hop.
    const { calls } = mockFetch({
      other: (url) =>
        url.includes("public.example")
          ? new Response("", { status: 302, headers: { Location: "http://169.254.169.254/latest/meta-data/" } })
          : new Response("secret metadata", { status: 200 }),
    });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://public.example/article")).rejects.toThrow("BAD_URL");
    expect(calls.some((c) => c.url.includes("169.254.169.254"))).toBe(false);
  });

  it("refuses a redirect to localhost", async () => {
    const { calls } = mockFetch({
      other: (url) =>
        url.includes("public.example")
          ? new Response("", { status: 301, headers: { Location: "http://localhost:3000/api/words" } })
          : new Response("internal", { status: 200 }),
    });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://public.example/x")).rejects.toThrow("BAD_URL");
    expect(calls.some((c) => c.url.includes("localhost"))).toBe(false);
  });

  it("follows a redirect to another public host", async () => {
    mockFetch({
      other: (url) =>
        url.includes("first.example")
          ? new Response("", { status: 302, headers: { Location: "https://second.example/final" } })
          : new Response("<p>final page</p>", { status: 200 }),
    });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://first.example/start")).resolves.toContain("final page");
  });

  it("gives up on a redirect loop instead of hanging", async () => {
    mockFetch({
      other: () => new Response("", { status: 302, headers: { Location: "https://loop.example/again" } }),
    });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://loop.example/start")).rejects.toThrow();
  });
});

describe("fetchUrlContent · content extraction", () => {
  it("strips script, style and noscript blocks before removing tags", async () => {
    mockFetch({
      other: () =>
        new Response(
          `<html><head><style>.a{color:red}</style><script>var secret="leak";</script></head>` +
            `<body><noscript>enable js</noscript><p>Visible text</p></body></html>`,
          { status: 200 }
        ),
    });
    const { fetchUrlContent } = await loadAi({});

    const text = await fetchUrlContent("https://example.com");
    expect(text).toContain("Visible text");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("enable js");
    expect(text).not.toContain("<p>");
  });

  it("decodes common HTML entities", async () => {
    mockFetch({
      other: () => new Response("<p>A &amp; B &quot;C&quot; it&#39;s &lt;tagged&gt; a&nbsp;b</p>", { status: 200 }),
    });
    const { fetchUrlContent } = await loadAi({});

    const text = await fetchUrlContent("https://example.com");
    expect(text).toBe('A & B "C" it\'s <tagged> a b');
  });

  it("collapses runs of whitespace", async () => {
    mockFetch({ other: () => new Response("<p>one\n\n\n   two\t\tthree</p>", { status: 200 }) });
    const { fetchUrlContent } = await loadAi({});

    expect(await fetchUrlContent("https://example.com")).toBe("one two three");
  });

  it("truncates the extracted text to 6000 characters", async () => {
    mockFetch({ other: () => new Response(`<p>${"word ".repeat(5000)}</p>`, { status: 200 }) });
    const { fetchUrlContent } = await loadAi({});

    const text = await fetchUrlContent("https://example.com");
    expect(text.length).toBeLessThanOrEqual(6000);
  });

  it("throws FETCH_<status> for a missing page", async () => {
    mockFetch({ other: () => new Response("nope", { status: 404 }) });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://example.com/gone")).rejects.toThrow("FETCH_404");
  });

  it("returns an empty string for an empty body without throwing", async () => {
    mockFetch({ other: () => new Response("", { status: 200 }) });
    const { fetchUrlContent } = await loadAi({});

    await expect(fetchUrlContent("https://example.com")).resolves.toBe("");
  });
});
