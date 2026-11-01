// Simple fixed-window in-memory rate limiter (per process — fine for v1 scale).

import crypto from "node:crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Identities are IP+UA fingerprints, so the map gains an entry for every distinct
// visitor. Sweep expired buckets at most once per interval and hard-cap the map so
// a flood of unique identities cannot grow it without bound.
const MAX_BUCKETS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

function sweepExpired(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [identity, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(identity);
  }
}

export function rateLimit(identity: string, limit: number, windowMs: number): boolean {
  if (!Number.isFinite(limit) || limit < 1) return false;

  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) {
    sweepExpired(now);
    // Still full: every window is live. Drop the oldest to keep memory bounded.
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next();
      if (!oldest.done) buckets.delete(oldest.value);
    }
  }

  const bucket = buckets.get(identity);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(identity, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Live bucket count — exposed so unbounded growth is observable rather than silent. */
export function bucketCount(): number {
  return buckets.size;
}

/**
 * Caller fingerprint for rate limits and vote de-duplication.
 *
 * The client-controlled `X-Forwarded-For` header is trusted ONLY when the
 * operator sets TRUST_PROXY=true (i.e. the app runs behind a platform such as
 * Vercel that overwrites/appends the real client IP). Without it — the default
 * local/self-hosted case — every caller shares the "local" identity instead of
 * being able to mint a fresh one per request (finding #2). On a trusted proxy
 * the LAST entry of the list is used: it is the value our own proxy appended,
 * which client-supplied spoofing cannot reach.
 */
export function voterFingerprint(req: Request): string {
  let ip = "local";
  if (process.env.TRUST_PROXY === "true") {
    const xff = req.headers.get("x-forwarded-for");
    const real = req.headers.get("x-real-ip");
    if (xff) {
      const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
      ip = parts[parts.length - 1] ?? real ?? "unknown";
    } else {
      ip = real ?? "unknown";
    }
  }
  const ua = req.headers.get("user-agent") ?? "unknown";
  return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex");
}
