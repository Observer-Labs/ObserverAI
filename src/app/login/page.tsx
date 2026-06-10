"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { Suspense } from "react";
import GoogleButton from "@/components/auth/GoogleButton";
import { useTranslations } from 'next-intl';

function LoginContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Auto-confirm in signup-workspace makes "Email not confirmed" unreachable
        // for new users. If it ever fires, surface a generic message that points
        // users to forgot-password.
        const msg = signInError.message.includes("Email not confirmed")
          ? t('errSignInFailed')
          : signInError.message;
        setError(msg);
        return;
      }

      // Full page redirect to ensure cookies are sent with the next request to middleware
      const raw = searchParams.get("redirect") ?? "/dashboard";
      // Only allow relative paths starting with / followed by a letter (blocks //, /\, protocol-relative)
      const redirectTo = /^\/[a-zA-Z]/.test(raw) ? raw : "/dashboard";
      window.location.href = redirectTo;
    } catch (err) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Background accent */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: "40%", background: "radial-gradient(ellipse at top, color-mix(in oklch, var(--foreground) 4%, transparent) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div className="brand-dot" />
            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.1rem" }}>Observer</span>
          </Link>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 8, marginBottom: 0 }}>
            {t('tagline')}
          </p>
        </div>

        {/* Card */}
        <div className="obs-card animate-slide-up" style={{ padding: 36 }}>
          <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 6px" }}>{t('loginTitle')}</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 28px" }}>
            {t('loginSubtitle')}{" "}
            <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none" }}>{t('signUpFree')}</Link>
          </p>

          <GoogleButton label={t('signInWithGoogle')} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>
                {t('emailLabel')}
              </label>
              <input
                className="obs-input"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                required
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem" }}>
                  {t('passwordLabel')}
                </label>
                <Link href="/forgot-password" style={{ color: "var(--accent)", fontSize: "0.75rem", textDecoration: "none", opacity: 0.75 }}>
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                className="obs-input"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,92,122,0.1)", border: "1px solid rgba(255,92,122,0.25)", color: "var(--danger)", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "var(--primary-foreground)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  {t('signingIn')}
                </>
              ) : t('signInBtn')}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--background)" }} />}>
      <LoginContent />
    </Suspense>
  );
}
