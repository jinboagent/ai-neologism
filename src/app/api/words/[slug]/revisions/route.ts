import { NextResponse } from "next/server";
import { qAll } from "@/lib/db";
import { resolveKeyHash } from "@/lib/keys";
import { getWord } from "@/lib/words";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const keyHash = await resolveKeyHash(req);
  const word = await getWord(slug, keyHash);
  if (!word) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const revisions = await qAll(
    "SELECT id, summary, created_at FROM revisions WHERE word_id = ? ORDER BY id DESC",
    [word.id]
  );
  return NextResponse.json({ revisions });
}
