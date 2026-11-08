import { NextResponse } from "next/server";
import { qAll, qGet, qRun } from "@/lib/db";
import { validatePublicUrl } from "@/lib/ai";
import { issueKey, KEY_COOKIE, resolveKeyHash } from "@/lib/keys";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

type SeedRow = {
  id: number;
  url: string;
  note: string;
  status: string;
  slug: string | null;
  created_at: string;
};

const MAX_PENDING_SEEDS = 50;

export async function GET(req: Request) {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ error: "NO_KEY", seeds: [] }, { status: 401 });
  const seeds = await qAll<SeedRow>(
    "SELECT id, url, note, status, slug, created_at FROM seeds WHERE contributor_key_hash = ? AND status != 'dismissed' ORDER BY id DESC",
    [keyHash]
  );
  return NextResponse.json({ seeds });
}

/** Add a harvested link to the private seed queue (a contribution key is issued if absent). */
export async function POST(req: Request) {
  let body: { url?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) return NextResponse.json({ error: "URL_REQUIRED", message: "Paste a link to an article, thread, or paper." }, { status: 400 });

  try {
    validatePublicUrl(rawUrl);
  } catch {
    return NextResponse.json({ error: "BAD_URL", message: "That doesn't look like a public http(s) link." }, { status: 400 });
  }

  let keyHash = await resolveKeyHash(req);
  let newKey: string | undefined;
  if (!keyHash) {
    const issued = await issueKey();
    keyHash = issued.keyHash;
    newKey = issued.key;
  }
  if (!(await rateLimit(`seeds:${keyHash}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many seeds added this hour." }, { status: 429 });
  }

  const pending = await qGet<{ n: number }>(
    "SELECT COUNT(*) AS n FROM seeds WHERE contributor_key_hash = ? AND status = 'pending'",
    [keyHash]
  );
  if ((pending?.n ?? 0) >= MAX_PENDING_SEEDS) {
    return NextResponse.json(
      { error: "SEEDS_FULL", message: `You already have ${MAX_PENDING_SEEDS} pending seeds — coin or dismiss some first.` },
      { status: 400 }
    );
  }

  const existing = await qGet<SeedRow>(
    "SELECT id, url, note, status, slug, created_at FROM seeds WHERE contributor_key_hash = ? AND url = ?",
    [keyHash, rawUrl]
  );
  if (existing) {
    return NextResponse.json({ seed: existing, duplicate: true });
  }

  const note = (body.note ?? "").trim().slice(0, 500);
  const info = await qRun("INSERT INTO seeds (url, note, contributor_key_hash) VALUES (?, ?, ?)", [rawUrl, note, keyHash]);
  const seed = await qGet<SeedRow>("SELECT id, url, note, status, slug, created_at FROM seeds WHERE id = ?", [info.lastInsertRowid]);

  const res = NextResponse.json({ seed }, { status: 201 });
  if (newKey) {
    res.cookies.set(KEY_COOKIE, newKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
