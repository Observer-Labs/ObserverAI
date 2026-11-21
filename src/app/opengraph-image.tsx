import { ImageResponse } from "next/og";

export const alt = "Observer AI — Müşteri sinyalleri WhatsApp'ınızda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0f1512";
const PAPER = "#ffffff";
const MUTED = "#57625b";
const LINE = "#dde3dc";
const BRAND = "#ff5a1f";

/** Social card in the landing's visual language: white, green-black ink, the answer in an orange chat bubble. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          color: INK,
          display: "flex",
          flexDirection: "column",
          padding: "68px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo lockup (same mark as components/Logo.tsx) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.5" stroke={BRAND} strokeWidth="1.2" opacity="0.5" />
            <path
              d="M3.5 12C5.5 7.5 8.5 5.5 12 5.5C15.5 5.5 18.5 7.5 20.5 12C18.5 16.5 15.5 18.5 12 18.5C8.5 18.5 5.5 16.5 3.5 12Z"
              stroke={BRAND}
              strokeWidth="1.3"
            />
            <circle cx="12" cy="12" r="3" fill={BRAND} />
          </svg>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", fontStyle: "italic" }}>Observer</div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", fontSize: 82, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.035em" }}>
          Müşteriniz ne istiyor?
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 82, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.035em", marginTop: 10 }}>
          <div style={{ display: "flex" }}>Cevabı</div>
          <div style={{ display: "flex", background: BRAND, borderRadius: "34px 34px 34px 8px", padding: "4px 26px 12px" }}>WhatsApp&apos;ınızda.</div>
        </div>

        <div style={{ display: "flex", fontSize: 29, color: MUTED, marginTop: 30, lineHeight: 1.4, maxWidth: 940 }}>
          Observer yorumlarınızı, şikayetlerinizi ve POS raporlarınızı her gün okur; düzeltmeye değer tek şeyi size yazar.
        </div>

        <div
          style={{
            marginTop: 44,
            paddingTop: 26,
            borderTop: `2px solid ${LINE}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: BRAND }} />
          <div style={{ display: "flex" }}>Kafe, restoran ve dükkanlar için</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
