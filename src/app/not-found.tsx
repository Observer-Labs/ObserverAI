import Link from "next/link";
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0c10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at top, rgba(249,115,22,0.06) 0%, transparent 60%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Brand mark */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            marginBottom: 56,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "rgba(249,115,22,0.12)",
              border: "1.5px solid rgba(249,115,22,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: "#f97316",
              letterSpacing: "-0.04em",
            }}
          >
            S
          </div>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.05rem",
              fontStyle: "italic",
              letterSpacing: "-0.02em",
            }}
          >
            Observer
          </span>
        </Link>

        {/* 404 huge */}
        <div
          style={{
            fontSize: "clamp(7rem, 18vw, 11rem)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.06em",
            color: "rgba(249,115,22,0.18)",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8,
          }}
        >
          404
        </div>

        <h1
          style={{
            color: "#fff",
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          {t('notFoundTitle')}
        </h1>

        <p
          style={{
            color: "var(--muted-light, #9aa3b2)",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            margin: "0 0 36px",
          }}
        >
          {t('notFoundBody')}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              background: "#f97316",
              color: "#0b0c10",
              fontWeight: 700,
              fontSize: "0.92rem",
              padding: "11px 22px",
              borderRadius: 9,
              textDecoration: "none",
              boxShadow: "0 2px 16px rgba(249,115,22,0.25)",
            }}
          >
            {t('backToDashboard')}
          </Link>
          <Link
            href="/"
            style={{
              color: "var(--muted-light, #9aa3b2)",
              fontSize: "0.92rem",
              padding: "11px 18px",
              borderRadius: 9,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
