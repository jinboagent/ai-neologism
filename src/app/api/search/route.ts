import { NextResponse } from "next/server";
import { searchWords, toPublic } from "@/lib/words";
import { isLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const langRaw = url.searchParams.get("language") ?? "";
  if (langRaw && !isLocale(langRaw)) {
    return NextResponse.json({ error: "BAD_LANGUAGE", message: `Unknown language: ${langRaw}` }, { status: 400 });
  }
  if (!q.trim()) return NextResponse.json({ query: q, words: [] });
  const words = await searchWords(q, 30, langRaw || undefined);
  return NextResponse.json({ query: q, words: words.map(toPublic) });
}
