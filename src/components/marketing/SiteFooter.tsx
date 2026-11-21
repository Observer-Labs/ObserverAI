import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";

const LINK = "mk-link w-fit py-1 text-[0.9rem] text-mk-soft hover:text-mk-ink";

/** Shared marketing footer (dark band). Used by the landing and pricing pages. */
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
    <footer className="mk-dark">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-mk-line py-12 sm:grid-cols-[1.6fr_1fr_1fr_1fr] sm:py-14">
          <div className="col-span-2 sm:col-span-1">
            <Logo href="/" size={22} textSize="1rem" color="var(--mk-ink)" />
            <p className="mt-3 max-w-[240px] text-[0.9rem] leading-relaxed text-mk-muted">{t("footerTagline")}</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title} className="flex flex-col gap-1.5">
              <p className="mb-1 font-mk-mono text-[0.68rem] uppercase tracking-[0.08em] text-mk-muted">{g.title}</p>
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
        <p className="border-t border-mk-line py-6 font-mk-mono text-[0.68rem] text-mk-muted">© {new Date().getFullYear()} Observer AI</p>
      </div>
    </footer>
  );
}
