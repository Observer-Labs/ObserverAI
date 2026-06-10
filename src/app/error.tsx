"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  useEffect(() => {
    // Log to console in dev; once Sentry/PostHog is wired this is where we'd
    // call reportError(error). We intentionally don't surface error.digest to
    // the user, it's an internal Vercel correlation ID.
    console.error("[Observer] Unhandled error:", error);
  }, [error]);

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
            "radial-gradient(ellipse at top, rgba(239,68,68,0.06) 0%, transparent 60%)",
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
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            marginBottom: 48,
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

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            fontSize: 28,
            marginBottom: 24,
          }}
        >
          ⚠️
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
          {t('errorTitle')}
        </h1>

        <p
          style={{
            color: "#9aa3b2",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            margin: "0 0 36px",
          }}
        >
          {t('errorBody')}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "#f97316",
              color: "#0b0c10",
              fontWeight: 700,
              fontSize: "0.92rem",
              padding: "11px 22px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 16px rgba(249,115,22,0.25)",
            }}
          >
            {t('tryAgain')}
          </button>
          <Link
            href="/dashboard"
            style={{
              color: "#9aa3b2",
              fontSize: "0.92rem",
              padding: "11px 18px",
              borderRadius: 9,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {t('backToHome')}
          </Link>
        </div>

        {error.digest && (
          <p
            style={{
              marginTop: 32,
              color: "rgba(255,255,255,0.18)",
              fontSize: "0.7rem",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
