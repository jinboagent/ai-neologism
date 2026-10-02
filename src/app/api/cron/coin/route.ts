import { NextResponse } from "next/server";
import { coinDaily } from "@/lib/autocoin";

export const dynamic = "force-dynamic";

/**
 * Daily auto-coin trigger. Called by a scheduler (ZCode automation, Windows Task
 * Scheduler, GitHub Actions cron, or a VPS crontab) just past midnight.
 * Protect with CRON_SECRET in production — requests must then send it as the
 * x-cron-secret header (or ?secret=).
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local/dev: open, but only meaningful on the owner's machine
  const url = new URL(req.url);
  return req.headers.get("x-cron-secret") === secret || url.searchParams.get("secret") === secret;
}

export async function POST(req: Request) {
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
