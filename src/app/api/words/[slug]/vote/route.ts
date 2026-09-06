import { NextResponse } from "next/server";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";
import { recordVote } from "@/lib/words";

export const dynamic = "force-dynamic";

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
  const result = recordVote(slug, fingerprint, vote);
  if (!result.ok) return NextResponse.json({ error: "NOT_FOUND", message: "Word not found or not published." }, { status: 404 });
  return NextResponse.json(result);
}
