import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch } from "../helpers/fetch";

// N8 (security report 2026-11-14): seed-ingestion URL validation must resolve
// DNS and reject hostnames whose ANY resolved address is private — parity with
// fetchUrlContent's fetch-time check.

// The DNS mock mirrors the one in ai.test.ts: *.private.example resolves to a
// loopback address, everything else to a public address.
vi.mock("node:dns/promises", () => ({
  default: {
    lookup: async (host: string) =>
      host.endsWith(".private.example") ? [{ address: "127.0.0.1", family: 4 }] : [{ address: "93.184.216.34", family: 4 }],
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadAi() {
  vi.resetModules();
  return import("@/lib/ai");
}

describe("validatePublicUrl · DNS resolution (N8)", () => {
  it("rejects a string-safe hostname that resolves to a private address", async () => {
    const { validatePublicUrl } = await loadAi();
    mockFetch({});
    // 127.0.0.1.private.example passes the string check but resolves private
    await expect(validatePublicUrl("http://127.0.0.1.private.example/seed")).rejects.toThrow("BAD_URL");
  });

  it("rejects a private string target outright", async () => {
    const { validatePublicUrl } = await loadAi();
    await expect(validatePublicUrl("http://127.0.0.1/x")).rejects.toThrow("BAD_URL");
    await expect(validatePublicUrl("http://localhost/x")).rejects.toThrow("BAD_URL");
  });

  it("accepts a public https URL that resolves cleanly", async () => {
    const { validatePublicUrl } = await loadAi();
    mockFetch({});
    const url = await validatePublicUrl("https://example.com/article");
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("example.com");
  });

  it("throws BAD_URL for an unparseable input", async () => {
    const { validatePublicUrl } = await loadAi();
    await expect(validatePublicUrl("not a url")).rejects.toThrow("BAD_URL");
  });
});
