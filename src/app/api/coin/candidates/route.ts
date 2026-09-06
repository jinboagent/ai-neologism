import { NextResponse } from "next/server";
import { aiConfigured, fetchUrlContent, generateCandidates } from "@/lib/ai";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const fingerprint = voterFingerprint(req);
  if (!rateLimit(`coin:${fingerprint}`, 10, 60 * 60 * 1000)) {
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

  try {
    const candidates = await generateCandidates(material);
    return NextResponse.json({ candidates, material_preview: material.slice(0, 200) });
  } catch (e) {
    const code = e instanceof Error ? e.message : "AI_FAILED";
    return NextResponse.json({ error: code, message: "The AI service failed or returned an unreadable answer. Try again." }, { status: 502 });
  }
}
