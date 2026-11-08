// Small crypto helpers shared by secret-comparison call sites.

import crypto from "node:crypto";

/**
 * Constant-time string comparison for secrets (cron secrets, tokens). Length
 * differences still exit early — unavoidable with timingSafeEqual and harmless
 * (the length of a secret is not the secret) — but content comparison no longer
 * leaks through timing (security report F4).
 */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
