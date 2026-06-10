"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";
import GoogleButton from "@/components/auth/GoogleButton";
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !workspaceName) {
      setError(t('errAllRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('errPasswordLength'));
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError) {
        // Supabase returns this when the email already exists
        if (signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already exists") || signUpError.message.toLowerCase().includes("user already")) {
          setError(t('errEmailExists'));
        } else {
          setError(signUpError.message);
        }
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(t('errNoUserId'));
        return;
      }

      // 2. Create workspace row, backend also auto-confirms email so no email click is needed
      const res = await fetch("/api/auth/signup-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, workspaceName }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? t('errWorkspace'));
        return;
      }

      // 3. Sign in immediately, email is auto-confirmed by the backend
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Account was created and confirmed but sign-in failed (rare race).
        // Send the user to /login with a clear message, no misleading
        // "check your email" prompt because no email is being sent.
        setError(t('accountCreated'));
        setTimeout(() => {
          window.location.href = `/login?email=${encodeURIComponent(email)}`;
        }, 1200);
        return;
      }

      // 4. Go straight to onboarding wizard
      window.location.href = "/onboarding/whatsapp";
    } catch (err) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
      });
      if (error) {
        setResendMessage(error.message);
      } else {
        setResendMessage("Confirmation email resent. Check your inbox.");
      }
    } catch (err) {
      setResendMessage((err as Error).message);
    } finally {
      setResendLoading(false);
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
          {checkEmail ? (
            /* ── Check your email state ── */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>✉️</div>
              <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 12px" }}>
                Check your email
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 4px" }}>
                We sent a confirmation link to
              </p>
              <p style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.9rem", margin: "0 0 20px", wordBreak: "break-all" }}>
                {email}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                Click the link in that email to activate your account.
                Check your spam folder if you don&apos;t see it within a minute.
              </p>

              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}
              >
                {resendLoading ? (
                  <>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "var(--primary-foreground)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    Resending...
                  </>
                ) : "Resend confirmation email"}
              </button>

              {resendMessage && (
                <p style={{
                  fontSize: "0.8rem",
                  marginBottom: 16,
                  color: resendMessage.toLowerCase().includes("resent") || resendMessage.toLowerCase().includes("check")
                    ? "var(--accent-green)"
                    : "var(--danger)",
                }}>
                  {resendMessage}
                </p>
              )}

              <button
                onClick={() => { setCheckEmail(false); setError(""); setResendMessage(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}
              >
                Wrong email? Go back
              </button>
            </div>
          ) : (
            /* ── Signup form ── */
            <>
              <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 6px" }}>{t('signUpTitle')}</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 28px" }}>
                {t('signUpSubtitle')}{" "}
                <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>{t('signInLink')}</Link>
              </p>

              <GoogleButton label={t('signUpWithGoogle')} />

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ color: "var(--muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>
                    {t('emailLabel')}
                  </label>
                  <input
                    className="obs-input"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>
                    {t('newPasswordLabel')}
                  </label>
                  <input
                    className="obs-input"
                    type="password"
                    placeholder={t('newPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem", marginBottom: 6 }}>
                    {t('workspaceLabel')}
                  </label>
                  <input
                    className="obs-input"
                    type="text"
                    placeholder={t('workspacePlaceholder')}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    autoComplete="organization"
                    required
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                  <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 4 }}>
                    Your team or company name
                  </p>
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
                      {t('creating')}
                    </>
                  ) : t('createBtn')}
                </button>
              </form>
            </>
          )}
        </div>

        {!checkEmail && (
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.75rem", marginTop: 20 }}>
            By signing up, you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}>Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
