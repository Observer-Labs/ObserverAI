"use client";
import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Uses our own SMTP (Gmail), bypasses Supabase email entirely
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show "sent" to avoid leaking whether email exists
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-2/5 w-3/5 -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-[1] w-full max-w-[440px] px-6">
        <div className="mb-10 text-center">
          <Logo href="/" size={26} textSize="1.1rem" gap={10} />
        </div>

        <Card className="rounded-[14px] py-0">
          <CardContent className="p-9">
            {sent ? (
              <div className="text-center">
                <div className="mb-4 text-[2rem]">✉️</div>
                <h1 className="mb-3 text-[1.2rem] font-bold">{t("checkEmailTitle")}</h1>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {t("checkEmailBody").replace("{email}", email)}
                </p>
                <Link href="/login" className="text-sm text-primary hover:underline">
                  {t("backToSignIn")}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="mb-1.5 text-xl font-bold">{t("forgotTitle")}</h1>
                <p className="mb-7 text-sm text-muted-foreground">
                  {t("forgotSubtitle")}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-[0.8rem] font-normal text-muted-foreground">{t("emailLabel")}</Label>
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

                  {error && (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? t("sending") : t("sendResetLink")}
                  </Button>
                </form>

                <p className="mb-0 mt-5 text-center text-[0.8rem]">
                  <Link href="/login" className="text-primary/75 hover:text-primary">{t("backToSignIn")}</Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
