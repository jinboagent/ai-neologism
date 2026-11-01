// Input sanitisation for stored content. Two defences per URL-shaped field:
//  1. write-time — only http(s) URLs are stored at all (finding #1: javascript:/
//     data: hrefs would otherwise execute from word pages);
//  2. length clamps on every stored string, so no field is unbounded (finding #3).

import type { Alternative, Reference, Verification, VerificationQuery } from "./words";
import { LIMITS } from "./limits";

export function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (!s || s.length > 800) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeUrlOrNull(raw: unknown): string | null {
  return isSafeHttpUrl(raw) ? (raw as string).trim() : null;
}

export function clampText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

const REFERENCE_TYPES = ["news", "academic", "essay", "social", "internal"] as const;

export function sanitizeReferences(raw: unknown, max = LIMITS.references): Reference[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((r): Reference => {
    const ref = (r ?? {}) as Record<string, unknown>;
    const type = typeof ref.type === "string" && (REFERENCE_TYPES as readonly string[]).includes(ref.type)
      ? (ref.type as Reference["type"])
      : "essay";
    return {
      type,
      title: clampText(ref.title, 300),
      author: clampText(ref.author, 200) || undefined,
      outlet: clampText(ref.outlet, 200) || undefined,
      date: clampText(ref.date, 40) || undefined,
      url: safeUrlOrNull(ref.url) ?? undefined,
      excerpt: clampText(ref.excerpt, 1000) || undefined,
    };
  });
}

export function sanitizeAlternatives(raw: unknown, max = LIMITS.alternatives): Alternative[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((a): Alternative => {
    const alt = (a ?? {}) as Record<string, unknown>;
    return { word: clampText(alt.word, 80), rationale: clampText(alt.rationale, 300) };
  }).filter((a) => a.word.length > 0);
}

export function sanitizeSlugList(raw: unknown, max = LIMITS.relatedWords): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => (typeof s === "string" ? s.trim().slice(0, 80) : ""))
    .filter(Boolean)
    .slice(0, max);
}

export function sanitizeCategories(raw: unknown, allowed: readonly string[], max = LIMITS.categories): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => (typeof c === "string" ? c.trim().slice(0, 60) : ""))
    .filter((c) => allowed.includes(c))
    .slice(0, max);
}

const VERDICTS = ["NEW", "NEAR_EXISTING", "EXISTS", "UNVERIFIED"];

/** Clamp a verification object coming from any channel. Never trusted for the
 * verdict itself — see the server-authoritative re-run in POST /api/words —
 * but anything we do store must be size-bounded and url-safe. */
export function sanitizeVerification(raw: unknown): Verification {
  const v = (raw ?? {}) as Record<string, unknown>;
  const verdict = typeof v.verdict === "string" && VERDICTS.includes(v.verdict)
    ? (v.verdict as Verification["verdict"])
    : "UNVERIFIED";
  const queries: VerificationQuery[] = Array.isArray(v.queries)
    ? v.queries.slice(0, 10).map((q) => {
        const query = (q ?? {}) as Record<string, unknown>;
        return {
          query: clampText(query.query, 200),
          results_checked: Number.isFinite(Number(query.results_checked)) ? Number(query.results_checked) : 0,
          meaningful_matches: Number.isFinite(Number(query.meaningful_matches)) ? Number(query.meaningful_matches) : 0,
        };
      })
    : [];
  const closest = Array.isArray(v.closest_matches)
    ? v.closest_matches.slice(0, 3).map((m) => {
        const match = (m ?? {}) as Record<string, unknown>;
        return { url: safeUrlOrNull(match.url) ?? undefined, note: clampText(match.note, 300) };
      })
    : [];
  return {
    verdict,
    checked_at: clampText(v.checked_at, 40) || undefined,
    method: clampText(v.method, 200) || undefined,
    queries,
    closest_matches: closest,
    note: clampText(v.note, 500) || undefined,
  };
}
