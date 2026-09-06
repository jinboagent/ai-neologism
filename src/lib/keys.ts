import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const KEY_COOKIE = "ck";
export const REVIEW_THRESHOLD = Number(process.env.REVIEW_THRESHOLD ?? 3);

export function issueKey(): { key: string; keyHash: string } {
  const key = "ck_" + crypto.randomBytes(24).toString("hex");
  const keyHash = hashKey(key);
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO keys (key_hash) VALUES (?)").run(keyHash);
  return { key, keyHash };
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

export function keyRecord(keyHash: string) {
  return getDb()
    .prepare("SELECT key_hash, accepted_words, created_at FROM keys WHERE key_hash = ?")
    .get(keyHash) as { key_hash: string; accepted_words: number; created_at: string } | undefined;
}

export function canReview(keyHash: string): boolean {
  const rec = keyRecord(keyHash);
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

export function acceptedWordsCount(keyHash: string): number {
  return keyRecord(keyHash)?.accepted_words ?? 0;
}
