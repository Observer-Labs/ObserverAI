"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#0b0c10] p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.06)_0%,transparent_60%)]" />

      <div className="relative z-[1] w-full max-w-[480px] text-center">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2.5 no-underline"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border-[1.5px] border-[rgba(249,115,22,0.4)] bg-[rgba(249,115,22,0.12)] text-[20px] font-extrabold tracking-[-0.04em] text-[#f97316]">
            S
          </div>
          <span className="text-[1.05rem] font-bold italic tracking-[-0.02em] text-white">
            Observer
          </span>
        </Link>

        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-[28px]">
          ⚠️
        </div>

        <h1 className="mb-3 text-2xl font-bold tracking-[-0.02em] text-white">
          {t('errorTitle')}
        </h1>

        <p className="mb-9 text-[0.95rem] leading-[1.6] text-[#9aa3b2]">
          {t('errorBody')}
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          <Button
            onClick={() => reset()}
            className="h-auto rounded-[9px] bg-[#f97316] px-[22px] py-[11px] text-[0.92rem] font-bold text-[#0b0c10] shadow-[0_2px_16px_rgba(249,115,22,0.25)] hover:bg-[#f97316]/90"
          >
            {t('tryAgain')}
          </Button>
          <Button
            asChild
            className="h-auto rounded-[9px] border border-white/10 bg-white/[0.02] px-[18px] py-[11px] text-[0.92rem] font-normal text-[#9aa3b2] shadow-none hover:bg-white/[0.06] hover:text-[#9aa3b2]"
          >
            <Link href="/dashboard">{t('backToHome')}</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-[0.7rem] text-white/[0.18]">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
