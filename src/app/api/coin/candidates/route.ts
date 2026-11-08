import { NextResponse } from "next/server";
import { aiConfigured, assessCoiningIntent, fetchUrlContent, generateCandidates } from "@/lib/ai";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const fingerprint = voterFingerprint(req);
  if (!(await rateLimit(`coin:${fingerprint}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many coining requests this hour." }, { status: 429 });
  }

  let body: { text?: string; url?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  let material = (body.text ?? "").trim();
  if (body.url) {
    try {
      const fetched = await fetchUrlContent(body.url.trim());
      material = fetched || material;
    } catch (e) {
      const code = e instanceof Error ? e.message : "FETCH_FAILED";
      return NextResponse.json({ error: code, message: "Could not read that link. Paste the text instead." }, { status: 400 });
    }
  }
  if (material.length < 60) {
    return NextResponse.json(
      { error: "MATERIAL_TOO_SHORT", message: "Give the AI at least 60 characters of material to work from (paste text or a link)." },
      { status: 400 }
    );
  }
  if (!aiConfigured()) {
    return NextResponse.json(
      {
        error: "AI_NOT_CONFIGURED",
        message:
          "The in-site AI is not configured on this server. Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL) in .env.local, or use the manual form.",
      },
      { status: 503 }
    );
  }

  // Global daily ceiling (F3 hardening): the per-identity limiter is
  // parallelism-safe, but a botnet of fresh fingerprints is not. This bounds
  // the worst-case paid-AI spend per day; tune with COIN_DAILY_CAP.
  if (!(await rateLimit("coin:global", Number(process.env.COIN_DAILY_CAP ?? 100), 24 * 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "The site's daily coining capacity is used up. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Intent gate (2026-11-08): one cheap LLM call judges whether the material
  // actually centers on a nameable social phenomenon with enough substance to
  // coin from. A "no" returns actionable feedback instead of burning the
  // generation call on junk. The gate fails OPEN — if it errors or returns an
  // unreadable verdict we proceed exactly as before (the novelty check and
  // human review still gate downstream output); only a clean "no" blocks.
  let assessment: Awaited<ReturnType<typeof assessCoiningIntent>> | null = null;
  try {
    assessment = await assessCoiningIntent(material);
  } catch {
    assessment = null; // gate unavailable — do not block the visitor on it
  }
  if (assessment && !assessment.proceed) {
    return NextResponse.json(
      { error: "INTENT_REJECTED", message: assessment.reason, material_preview: material.slice(0, 200) },
      { status: 422 }
    );
  }

  try {
    const candidates = await generateCandidates(material, assessment?.phenomenon ?? undefined);
    return NextResponse.json({ candidates, material_preview: material.slice(0, 200) });
  } catch (e) {
    const code = e instanceof Error ? e.message : "AI_FAILED";
    return NextResponse.json({ error: code, message: "The AI service failed or returned an unreadable answer. Try again." }, { status: 502 });
  }
}
