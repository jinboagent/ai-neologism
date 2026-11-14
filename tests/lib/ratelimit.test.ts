import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";
import { qAll } from "@/lib/db";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** Every test uses its own identity prefix so the shared rate_limits table cannot leak state. */
let seq = 0;
const identity = () => `id-${++seq}`;

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/words/x/vote", { method: "POST", headers });
}

describe("rateLimit", () => {
  it("allows exactly `limit` calls inside the window", async () => {
    const id = identity();
    const allowed = await Promise.all(Array.from({ length: 12 }, () => rateLimit(id, 10, 60_000)));
    expect(allowed.filter(Boolean)).toHaveLength(10);
    expect(allowed[9]).toBe(true);
    expect(allowed[10]).toBe(false);
  });

  it("blocks every call after the limit until the window expires", async () => {
    const id = identity();
    for (let i = 0; i < 5; i++) await rateLimit(id, 5, 60_000);
    expect(await rateLimit(id, 5, 60_000)).toBe(false);
    expect(await rateLimit(id, 5, 60_000)).toBe(false);
  });

  it("keeps a separate budget per identity", async () => {
    const a = identity();
    const b = identity();
    for (let i = 0; i < 3; i++) await rateLimit(a, 3, 60_000);
    expect(await rateLimit(a, 3, 60_000)).toBe(false);
    expect(await rateLimit(b, 3, 60_000)).toBe(true);
  });

  it("resets the budget once the window has elapsed", async () => {
    vi.useFakeTimers();
    const id = identity();
    expect(await rateLimit(id, 2, 1_000)).toBe(true);
    expect(await rateLimit(id, 2, 1_000)).toBe(true);
    expect(await rateLimit(id, 2, 1_000)).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(await rateLimit(id, 2, 1_000)).toBe(true);
  });

  it("still blocks before the current aligned window ends", async () => {
    // Windows are epoch-aligned (floor(now/window)), so "just before it ends"
    // means just before the next boundary — computed, not assumed.
    vi.useFakeTimers();
    const id = identity();
    const windowMs = 1_000;
    await rateLimit(id, 1, windowMs);
    const msToBoundary = windowMs - (Date.now() % windowMs);
    vi.advanceTimersByTime(msToBoundary > 1 ? msToBoundary - 1 : 0);
    expect(await rateLimit(id, 1, windowMs)).toBe(false);
  });

  it("treats a limit of 0 as always denied", async () => {
    const id = identity();
    expect(await rateLimit(id, 0, 60_000)).toBe(false);
  });

  it("sweeps abandoned identities so the table stays bounded", async () => {
    // The DB-backed limiter must not grow one row per visitor forever: rows for
    // identities that stop calling are pruned by the periodic sweep (F3).
    for (let i = 0; i < 50; i++) await rateLimit(`sweep-${i}`, 1, 1_000);
    vi.useFakeTimers();
    vi.advanceTimersByTime(25 * 60 * 60 * 1000); // beyond the 24h sweep cutoff
    for (let i = 0; i < 1000; i++) await rateLimit(`pad-${i}`, 1, 60_000); // sweep fires at call 1000
    const left = await qAll<{ n: number }>("SELECT COUNT(*) AS n FROM rate_limits WHERE identity LIKE 'sweep-%'");
    expect(left[0].n).toBe(0);
  });
});

describe("voterFingerprint", () => {
  // The header-aware behaviour only exists behind a trusted proxy; stubbing it
  // here makes these tests exercise the XFF parsing rather than the constant
  // "local" identity the untrusted default produces.
  beforeEach(() => {
    vi.stubEnv("TRUST_PROXY", "true");
  });

  it("is stable for identical headers", async () => {
    const h = { "x-forwarded-for": "203.0.113.7", "user-agent": "TestAgent/1.0" };
    expect(voterFingerprint(request(h))).toBe(voterFingerprint(request(h)));
  });

  it("is a 64-character hex digest", async () => {
    expect(voterFingerprint(request())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the IP differs", async () => {
    const a = voterFingerprint(request({ "x-forwarded-for": "203.0.113.1", "user-agent": "UA" }));
    const b = voterFingerprint(request({ "x-forwarded-for": "203.0.113.2", "user-agent": "UA" }));
    expect(a).not.toBe(b);
  });

  it("ignores the User-Agent (N10: IP-only identity — UA rotation must not mint identities)", async () => {
    const a = voterFingerprint(request({ "x-forwarded-for": "203.0.113.7", "user-agent": "UA-A" }));
    const b = voterFingerprint(request({ "x-forwarded-for": "203.0.113.7", "user-agent": "UA-B" }));
    expect(a).toBe(b);
  });
});
