import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import HeroDemo from "@/components/marketing/HeroDemo";
import HowItWorks from "@/components/marketing/HowItWorks";
import Reveal from "@/components/marketing/Reveal";
import SiteFooter from "@/components/marketing/SiteFooter";
import { marketingFonts } from "@/components/marketing/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("landing"), getLocale()]);
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: "Observer AI", url: "/", title, description, locale: locale === "en" ? "en_US" : "tr_TR" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const CONTAINER = "mx-auto max-w-[1120px] px-5 sm:px-8";
const H2 = "font-mk-display text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-balance";
const BTN =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[0.95rem] font-medium transition-[background-color,transform] duration-200 hover:-translate-y-px";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const sources = ["Google Reviews", "Getir", "Yemeksepeti", "Trendyol", t("sourcePos"), "Google Analytics"];

  const personas = [
    { type: t("persona1Type"), sources: ["Google Reviews", "Getir", "POS"], alert: t("persona1Alert") },
    { type: t("persona2Type"), sources: ["Yemeksepeti", "Trendyol", "Google Reviews"], alert: t("persona2Alert") },
    { type: t("persona3Type"), sources: ["Google Reviews", "POS", "Google Analytics"], alert: t("persona3Alert") },
  ];

  return (
    <div className={`mk min-h-screen overflow-x-clip ${marketingFonts}`}>
      {/* Without JavaScript nothing reveals the hero demo parts, so show them outright. */}
      <noscript>
        <style>{".mk-pre{opacity:1!important}.mk-pre-inv{display:none!important}"}</style>
      </noscript>

      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className={`${CONTAINER} grid grid-cols-1 items-center gap-x-14 gap-y-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pb-24 lg:pt-20`}>
          <div>
            <p className="mk-eyebrow">{t("heroEyebrow")}</p>
            <h1 className="mt-5 font-mk-display text-[clamp(2.5rem,10.5vw,4.6rem)] leading-[1.02] tracking-[-0.015em] lg:text-[clamp(3.2rem,5.1vw,4.4rem)]">
              {t("heroTitleA")} <em className="block">{t("heroTitleB")}</em>
            </h1>
            <p className="mt-6 max-w-[50ch] text-[1.08rem] leading-[1.65] text-mk-soft">{t("heroLead")}</p>
            <div className="mt-9 flex flex-col gap-3 min-[440px]:flex-row min-[440px]:items-center">
              <Link href="/signup" className={`${BTN} bg-mk-ink text-mk-paper hover:bg-mk-soft`}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a href="#nasil-calisir" className={`${BTN} px-5 text-mk-ink hover:bg-mk-sunken`}>
                {t("ctaSecondary")}
              </a>
            </div>
            <p className="mt-5 text-[0.84rem] text-mk-muted">{t("heroNote")}</p>
          </div>

          <HeroDemo />
        </section>

        {/* ── Sources ── */}
        <section aria-label={t("sourcesLabel")} className={CONTAINER}>
          <div className="flex flex-col gap-x-10 gap-y-4 border-y border-mk-line py-6 md:flex-row md:items-center">
            <p className="shrink-0 font-mk-mono text-[0.7rem] uppercase tracking-[0.08em] text-mk-muted">{t("sourcesLabel")}</p>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 md:ml-auto">
              {sources.map((src) => (
                <li key={src} className="text-[0.95rem] font-medium text-mk-soft">
                  {src}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Problem ── */}
        <section className={`${CONTAINER} py-20 md:py-28`}>
          <Reveal className="grid grid-cols-1 gap-x-16 gap-y-8 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mk-eyebrow">{t("problemLabel")}</p>
              <h2 className={`${H2} mt-4`}>
                {t("problemTitleA")} <em className="text-mk-muted">{t("problemTitleB")}</em>
              </h2>
            </div>
            <div className="flex flex-col gap-5 text-[1.05rem] leading-[1.7] text-mk-soft md:pt-9">
              <p>{t("problemBody1")}</p>
              <p>{t("problemBody2")}</p>
            </div>
          </Reveal>
        </section>

        {/* ── How it works ── */}
        <section id="nasil-calisir" className={`${CONTAINER} scroll-mt-20 pb-20 md:pb-28`}>
          <Reveal className="mb-10 grid grid-cols-1 items-end gap-x-16 gap-y-4 md:mb-12 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mk-eyebrow">{t("howItWorksLabel")}</p>
              <h2 className={`${H2} mt-4`}>{t("howTitle")}</h2>
            </div>
            <p className="text-[1.05rem] leading-[1.7] text-mk-soft">{t("howLead")}</p>
          </Reveal>
          <Reveal stagger="[data-step]">
            <HowItWorks />
          </Reveal>
        </section>

        {/* ── Who it is for ── */}
        <section className={`${CONTAINER} pb-20 md:pb-28`}>
          <Reveal className="mb-10 md:mb-12">
            <p className="mk-eyebrow">{t("builtForLabel")}</p>
            <h2 className={`${H2} mt-4 max-w-[20ch]`}>{t("whoTitle")}</h2>
          </Reveal>
          <Reveal stagger="[data-persona]">
            <ul className="border-b border-mk-line">
              {personas.map((p) => (
                <li
                  key={p.type}
                  data-persona
                  className="grid grid-cols-1 gap-x-10 gap-y-3 border-t border-mk-line py-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.5fr)] md:py-9"
                >
                  <h3 className="font-mk-display text-[1.75rem] leading-[1.1]">{p.type}</h3>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mk-mono text-[0.74rem] text-mk-muted md:flex-col md:pt-2">
                    {p.sources.map((s) => (
                      <li key={s} className="whitespace-nowrap">{s}</li>
                    ))}
                  </ul>
                  <div>
                    <p className="font-mk-mono text-[0.68rem] uppercase tracking-[0.08em] text-mk-muted md:pt-2">{t("exampleAlertLabel")}</p>
                    <p className="mt-2 text-[1.02rem] leading-[1.6] text-mk-ink">{p.alert}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.9rem] text-mk-muted">{t("whoSoon")}</p>
          </Reveal>
        </section>

        {/* ── Closing call to action ── */}
        <section className="mk-dark">
          <Reveal className={`${CONTAINER} py-20 md:py-28`}>
            <h2 className="max-w-[18ch] font-mk-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.03] tracking-[-0.015em] text-balance">
              {t("closeTitle")}
            </h2>
            <p className="mt-5 max-w-[44ch] text-[1.08rem] leading-[1.65] text-mk-soft">{t("closeLead")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/signup" className={`${BTN} bg-mk-accent text-[#17140f] hover:bg-[#ff7240]`}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <span className="text-[0.84rem] text-mk-muted">{t("heroNote")}</span>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
