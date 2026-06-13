"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import GoogleButton from "@/components/auth/GoogleButton";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

function LoginContent() {
  const t = useTranslations("auth");
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
          ? t("errSignInFailed")
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
            <h1 className="mb-1.5 text-xl font-bold">{t("loginTitle")}</h1>
            <p className="mb-7 text-sm text-muted-foreground">
              {t("loginSubtitle")}{" "}
              <Link href="/signup" className="text-primary hover:underline">{t("signUpFree")}</Link>
            </p>

            <GoogleButton label={t("signInWithGoogle")} />

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-[0.8rem] font-normal text-muted-foreground">
                  {t("emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[0.8rem] font-normal text-muted-foreground">
                    {t("passwordLabel")}
                  </Label>
                  <Link href="/forgot-password" className="text-[0.75rem] text-primary/75 hover:text-primary">
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
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
                    {t("signingIn")}
                  </>
                ) : t("signInBtn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
