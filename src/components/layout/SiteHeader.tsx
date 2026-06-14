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
        "sticky top-0 z-50 flex items-center justify-between px-5 py-4 transition-all duration-300 sm:px-10",
        scrolled ? "bg-background/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <Logo href="/" size={24} textSize="1.05rem" />
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <Button asChild variant="ghost" className="h-10 rounded-full px-5 text-[0.92rem] text-muted-foreground">
          <Link href="/pricing">{tNav("pricing")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-full px-5 text-[0.92rem] shadow-none">
          <Link href="/login">{tNav("signIn")}</Link>
        </Button>
        <Button asChild className="h-10 rounded-full px-6 text-[0.92rem] shadow-none">
          <Link href="/signup">{tNav("startFree")}</Link>
        </Button>
      </div>
    </nav>
  );
}
