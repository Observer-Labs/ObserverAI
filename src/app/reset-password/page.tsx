"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';

function ResetPasswordContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing reset token. Please click the link in your email again.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: "40%", background: "radial-gradient(ellipse at top, rgba(249,115,22,0.05) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div className="brand-dot" />
            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.1rem" }}>Observer</span>
          </Link>
        </div>

        <div className="obs-card" style={{ padding: 36 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 16 }}>✅</div>
              <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.2rem", margin: "0 0 12px" }}>{t('resetTitle')}</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                {t('resetSuccess')}
              </p>
              <Link href="/login" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center", width: "100%" }}>
                {t('signInBtn')}
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 6px" }}>{t('resetTitle')}</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 28px" }}>
                {t('resetSubtitle')}
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>{t('newPasswordLabel')}</label>
                  <input
                    className="obs-input"
                    type="password"
                    placeholder={t('newPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>Confirm password</label>
                  <input
                    className="obs-input"
                    type="password"
                    placeholder="Same password again"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>

                {error && (
                  <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,92,122,0.1)", border: "1px solid rgba(255,92,122,0.25)", color: "var(--danger)", fontSize: "0.875rem" }}>
                    {error}
                    {error.includes("invalid") || error.includes("expired") ? (
                      <div style={{ marginTop: 8 }}>
                        <Link href="/forgot-password" style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                          Request a new reset link →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !token}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loading ? (
                    <>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "var(--background)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      {t('updating')}
                    </>
                  ) : t('newPasswordBtn')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--background)" }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
