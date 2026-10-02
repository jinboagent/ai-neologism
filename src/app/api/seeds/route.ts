import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
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
  const seeds = getDb()
    .prepare(
      "SELECT id, url, note, status, slug, created_at FROM seeds WHERE contributor_key_hash = ? AND status != 'dismissed' ORDER BY id DESC"
    )
    .all(keyHash) as SeedRow[];
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
    const issued = issueKey();
    keyHash = issued.keyHash;
    newKey = issued.key;
  }
  if (!rateLimit(`seeds:${keyHash}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many seeds added this hour." }, { status: 429 });
  }

  const db = getDb();
  const pending = db
    .prepare("SELECT COUNT(*) AS n FROM seeds WHERE contributor_key_hash = ? AND status = 'pending'")
    .get(keyHash) as { n: number };
  if (pending.n >= MAX_PENDING_SEEDS) {
    return NextResponse.json(
      { error: "SEEDS_FULL", message: `You already have ${MAX_PENDING_SEEDS} pending seeds — coin or dismiss some first.` },
      { status: 400 }
    );
  }

  const existing = db
    .prepare("SELECT id, url, note, status, slug, created_at FROM seeds WHERE contributor_key_hash = ? AND url = ?")
    .get(keyHash, rawUrl) as SeedRow | undefined;
  if (existing) {
    return NextResponse.json({ seed: existing, duplicate: true });
  }

  const note = (body.note ?? "").trim().slice(0, 500);
  const info = db
    .prepare("INSERT INTO seeds (url, note, contributor_key_hash) VALUES (?, ?, ?)")
    .run(rawUrl, note, keyHash);
  const seed = db
    .prepare("SELECT id, url, note, status, slug, created_at FROM seeds WHERE id = ?")
    .get(info.lastInsertRowid) as SeedRow;

  const res = NextResponse.json({ seed }, { status: 201 });
  if (newKey) {
    res.cookies.set(KEY_COOKIE, newKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
