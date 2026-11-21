import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { qGet, qRun } from "./db";
import { rateLimit } from "./ratelimit";

export const KEY_COOKIE = "ck";
export const REVIEW_THRESHOLD = Number(process.env.REVIEW_THRESHOLD ?? 3);

export async function issueKey(): Promise<{ key: string; keyHash: string }> {
  const key = "ck_" + crypto.randomBytes(24).toString("hex");
  const keyHash = hashKey(key);
  await qRun("INSERT OR IGNORE INTO keys (key_hash) VALUES (?)", [keyHash]);
  return { key, keyHash };
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

export async function keyRecord(keyHash: string) {
  return qGet<{ key_hash: string; accepted_words: number; created_at: string }>(
    "SELECT key_hash, accepted_words, created_at FROM keys WHERE key_hash = ?",
    [keyHash]
  );
}

export async function canReview(keyHash: string): Promise<boolean> {
  const rec = await keyRecord(keyHash);
  return !!rec && rec.accepted_words >= REVIEW_THRESHOLD;
}

/** Resolve the caller's contribution key hash from the API header or browser cookie. */
export async function resolveKeyHash(req?: Request): Promise<string | null> {
  const header = req?.headers.get("x-contribution-key");
  if (header) return hashKey(header);
  try {
    const jar = await cookies();
    const cookieKey = jar.get(KEY_COOKIE)?.value;
    if (cookieKey) return hashKey(cookieKey);
  } catch {
    // cookies() unavailable outside a request scope
  }
  return null;
}

export async function acceptedWordsCount(keyHash: string): Promise<number> {
  return (await keyRecord(keyHash))?.accepted_words ?? 0;
}

/** Resolve a READ key: header or cookie, AND it must be a real issued key —
 * hashing alone would accept any string the caller invents. The public read
 * API gates on this (owner decision 2026-11-21: writes were always keyed, now
 * reads are too — free keys, traceable, revocable). */
export async function validReadKey(req?: Request): Promise<string | null> {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return null;
  return (await keyRecord(keyHash)) ? keyHash : null;
}

export type ReadGate = { ok: true; keyHash: string } | { ok: false; response: NextResponse };

/**
 * Shared gate for the public read API: a valid contribution key is required
 * and reads are per-key rate-limited (a minted key must not be able to dump
 * the whole dictionary at line speed — 120 reads/min is far above any real
 * agent's usage). Responses are explicitly uncacheable: the edge must never
 * hand a keyed response to a keyless caller, and Vercel's CDN does not vary
 * on custom headers.
 */
export async function readGate(req: Request, limit = 120, windowMs = 60_000): Promise<ReadGate> {
  const keyHash = await validReadKey(req);
  if (!keyHash) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "KEY_REQUIRED",
          message:
            "Reads need a free contribution key. Mint one with POST /api/key (the key is in the response body, shown once), then send it on every read as the X-Contribution-Key header. Browsers that submitted before may rely on their cookie.",
        },
        { status: 401, headers: { "Cache-Control": "private, no-store" } }
      ),
    };
  }
  if (!(await rateLimit(`read:${keyHash}`, limit, windowMs))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "RATE_LIMITED", message: "Read rate limit exceeded — slow down or cache on your side." },
        { status: 429, headers: { "Cache-Control": "private, no-store" } }
      ),
    };
  }
  return { ok: true, keyHash };
}
