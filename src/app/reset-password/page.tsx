"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

function ResetPasswordContent() {
  const t = useTranslations("auth");
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
            {done ? (
              <div className="text-center">
                <div className="mb-4 text-[2rem]">✅</div>
                <h1 className="mb-3 text-[1.2rem] font-bold">{t("resetTitle")}</h1>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {t("resetSuccess")}
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">{t("signInBtn")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="mb-1.5 text-xl font-bold">{t("resetTitle")}</h1>
                <p className="mb-7 text-sm text-muted-foreground">
                  {t("resetSubtitle")}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="password" className="text-[0.8rem] font-normal text-muted-foreground">{t("newPasswordLabel")}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("newPasswordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="confirm" className="text-[0.8rem] font-normal text-muted-foreground">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="Same password again"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                      {error.includes("invalid") || error.includes("expired") ? (
                        <div className="mt-2">
                          <Link href="/forgot-password" className="text-[0.8rem] text-primary hover:underline">
                            Request a new reset link →
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <Button type="submit" disabled={loading || !token} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" />
                        {t("updating")}
                      </>
                    ) : t("newPasswordBtn")}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
