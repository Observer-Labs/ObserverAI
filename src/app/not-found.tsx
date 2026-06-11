import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0b0c10] p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.06)_0%,transparent_60%)]" />

      <div className="relative z-[1] w-full max-w-[480px] text-center">
        {/* Brand mark */}
        <Link
          href="/"
          className="mb-14 inline-flex items-center gap-2.5 no-underline"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border-[1.5px] border-[rgba(249,115,22,0.4)] bg-[rgba(249,115,22,0.12)] text-[20px] font-extrabold tracking-[-0.04em] text-[#f97316]">
            S
          </div>
          <span className="text-[1.05rem] font-bold italic tracking-[-0.02em] text-white">
            Observer
          </span>
        </Link>

        {/* 404 huge */}
        <div className="mb-2 font-mono text-[clamp(7rem,18vw,11rem)] leading-none font-black tracking-[-0.06em] text-[rgba(249,115,22,0.18)]">
          404
        </div>

        <h1 className="mb-3 text-2xl font-bold tracking-[-0.02em] text-white">
          {t('notFoundTitle')}
        </h1>

        <p className="mb-9 text-[0.95rem] leading-[1.6] text-[var(--muted-light,#9aa3b2)]">
          {t('notFoundBody')}
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          <Button
            asChild
            className="h-auto rounded-[9px] bg-[#f97316] px-[22px] py-[11px] text-[0.92rem] font-bold text-[#0b0c10] shadow-[0_2px_16px_rgba(249,115,22,0.25)] hover:bg-[#f97316]/90"
          >
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
          <Button
            asChild
            className="h-auto rounded-[9px] border border-white/10 bg-white/[0.02] px-[18px] py-[11px] text-[0.92rem] font-normal text-[var(--muted-light,#9aa3b2)] shadow-none hover:bg-white/[0.06] hover:text-[var(--muted-light,#9aa3b2)]"
          >
            <Link href="/">{t('home')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
