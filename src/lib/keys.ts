import crypto from "node:crypto";
import { cookies } from "next/headers";
import { qGet, qRun } from "./db";

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
