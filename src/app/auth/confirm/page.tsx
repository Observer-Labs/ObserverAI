"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { useTranslations } from 'next-intl';

export default function AuthConfirmPage() {
  const t = useTranslations('auth');
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const waitForSession = async (tries = 12, delayMs = 250) => {
      // With implicit flow, the Supabase client parses the URL hash
      // (#access_token=…) asynchronously after load. Poll until it lands.
      for (let i = 0; i < tries; i++) {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) return data.session;
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return null;
    };

    const handleConfirm = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type") as "signup" | "recovery" | "email" | null;
        const hasHashToken = typeof window !== "undefined" && window.location.hash.includes("access_token");

        if (code) {
          // PKCE flow, exchange code for session
          const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) { setStatus("error"); setMessage(error.message); return; }
        } else if (tokenHash && type) {
          // Token hash flow, verify OTP
          const { error } = await supabaseClient.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) { setStatus("error"); setMessage(error.message); return; }
        } else if (hasHashToken) {
          // OAuth implicit flow, client auto-detects the hash; wait for it
          const session = await waitForSession();
          if (!session) { setStatus("error"); setMessage("Sign-in didn't complete. Please try again."); return; }
        } else {
          // No token params, maybe already signed in
          const { data } = await supabaseClient.auth.getSession();
          if (!data.session) {
            setStatus("error");
            setMessage("No confirmation token found. Please try signing in.");
            return;
          }
        }

        // Ensure a workspace exists (OAuth users never hit the signup form).
        // signup-workspace is idempotent and verifies the userId server-side.
        let destination = "/dashboard";
        try {
          const { data: userData } = await supabaseClient.auth.getUser();
          const user = userData.user;
          if (user) {
            const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
            const fallbackName = meta.full_name || meta.name || user.email?.split("@")[0] || "My Workspace";
            const res = await fetch("/api/auth/signup-workspace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, workspaceName: fallbackName }),
            });
            const data = await res.json().catch(() => ({}));
            // Brand-new workspace → send through onboarding; returning user → dashboard
            if (data?.created) destination = "/onboarding/whatsapp";
          }
        } catch { /* non-blocking, fall back to dashboard */ }

        setStatus("success");
        window.location.href = destination;
      } catch (err) {
        setStatus("error");
        setMessage((err as Error).message);
      }
    };

    handleConfirm();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b0c10",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
    }}>
      {status === "loading" && (
        <>
          <div style={{
            width: 32, height: 32,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "var(--accent-green)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t('confirmBody')}</p>
        </>
      )}
      {status === "success" && (
        <p style={{ color: "var(--accent-green)", fontSize: "0.9rem" }}>{t('confirmTitle')}</p>
      )}
      {status === "error" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--danger)", fontSize: "0.9rem", marginBottom: 16 }}>{message || t('confirmError')}</p>
          <a href="/login" style={{ color: "var(--accent-green)", fontSize: "0.875rem" }}>{t('backToSignIn')}</a>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
