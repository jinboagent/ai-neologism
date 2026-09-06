// Pluggable AI adapter — any OpenAI-compatible chat-completions endpoint works
// (set AI_BASE_URL / AI_API_KEY / AI_MODEL in .env.local).

export type Candidate = {
  word: string;
  etymology: string;
  rationale: string;
  suggested_definition: string;
};

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const API_KEY = process.env.AI_API_KEY ?? "";
const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

export function aiConfigured(): boolean {
  return API_KEY.length > 0;
}

const SYSTEM_PROMPT = `You are the coining engine of AI Neologism, a curated dictionary of new English words for emerging social phenomena.

Before proposing words, reason in the tradition of great concept-namers: Zygmunt Bauman (liquid modernity), Byung-Chul Han (burnout society), Shoshana Zuboff (surveillance capitalism), Alvin Toffler (future shock), Richard Louv (nature-deficit disorder).

Craft rules for every candidate word:
- pronounceable, preferably 4 syllables or fewer
- built from productive English patterns: compounds, blends, or established affixes (-washing, -ism, -phobia, e-, cyber-, micro-, -fare, -dread)
- never a brand or trademark name
- must name a real, identifiable phenomenon present in the supplied material

Respond with ONLY a JSON array of 3-5 objects, each:
{"word": "...", "etymology": "roots/morphemes and why", "rationale": "one line on why this coinage fits the phenomenon", "suggested_definition": "one-sentence dictionary-style definition"}
No markdown fences, no commentary.`;

export async function generateCandidates(material: string): Promise<Candidate[]> {
  if (!aiConfigured()) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Material to coin words for:\n\n${material.slice(0, 6000)}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`AI_HTTP_${res.status}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return parseCandidates(text);
  } finally {
    clearTimeout(timeout);
  }
}

function parseCandidates(text: string): Candidate[] {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI_BAD_FORMAT");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    // Report the adapter's own error code; a raw SyntaxError message is not a contract
    // callers can branch on and leaks the provider's response text.
    throw new Error("AI_BAD_FORMAT");
  }
  if (!Array.isArray(parsed)) throw new Error("AI_BAD_FORMAT");
  return parsed
    .filter((c) => c && typeof c.word === "string" && c.word.trim().length > 0)
    .slice(0, 5)
    .map((c) => ({
      word: String(c.word).trim(),
      etymology: String(c.etymology ?? "").trim(),
      rationale: String(c.rationale ?? "").trim(),
      suggested_definition: String(c.suggested_definition ?? "").trim(),
    }));
}

const PRIVATE_V4_RE = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * True when a hostname resolves to something the server should never fetch on a
 * caller's behalf. WHATWG URL parsing already normalises decimal/hex/octal IPv4
 * (`http://2130706433/` → `127.0.0.1`), so only the IPv6 forms need extra handling.
 */
export function isBlockedHost(rawHost: string): boolean {
  let host = rawHost.toLowerCase().trim();
  // URL.hostname keeps the brackets around an IPv6 literal.
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (host === "localhost" || host === "0.0.0.0" || host === "::" || host === "::1") return true;
  if (/(^|\.)(localhost|local|internal)$/.test(host)) return true;

  if (host.includes(":")) {
    if (host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) {
      return true; // link-local fe80::/10
    }
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local fc00::/7
    const mapped = host.match(/^::ffff:(.+)$/);
    if (mapped) {
      const tail = mapped[1];
      if (tail.includes(".")) return isBlockedHost(tail);
      // Node serialises ::ffff:127.0.0.1 as ::ffff:7f00:1 — rebuild the dotted quad.
      const groups = tail.split(":");
      if (groups.length === 2) {
        const high = Number.parseInt(groups[0], 16);
        const low = Number.parseInt(groups[1], 16);
        if (Number.isFinite(high) && Number.isFinite(low)) {
          return isBlockedHost(`${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`);
        }
      }
      return true; // unparseable mapped address — fail closed
    }
    return false;
  }

  return PRIVATE_V4_RE.test(host);
}

const MAX_REDIRECTS = 5;

function assertSafeTarget(candidate: URL): void {
  if (!/^https?:$/.test(candidate.protocol)) throw new Error("BAD_URL");
  if (isBlockedHost(candidate.hostname)) throw new Error("BAD_URL");
}

/** Fetch a pasted web link and reduce it to readable text for the AI to work from. */
export async function fetchUrlContent(url: string): Promise<string> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new Error("BAD_URL");
  }
  assertSafeTarget(target);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    // Redirects are followed by hand so every hop is validated. With redirect:"follow"
    // a public URL could bounce the server into 169.254.169.254 or localhost, and the
    // host check would only ever have seen the first hop.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(target.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "AI-Neologism/1.0 (+coining research)" },
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`FETCH_${res.status}`);
        try {
          target = new URL(location, target);
        } catch {
          throw new Error("BAD_URL");
        }
        assertSafeTarget(target);
        continue;
      }

      if (!res.ok) throw new Error(`FETCH_${res.status}`);
      const html = await res.text();
      return htmlToText(html).slice(0, 6000);
    }
    throw new Error("BAD_URL"); // redirect loop
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
