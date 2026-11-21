import { NextResponse } from "next/server";
import { readGate } from "@/lib/keys";
import { popularity, toPublic, type PopularityLens } from "@/lib/words";
import { isLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

const LENSES: PopularityLens[] = ["trending", "endorsed", "contested", "verified"];

export async function GET(req: Request) {
  const gate = await readGate(req);
  if (!gate.ok) return gate.response;
  const url = new URL(req.url);
  const raw = url.searchParams.get("lens") ?? "trending";
  const lens = (LENSES as string[]).includes(raw) ? (raw as PopularityLens) : "trending";
  const langRaw = url.searchParams.get("language") ?? "";
  if (langRaw && !isLocale(langRaw)) {
    return NextResponse.json({ error: "BAD_LANGUAGE", message: `Unknown language: ${langRaw}` }, { status: 400 });
  }
  // Keyed response — never shared at the edge (see keys.ts readGate).
  return NextResponse.json(
    { lens, words: (await popularity(lens, 10, langRaw || undefined)).map(toPublic) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
