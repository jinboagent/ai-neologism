import { ImageResponse } from "next/og";
import { getWord } from "@/lib/words";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI Neologism entry";

// Dynamic share card per entry: headword + definition on the branded card.
// IPA is deliberately left off — the default OG font can't render it reliably.
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const word = await getWord(slug, null, "en");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "#94a3b8", letterSpacing: 2 }}>
          AI NEOLOGISM · {word?.language === "en" ? "ENGLISH" : String(word?.language ?? "").toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, marginTop: 20 }}>
          {word?.word ?? "AI Neologism"}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#cbd5e1", marginTop: 24, maxWidth: 1000 }}>
          {(word?.definition ?? "Words for what we feel but can't name yet.").slice(0, 160)}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#64748b", marginTop: "auto" }}>
          www.ai-neologism.com · search-verified · human-reviewed
        </div>
      </div>
    ),
    { ...size }
  );
}
