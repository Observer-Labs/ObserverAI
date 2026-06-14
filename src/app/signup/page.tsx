"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";
import { Loader2 } from "lucide-react";
import GoogleButton from "@/components/auth/GoogleButton";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function SignupPage() {
  const t = useTranslations("auth");
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
      setError(t("errAllRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("errPasswordLength"));
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
          setError(t("errEmailExists"));
        } else {
          setError(signUpError.message);
        }
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(t("errNoUserId"));
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
        setError(body.error ?? t("errWorkspace"));
        return;
      }

      // 3. Sign in immediately, email is auto-confirmed by the backend
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Account was created and confirmed but sign-in failed (rare race).
        // Send the user to /login with a clear message, no misleading
        // "check your email" prompt because no email is being sent.
        setError(t("accountCreated"));
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
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      {/* Background accent */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-2/5 w-3/5 -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--foreground)_4%,transparent)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-[1] w-full max-w-[440px] px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Logo href="/" size={26} textSize="1.1rem" gap={10} />
          <p className="mt-2 text-sm text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        <Card className="animate-slide-up rounded-[14px] py-0">
          <CardContent className="p-9">
            {checkEmail ? (
              /* ── Check your email state ── */
              <div className="text-center">
                <div className="mb-4 text-[2.5rem]">✉️</div>
                <h1 className="mb-3 text-xl font-bold">
                  Check your email
                </h1>
                <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                  We sent a confirmation link to
                </p>
                <p className="mb-5 break-all text-[0.9rem] font-semibold">
                  {email}
                </p>
                <p className="mb-6 text-[0.8rem] leading-relaxed text-muted-foreground">
                  Click the link in that email to activate your account.
                  Check your spam folder if you don&apos;t see it within a minute.
                </p>

                <Button onClick={handleResend} disabled={resendLoading} className="mb-3 w-full">
                  {resendLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Resending...
                    </>
                  ) : "Resend confirmation email"}
                </Button>

                {resendMessage && (
                  <p className={`mb-4 text-[0.8rem] ${
                    resendMessage.toLowerCase().includes("resent") || resendMessage.toLowerCase().includes("check")
                      ? "text-[var(--accent-green)]"
                      : "text-destructive"
                  }`}>
                    {resendMessage}
                  </p>
                )}

                <button
                  onClick={() => { setCheckEmail(false); setError(""); setResendMessage(""); }}
                  className="cursor-pointer border-none bg-transparent p-0 text-[0.8rem] text-muted-foreground underline"
                >
                  Wrong email? Go back
                </button>
              </div>
            ) : (
              /* ── Signup form ── */
              <>
                <h1 className="mb-1.5 text-xl font-bold">{t("signUpTitle")}</h1>
                <p className="mb-7 text-sm text-muted-foreground">
                  {t("signUpSubtitle")}{" "}
                  <Link href="/login" className="text-primary hover:underline">{t("signInLink")}</Link>
                </p>

                <GoogleButton label={t("signUpWithGoogle")} />

                <div className="my-5 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-[0.8rem] font-normal text-muted-foreground">
                      {t("emailLabel")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="password" className="text-[0.8rem] font-normal text-muted-foreground">
                      {t("newPasswordLabel")}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("newPasswordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="workspace" className="text-[0.8rem] font-normal text-muted-foreground">
                      {t("workspaceLabel")}
                    </Label>
                    <Input
                      id="workspace"
                      type="text"
                      placeholder={t("workspacePlaceholder")}
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      autoComplete="organization"
                      required
                    />
                    <p className="text-[0.75rem] text-muted-foreground">
                      Your team or company name
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="mt-1 w-full">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" />
                        {t("creating")}
                      </>
                    ) : t("createBtn")}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {!checkEmail && (
          <p className="mt-5 text-center text-[0.75rem] text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-muted-foreground underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-muted-foreground underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
