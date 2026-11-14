import { NextResponse } from "next/server";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";
import { safeEqual } from "@/lib/secure";
import { verifyNovelty } from "@/lib/verify";
import { isLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Operator bypass: batch runs (scripts/batch-coin.mjs) authenticate with the
  // CRON_SECRET so a 25-word editorial run isn't strangled by the per-IP cap.
  const bypass = !!process.env.CRON_SECRET && safeEqual(req.headers.get("x-cron-secret") ?? "", process.env.CRON_SECRET);
  const fingerprint = voterFingerprint(req);
  if (!bypass && !(await rateLimit(`verify:${fingerprint}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many verification runs this hour." }, { status: 429 });
  }
  let body: { word?: string; definition?: string; locale?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const word = (body.word ?? "").trim();
  const definition = (body.definition ?? "").trim();
  if (word.length < 2 || definition.length < 10) {
    return NextResponse.json({ error: "INVALID_INPUT", message: "word and definition are required." }, { status: 400 });
  }
  const locale = body.locale ?? "en";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "BAD_LANGUAGE", message: `Unknown language: ${body.locale}` }, { status: 400 });
  }
  const verification = await verifyNovelty(word, definition, locale);
  return NextResponse.json({ word, verification });
}
