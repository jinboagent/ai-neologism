import { NextResponse } from "next/server";
import { searchWords } from "@/lib/words";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ query: q, words: [] });
  const words = searchWords(q, 30);
  return NextResponse.json({ query: q, words });
}
