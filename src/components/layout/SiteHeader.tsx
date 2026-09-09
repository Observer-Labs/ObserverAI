"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared marketing header. Transparent at top; surface appears on scroll. */
export default function SiteHeader() {
  const tNav = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 transition-all duration-300 sm:px-10 sm:py-4",
        scrolled ? "bg-background/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <Logo href="/" size={24} textSize="1.05rem" className="shrink-0" />
      {/* Mobile: locale + CTA only; sign-in joins at sm, pricing at md. Every item stays nowrap so the bar never overflows the viewport. */}
      <div className="flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap sm:gap-2">
        <LocaleSwitcher />
        <Button asChild variant="ghost" className="hidden h-10 rounded-full px-5 text-[0.92rem] text-muted-foreground md:inline-flex">
          <Link href="/pricing">{tNav("pricing")}</Link>
        </Button>
        <Button asChild variant="outline" className="hidden h-10 rounded-full px-5 text-[0.92rem] shadow-none sm:inline-flex">
          <Link href="/login">{tNav("signIn")}</Link>
        </Button>
        <Button asChild className="h-9 rounded-full px-4 text-[0.85rem] shadow-none sm:h-10 sm:px-6 sm:text-[0.92rem]">
          <Link href="/signup">{tNav("startFree")}</Link>
        </Button>
      </div>
    </nav>
  );
}
