"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

const NAV_LINK =
  "rounded-full px-3.5 py-2 text-[0.9rem] text-mk-soft transition-colors duration-200 hover:bg-mk-sunken hover:text-mk-ink";

/** Shared marketing header (lives inside a `.mk` wrapper). Flat at the top; a hairline and paper surface appear on scroll. */
export default function SiteHeader() {
  const tNav = useTranslations("nav");
  const t = useTranslations("landing");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-mk-line bg-mk-paper/90 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-2 px-2.5 min-[360px]:gap-3 min-[360px]:px-4 sm:px-8">
        <Logo href="/" size={24} textSize="1.05rem" gap={6} color="var(--mk-ink)" className="shrink-0" />

        <nav aria-label={t("navMain")} className="ml-6 hidden items-center md:flex">
          <Link
            href="/#nasil-calisir"
            className={NAV_LINK}
            // A client-side Link ignores a repeated click on the hash already in the URL; scroll by hand on the landing.
            onClick={() => {
              if (window.location.pathname === "/") document.getElementById("nasil-calisir")?.scrollIntoView();
            }}
          >
            {t("howItWorksLabel")}
          </Link>
          <Link href="/pricing" className={NAV_LINK}>{tNav("pricing")}</Link>
        </nav>

        {/* Mobile: locale + CTA only; sign-in joins at sm. Everything stays nowrap so the bar never overflows. */}
        <div className="ml-auto flex min-w-0 items-center gap-1 whitespace-nowrap sm:gap-2">
          <LocaleSwitcher />
          <Link href="/login" className={cn(NAV_LINK, "hidden sm:inline-flex")}>{tNav("signIn")}</Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-full bg-mk-ink px-2.5 text-[0.78rem] min-[360px]:px-4 min-[360px]:text-[0.86rem] font-medium text-mk-paper transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-mk-soft sm:h-10 sm:px-5 sm:text-[0.9rem]"
          >
            {tNav("startFree")}
          </Link>
        </div>
      </div>
    </header>
  );
}
