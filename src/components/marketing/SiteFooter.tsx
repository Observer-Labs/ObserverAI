import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";

const LINK = "mk-link w-fit py-1 text-[0.9rem] text-mk-soft mkh:text-mk-ink";

/** Shared marketing footer: link columns on the page grid over the name set very large. */
export default function SiteFooter() {
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");

  const groups = [
    {
      title: t("footerProduct"),
      links: [
        { href: "/", label: t("footerHome") },
        { href: "/#nasil-calisir", label: t("howItWorksLabel") },
        { href: "/pricing", label: tNav("pricing") },
      ],
    },
    {
      title: t("footerAccount"),
      links: [
        { href: "/login", label: tNav("signIn") },
        { href: "/signup", label: tNav("signUp") },
      ],
    },
    {
      title: t("footerLegal"),
      links: [
        { href: "/terms", label: t("footerTerms") },
        { href: "/privacy", label: t("footerPrivacy") },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-mk-line">
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 md:grid-cols-12 md:py-14">
          <div className="col-span-2 sm:col-span-3 md:col-span-6">
            <Logo href="/" size={22} textSize="1rem" color="var(--mk-ink)" className="transition-opacity duration-200 mkh:opacity-75" />
            <p className="mt-3 max-w-[260px] text-[0.92rem] leading-relaxed text-mk-muted">{t("footerTagline")}</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title} className="flex flex-col gap-1.5 md:col-span-2">
              <p className="mb-1 font-mk-mono text-[0.75rem] uppercase tracking-[0.1em] text-mk-muted">{g.title}</p>
              {g.links.map((l) =>
                l.href.includes("#") ? (
                  <a key={l.href} href={l.href} className={LINK}>
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <p className="font-mk-mono text-[0.75rem] text-mk-muted">© {new Date().getFullYear()} Observer AI</p>
      </div>
      {/* the name, very large, lit from above and cut by the page's bottom edge */}
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.3em] mt-8 select-none whitespace-nowrap bg-[linear-gradient(180deg,rgba(255,244,230,0.16),rgba(255,244,230,0.02)_78%)] bg-clip-text text-center text-[21.5vw] sm:text-[clamp(5rem,18.4vw,16.6rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-transparent"
      >
        Observer
      </p>
    </footer>
  );
}
