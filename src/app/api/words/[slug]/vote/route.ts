import { NextResponse } from "next/server";
import { qGet } from "@/lib/db";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";
import { recordVote } from "@/lib/words";

export const dynamic = "force-dynamic";

/** Current vote state for this caller — lets the widget initialise from the
 * server so a returning voter's toggle semantics match what is recorded. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fingerprint = voterFingerprint(req);
  const word = await qGet<{ id: number; use_votes: number; work_votes: number }>(
    "SELECT id, use_votes, work_votes FROM words WHERE slug = ? AND status='published'",
    [slug]
  );
  if (!word) return NextResponse.json({ error: "NOT_FOUND", message: "Word not found or not published." }, { status: 404 });
  const my = await qGet<{ vote: number }>("SELECT vote FROM votes WHERE word_id = ? AND voter_hash = ?", [
    word.id,
    fingerprint,
  ]);
  return NextResponse.json({
    my_vote: my?.vote ?? 0,
    use_votes: word.use_votes,
    work_votes: word.work_votes,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fingerprint = voterFingerprint(req);
  if (!rateLimit(`vote:${fingerprint}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many votes; slow down." }, { status: 429 });
  }
  let body: { vote?: unknown };
  try {
    body = (await req.json()) as { vote?: unknown };
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  // Strict comparison, not Number(body.vote): Number([1]) === 1 and Number(null) === 0,
  // so coercing first would accept an array or a null as a real vote.
  const vote = body.vote;
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: "INVALID_VOTE", message: "vote must be 1 (would use) or -1 (needs work)." }, { status: 400 });
  }
  const result = await recordVote(slug, fingerprint, vote);
  if (!result.ok) return NextResponse.json({ error: "NOT_FOUND", message: "Word not found or not published." }, { status: 404 });
  return NextResponse.json(result);
}
