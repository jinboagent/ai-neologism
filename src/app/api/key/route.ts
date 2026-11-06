import { NextResponse } from "next/server";
import { canReview, issueKey, KEY_COOKIE, keyRecord, REVIEW_THRESHOLD, resolveKeyHash } from "@/lib/keys";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ has_key: false, review_threshold: REVIEW_THRESHOLD });
  const rec = await keyRecord(keyHash);
  if (!rec) return NextResponse.json({ has_key: false, review_threshold: REVIEW_THRESHOLD });
  return NextResponse.json({
    has_key: true,
    accepted_words: rec.accepted_words,
    review_threshold: REVIEW_THRESHOLD,
    can_review: await canReview(keyHash),
    created_at: rec.created_at,
  });
}

/**
 * Issue a fresh contribution key (browser cookie is set; the key is returned once).
 * Rate-limited per IP+UA fingerprint: keys are otherwise free to mint, and every
 * submission made with one costs a server-side novelty search — an unminted flood
 * of keys would bypass the per-key submission caps entirely (2026-11-06 QA pass).
 */
export async function POST(req = new Request("http://localhost/api/key")) {
  if (!rateLimit(`keymint:${voterFingerprint(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const { key } = await issueKey();
  const res = NextResponse.json({ key, message: "Save this key somewhere safe — it is shown only once. Lost key = lost standing." }, { status: 201 });
  res.cookies.set(KEY_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
