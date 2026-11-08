// Fixed-window rate limiter backed by the shared database (the local file DB in
// development, Turso in production). A process-local Map cannot work on
// serverless: every lambda instance keeps its own buckets and cold starts reset
// them, so any parallelism bypasses the cap entirely (security report F3). The
// database is shared by every instance, which makes the counters global.
//
// Fail-closed: if the limiter cannot reach the database, requests are denied —
// a limiter that fails open is not a limiter.

import crypto from "node:crypto";
import { ensureSchema, getDb } from "./db";

// Abandoned identities are swept on every SWEEP_EVERY-th call so the table
// stays bounded even under a flood of unique fingerprints. The longest window
// in use is one hour, so a 24h cutoff is generous.
const SWEEP_EVERY = 1000;
const SWEEP_CUTOFF_MS = 24 * 60 * 60 * 1000;
let callsSinceSweep = 0;

export async function rateLimit(identity: string, limit: number, windowMs: number): Promise<boolean> {
  if (!Number.isFinite(limit) || limit < 1) return false;

  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  try {
    await ensureSchema();
    const db = getDb();
    // Drop this identity's lapsed windows — one row per identity per window.
    await db.execute({
      sql: "DELETE FROM rate_limits WHERE identity = ? AND window_start < ?",
      args: [identity, windowStart],
    });
    const res = await db.execute({
      sql: `INSERT INTO rate_limits (identity, window_start, count) VALUES (?, ?, 1)
            ON CONFLICT(identity, window_start) DO UPDATE SET count = count + 1
            RETURNING count`,
      args: [identity, windowStart],
    });
    const count = Number(res.rows[0]?.count ?? 0);

    if (++callsSinceSweep >= SWEEP_EVERY) {
      callsSinceSweep = 0;
      await db.execute({
        sql: "DELETE FROM rate_limits WHERE window_start < ?",
        args: [Date.now() - SWEEP_CUTOFF_MS],
      });
    }
    return count <= limit;
  } catch {
    return false; // fail-closed (F3)
  }
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
