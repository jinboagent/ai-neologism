import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bucketCount, rateLimit, voterFingerprint } from "@/lib/ratelimit";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** Every test uses its own identity prefix so the shared bucket map cannot leak state. */
let seq = 0;
const identity = () => `id-${++seq}`;

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/words/x/vote", { method: "POST", headers });
}

describe("rateLimit", () => {
  it("allows exactly `limit` calls inside the window", async () => {
    const id = identity();
    const allowed = Array.from({ length: 12 }, () => rateLimit(id, 10, 60_000));
    expect(allowed.filter(Boolean)).toHaveLength(10);
    expect(allowed[9]).toBe(true);
    expect(allowed[10]).toBe(false);
  });

  it("blocks every call after the limit until the window expires", async () => {
    const id = identity();
    for (let i = 0; i < 5; i++) rateLimit(id, 5, 60_000);
    expect(rateLimit(id, 5, 60_000)).toBe(false);
    expect(rateLimit(id, 5, 60_000)).toBe(false);
  });

  it("keeps a separate budget per identity", async () => {
    const a = identity();
    const b = identity();
    for (let i = 0; i < 3; i++) rateLimit(a, 3, 60_000);
    expect(rateLimit(a, 3, 60_000)).toBe(false);
    expect(rateLimit(b, 3, 60_000)).toBe(true);
  });

  it("resets the budget once the window has elapsed", async () => {
    vi.useFakeTimers();
    const id = identity();
    expect(rateLimit(id, 2, 1_000)).toBe(true);
    expect(rateLimit(id, 2, 1_000)).toBe(true);
    expect(rateLimit(id, 2, 1_000)).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(id, 2, 1_000)).toBe(true);
  });

  it("still blocks just before the window expires", async () => {
    vi.useFakeTimers();
    const id = identity();
    rateLimit(id, 1, 1_000);
    vi.advanceTimersByTime(999);
    expect(rateLimit(id, 1, 1_000)).toBe(false);
  });

  it("treats a limit of 0 as always denied", async () => {
    const id = identity();
    expect(rateLimit(id, 0, 60_000)).toBe(false);
  });

  it("keeps the bucket map bounded as distinct identities accumulate", async () => {
    vi.useFakeTimers();
    // Regression: identities are IP+UA fingerprints, so a public site gained one
    // map entry per visitor forever — expired buckets were never evicted.
    for (let i = 0; i < 40_000; i++) rateLimit(`sweep-${i}`, 1, 1_000);
    expect(bucketCount()).toBeLessThanOrEqual(10_001);

    vi.advanceTimersByTime(60_000); // every window lapses
    rateLimit("after-expiry", 1, 1_000);
    expect(bucketCount()).toBe(1);
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

  it("differs when the user agent differs", async () => {
    const a = voterFingerprint(request({ "x-forwarded-for": "203.0.113.1", "user-agent": "UA-1" }));
    const b = voterFingerprint(request({ "x-forwarded-for": "203.0.113.1", "user-agent": "UA-2" }));
    expect(a).not.toBe(b);
  });

  it("uses the last entry of a multi-hop x-forwarded-for chain — the value our own proxy appended", async () => {
    const chained = voterFingerprint(request({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" }));
    const alone = voterFingerprint(request({ "x-forwarded-for": "70.41.3.18" }));
    expect(chained).toBe(alone);
  });

  it("ignores client-spoofed leading entries because only the proxy-appended last hop counts", async () => {
    // Finding #2: a client could previously mint fresh rate-limit identities per
    // request. With the last entry trusted, prepending a fake IP changes nothing.
    const spoofed = voterFingerprint(request({ "x-forwarded-for": "1.2.3.4, 70.41.3.18" }));
    const clean = voterFingerprint(request({ "x-forwarded-for": "70.41.3.18" }));
    expect(spoofed).toBe(clean);
  });

  it("trims whitespace around the forwarded IP", async () => {
    const spaced = voterFingerprint(request({ "x-forwarded-for": "  203.0.113.9  " }));
    const plain = voterFingerprint(request({ "x-forwarded-for": "203.0.113.9" }));
    expect(spaced).toBe(plain);
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const viaRealIp = voterFingerprint(request({ "x-real-ip": "198.51.100.4" }));
    const viaForwarded = voterFingerprint(request({ "x-forwarded-for": "198.51.100.4" }));
    expect(viaRealIp).toBe(viaForwarded);
  });

  it("produces a usable fingerprint with no identifying headers at all", async () => {
    expect(voterFingerprint(request())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("collapses every caller to one local identity when no proxy is trusted (the default)", async () => {
    vi.stubEnv("TRUST_PROXY", "");
    const a = voterFingerprint(request({ "x-forwarded-for": "203.0.113.1", "user-agent": "UA" }));
    const b = voterFingerprint(request({ "x-forwarded-for": "203.0.113.2", "user-agent": "UA" }));
    expect(a).toBe(b);
  });

  it("does not expose the raw IP in the fingerprint", async () => {
    expect(voterFingerprint(request({ "x-forwarded-for": "203.0.113.77" }))).not.toContain("203.0.113.77");
  });
});
