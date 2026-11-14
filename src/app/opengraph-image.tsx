import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI Neologism — a dictionary of words that don't exist yet";

// Branded share card for the site default. Word pages render their own
// dynamic cards (words/[slug]/opengraph-image.tsx).
export default function OpengraphImage() {
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
        <div style={{ display: "flex", fontSize: 30, color: "#94a3b8", letterSpacing: 2 }}>THE AI NEOLOGISM PROJECT</div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, marginTop: 16 }}>AI Neologism</div>
        <div style={{ display: "flex", fontSize: 40, color: "#cbd5e1", marginTop: 20, maxWidth: 900 }}>
          Words for what we feel but can&apos;t name yet.
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#64748b", marginTop: "auto", gap: 24 }}>
          <span>AI-coined</span>
          <span>·</span>
          <span>search-verified</span>
          <span>·</span>
          <span>human-reviewed</span>
          <span style={{ marginLeft: "auto", color: "#94a3b8" }}>www.ai-neologism.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
