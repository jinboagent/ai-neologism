import { beforeEach, describe, expect, it } from "vitest";
import {
  acceptedWordsCount,
  canReview,
  hashKey,
  issueKey,
  keyRecord,
  KEY_COOKIE,
  resolveKeyHash,
  REVIEW_THRESHOLD,
} from "@/lib/keys";
import { getDb } from "@/lib/db";
import { insertKey, resetDb } from "../helpers/db";

beforeEach(() => {
  resetDb();
});

describe("REVIEW_THRESHOLD", () => {
  it("is read from the environment with a default of 3", () => {
    expect(REVIEW_THRESHOLD).toBe(3);
  });

  it("exposes the cookie name used across the app", () => {
    expect(KEY_COOKIE).toBe("ck");
  });
});

describe("hashKey", () => {
  it("produces a 64-character lowercase sha256 digest", () => {
    const h = hashKey("ck_abc123");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashKey("ck_same")).toBe(hashKey("ck_same"));
  });

  it("distinguishes different keys", () => {
    expect(hashKey("ck_one")).not.toBe(hashKey("ck_two"));
  });

  it("trims surrounding whitespace so a pasted key still matches", () => {
    expect(hashKey("  ck_abc  ")).toBe(hashKey("ck_abc"));
    expect(hashKey("\tck_abc\n")).toBe(hashKey("ck_abc"));
  });

  it("does not leak the key itself", () => {
    expect(hashKey("ck_secret")).not.toContain("secret");
  });
});

describe("issueKey", () => {
  it("returns a ck_-prefixed key with 48 hex characters of entropy", () => {
    const { key } = issueKey();
    expect(key).toMatch(/^ck_[0-9a-f]{48}$/);
  });

  it("returns a key and its matching hash", () => {
    const { key, keyHash } = issueKey();
    expect(keyHash).toBe(hashKey(key));
  });

  it("persists the hash with zero accepted words", () => {
    const { keyHash } = issueKey();
    const rec = keyRecord(keyHash);
    expect(rec).toBeDefined();
    expect(rec?.accepted_words).toBe(0);
  });

  it("never stores the plaintext key", () => {
    const { key } = issueKey();
    const rows = getDb().prepare("SELECT * FROM keys").all() as Record<string, unknown>[];
    expect(JSON.stringify(rows)).not.toContain(key);
  });

  it("issues a fresh key on every call", () => {
    const a = issueKey();
    const b = issueKey();
    expect(a.key).not.toBe(b.key);
    expect(a.keyHash).not.toBe(b.keyHash);
  });
});

describe("keyRecord", () => {
  it("returns undefined for an unknown hash", () => {
    expect(keyRecord("nope")).toBeUndefined();
  });

  it("returns the stored record for a known hash", () => {
    insertKey("hash-a", 2);
    expect(keyRecord("hash-a")?.accepted_words).toBe(2);
  });
});

describe("canReview", () => {
  it("is false for an unknown key hash", () => {
    expect(canReview("stranger")).toBe(false);
  });

  it("is false below the threshold", () => {
    insertKey("k0", 0);
    insertKey("k2", REVIEW_THRESHOLD - 1);
    expect(canReview("k0")).toBe(false);
    expect(canReview("k2")).toBe(false);
  });

  it("is true at exactly the threshold", () => {
    insertKey("k3", REVIEW_THRESHOLD);
    expect(canReview("k3")).toBe(true);
  });

  it("is true above the threshold", () => {
    insertKey("k9", REVIEW_THRESHOLD + 6);
    expect(canReview("k9")).toBe(true);
  });
});

describe("acceptedWordsCount", () => {
  it("returns 0 for an unknown key rather than undefined", () => {
    expect(acceptedWordsCount("ghost")).toBe(0);
  });

  it("returns the stored count", () => {
    insertKey("k5", 5);
    expect(acceptedWordsCount("k5")).toBe(5);
  });
});

describe("resolveKeyHash", () => {
  it("hashes the X-Contribution-Key header when present", async () => {
    const req = new Request("http://localhost/api/key", {
      headers: { "x-contribution-key": "ck_header_value" },
    });
    expect(await resolveKeyHash(req)).toBe(hashKey("ck_header_value"));
  });

  it("is case-insensitive about the header name", async () => {
    const req = new Request("http://localhost/api/key", {
      headers: { "X-Contribution-Key": "ck_MiXeD" },
    });
    expect(await resolveKeyHash(req)).toBe(hashKey("ck_MiXeD"));
  });

  it("prefers the header over any ambient cookie", async () => {
    const req = new Request("http://localhost/api/key", {
      headers: { "x-contribution-key": "ck_wins" },
    });
    expect(await resolveKeyHash(req)).toBe(hashKey("ck_wins"));
  });

  it("returns null when called without a request outside a request scope", async () => {
    expect(await resolveKeyHash()).toBeNull();
  });

  it("returns null for a request carrying no key at all", async () => {
    const req = new Request("http://localhost/api/key");
    expect(await resolveKeyHash(req)).toBeNull();
  });
});
