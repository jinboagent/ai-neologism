import { NextResponse } from "next/server";
import { canReview, issueKey, KEY_COOKIE, keyRecord, REVIEW_THRESHOLD, resolveKeyHash } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ has_key: false, review_threshold: REVIEW_THRESHOLD });
  const rec = keyRecord(keyHash);
  if (!rec) return NextResponse.json({ has_key: false, review_threshold: REVIEW_THRESHOLD });
  return NextResponse.json({
    has_key: true,
    accepted_words: rec.accepted_words,
    review_threshold: REVIEW_THRESHOLD,
    can_review: canReview(keyHash),
    created_at: rec.created_at,
  });
}

/** Issue a fresh contribution key (browser cookie is set; the key is returned once). */
export async function POST() {
  const { key } = issueKey();
  const res = NextResponse.json({ key, message: "Save this key somewhere safe — it is shown only once. Lost key = lost standing." }, { status: 201 });
  res.cookies.set(KEY_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
