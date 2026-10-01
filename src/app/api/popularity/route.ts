import { NextResponse } from "next/server";
import { popularity, toPublic, type PopularityLens } from "@/lib/words";

export const dynamic = "force-dynamic";

const LENSES: PopularityLens[] = ["trending", "endorsed", "contested", "verified"];

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("lens") ?? "trending";
  const lens = (LENSES as string[]).includes(raw) ? (raw as PopularityLens) : "trending";
  return NextResponse.json({ lens, words: popularity(lens, 10).map(toPublic) });
}
