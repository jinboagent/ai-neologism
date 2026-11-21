import { NextResponse } from "next/server";
import { readGate } from "@/lib/keys";
import { searchWords, toPublic } from "@/lib/words";
import { isLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await readGate(req);
  if (!gate.ok) return gate.response;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const langRaw = url.searchParams.get("language") ?? "";
  if (langRaw && !isLocale(langRaw)) {
    return NextResponse.json({ error: "BAD_LANGUAGE", message: `Unknown language: ${langRaw}` }, { status: 400 });
  }
  if (!q.trim()) return NextResponse.json({ query: q, words: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const words = await searchWords(q, 30, langRaw || undefined);
  // Keyed response — never shared at the edge (see keys.ts readGate).
  return NextResponse.json({ query: q, words: words.map(toPublic) }, { headers: { "Cache-Control": "private, no-store" } });
}
