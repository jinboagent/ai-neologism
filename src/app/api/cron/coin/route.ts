import { NextResponse } from "next/server";
import { coinDaily } from "@/lib/autocoin";
import { safeEqual } from "@/lib/secure";

export const dynamic = "force-dynamic";
// Vercel serverless default is 10s — a multi-word coinage run (fetch + AI +
// search per word) needs the Hobby plan's 60s ceiling.
export const maxDuration = 60;

/**
 * Daily auto-coin trigger. Called by a scheduler (Vercel Cron sends GET and, when
 * the CRON_SECRET env var is set on the platform, automatically attaches it as an
 * `Authorization: Bearer` header). x-cron-secret and ?secret= also work.
 *
 * Fail-closed (finding #10): in production an unset CRON_SECRET means the endpoint
 * refuses to run rather than being open to anyone.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const url = new URL(req.url);
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return (
    safeEqual(req.headers.get("x-cron-secret") ?? "", secret) ||
    safeEqual(url.searchParams.get("secret") ?? "", secret) ||
    (bearer !== "" && safeEqual(bearer, secret))
  );
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const raw = Number.parseInt(url.searchParams.get("count") ?? "", 10);
  const count = Number.isFinite(raw) ? Math.min(10, Math.max(1, raw)) : Number(process.env.AUTO_COIN_COUNT ?? 5);

  const report = await coinDaily(count);
  const status = report.error === "AI_NOT_CONFIGURED" ? 503 : 200;
  return NextResponse.json(report, { status });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
