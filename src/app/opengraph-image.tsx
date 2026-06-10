import { ImageResponse } from "next/og";

export const alt = "Observer AI, From customer noise to shipped decisions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b0c10",
          backgroundImage:
            "radial-gradient(ellipse at top left, rgba(249,115,22,0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(249,115,22,0.10) 0%, transparent 55%)",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(249,115,22,0.12)",
              border: "2px solid rgba(249,115,22,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "#f97316",
              letterSpacing: "-0.04em",
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              fontStyle: "italic",
            }}
          >
            Observer
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Headline */}
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            maxWidth: 980,
            display: "flex",
          }}
        >
          From customer noise to
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: "#f97316",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            marginTop: 4,
            display: "flex",
          }}
        >
          shipped decisions.
        </div>

        {/* Subhead */}
        <div
          style={{
            fontSize: 28,
            color: "#9aa3b2",
            marginTop: 28,
            lineHeight: 1.4,
            maxWidth: 880,
            display: "flex",
          }}
        >
          AI clusters every customer signal into ranked intent gaps. Approve in Slack or email, your stakeholders never log in.
        </div>

        {/* Footer row */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 18,
            color: "#6b7280",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
          }}
        >
          <div style={{ display: "flex" }}>SIGNAL-AI.CO</div>
          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#374151" }} />
          <div style={{ display: "flex" }}>8 SOURCES</div>
          <div style={{ width: 4, height: 4, borderRadius: 2, background: "#374151" }} />
          <div style={{ display: "flex" }}>CLAUDE-POWERED</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
