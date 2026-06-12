import Link from "next/link";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

/** Shared marketing header (homepage, pricing, and other public pages). */
export default function SiteHeader() {
  const tNav = useTranslations("nav");
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl sm:px-10">
      <Logo href="/" size={22} />
      <div className="flex items-center gap-1.5">
        <LocaleSwitcher />
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <Link href="/pricing">{tNav("pricing")}</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full shadow-none">
          <Link href="/login">{tNav("signIn")}</Link>
        </Button>
        <Button asChild size="sm" className="rounded-full px-4 shadow-none">
          <Link href="/signup">{tNav("startFree")}</Link>
        </Button>
      </div>
    </nav>
  );
}
