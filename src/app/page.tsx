import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import Bento from "@/components/marketing/Bento";
import HeroStage from "@/components/marketing/HeroStage";
import HowItWorks from "@/components/marketing/HowItWorks";
import MotionToggle from "@/components/marketing/MotionToggle";
import PersonaChats, { type Persona } from "@/components/marketing/PersonaChats";
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

const CONTAINER = "mx-auto max-w-[1160px] px-5 sm:px-8";
const H2 = "text-[clamp(1.8rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-balance";
const SECTION = `${CONTAINER} pb-24 md:pb-32`;
const BTN =
  "group inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[0.96rem] font-semibold transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]";
const BTN_PRIMARY = `${BTN} mk-btn bg-mk-ink text-[#0c0b0a] shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_40px_-12px_rgba(255,90,31,0.55)]`;
const ARROW = "size-4 transition-transform duration-200 group-mkh:translate-x-1";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const sources = ["Google Reviews", "Getir", "Yemeksepeti", "Trendyol", t("sourcePos"), "Google Analytics"];

  const personas: Persona[] = [
    { id: "cafe", name: t("persona1Type"), sources: ["Google Reviews", "Getir", "POS"], alert: t("persona1Alert") },
    { id: "restaurant", name: t("persona2Type"), sources: ["Yemeksepeti", "Trendyol", "Google Reviews"], alert: t("persona2Alert") },
    { id: "retail", name: t("persona3Type"), short: t("persona3Short"), sources: ["Google Reviews", "POS", "Google Analytics"], alert: t("persona3Alert") },
  ];

  return (
    <div className={`mk min-h-screen overflow-x-clip ${marketingFonts}`}>
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className="px-5 pb-12 pt-9 sm:px-8 sm:pt-12 lg:pt-14">
          <div className="mx-auto max-w-[1040px] text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-mk-line bg-white/[0.03] py-1.5 pl-2.5 pr-3.5 font-mk-mono text-[0.75rem] uppercase tracking-[0.08em] text-mk-soft">
              <span aria-hidden className="size-1.5 rounded-full bg-mk-accent shadow-[0_0_10px_2px_rgba(255,90,31,0.7)]" />
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-6 text-[clamp(1.85rem,7.6vw,4rem)] font-semibold leading-[1.04] tracking-[-0.045em]">
              <span className="block text-balance text-mk-muted">{t("heroTitleA")}</span>
              <span className="block text-balance">
                {t("heroTitleB1")} {t("heroTitleB2")}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[56ch] text-[1.04rem] leading-[1.55] text-mk-soft sm:text-[1.12rem]">{t("heroLead")}</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-x-3 gap-y-2 min-[440px]:flex-row min-[440px]:flex-wrap">
              <Link href="/signup" className={`${BTN_PRIMARY} w-full min-[440px]:w-auto`}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden className={ARROW} />
              </Link>
              <a href="#nasil-calisir" className={`${BTN} text-mk-soft mkh:text-mk-ink min-[440px]:border min-[440px]:border-mk-strong min-[440px]:text-mk-ink min-[440px]:mkh:border-mk-muted min-[440px]:mkh:bg-white/[0.04]`}>
                {t("ctaSecondary")}
              </a>
            </div>
            <p className="mt-3.5 text-[0.86rem] text-mk-muted">{t("heroNote")}</p>
          </div>

          <HeroStage />
        </section>

        {/* ── Sources: what it reads (names only; no third-party logos) ── */}
        <section aria-label={t("sourcesLabel")} className={SECTION}>
          <div className="flex flex-col items-center gap-x-10 gap-y-4 border-y border-mk-line py-6 lg:flex-row">
            <p className="shrink-0 font-mk-mono text-[0.75rem] uppercase tracking-[0.12em] text-mk-muted">{t("sourcesLabel")}</p>
            <ul className="flex flex-1 flex-wrap items-center justify-center gap-x-9 gap-y-2 lg:justify-between">
              {sources.map((src) => (
                <li key={src} className="text-[1.06rem] font-medium tracking-[-0.015em] text-mk-soft">
                  {src}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Problem: one statement, lit in two tones ── */}
        <section className={SECTION}>
          <Reveal>
            <p className="mk-eyebrow">{t("problemLabel")}</p>
            <p className="mt-5 max-w-[900px] text-[clamp(1.4rem,3.1vw,2.25rem)] font-semibold leading-[1.2] tracking-[-0.03em] text-pretty">
              {t("problemTitleA")} {t("problemTitleB")} <span className="text-mk-muted">{t("problemShort")}</span>
            </p>
          </Reveal>
        </section>

        {/* ── Features: bento ── */}
        <section className={SECTION}>
          <Reveal className="mb-9 md:mb-12">
            <p className="mk-eyebrow">{t("featuresLabel")}</p>
            <h2 className={`${H2} mt-4`}>
              <span className="block">{t("featTitleA")}</span>
              <span className="block">{t("featTitleB")}</span>
            </h2>
          </Reveal>
          <Reveal stagger="[data-tile]">
            <Bento />
            <p className="mt-4 flex items-center justify-between gap-3 font-mk-mono text-[0.75rem] text-mk-muted">
              {t("demoCaption")}
              <MotionToggle label={t("stagePause")} />
            </p>
          </Reveal>
        </section>

        {/* ── How it works: the sequence, illustrated ── */}
        <section id="nasil-calisir" className={`${SECTION} scroll-mt-20`}>
          <Reveal className="mb-9 md:mb-12">
            <p className="mk-eyebrow">{t("howItWorksLabel")}</p>
            <h2 className={`${H2} mt-4`}>
              <span className="block">{t("howTitle")}.</span>
              <span className="block">{t("howTitleB")}</span>
            </h2>
          </Reveal>
          <Reveal stagger="[data-step]">
            <HowItWorks />
          </Reveal>
        </section>

        {/* ── Who it is for ── */}
        <section className={SECTION}>
          <Reveal className="mb-9 md:mb-12">
            <p className="mk-eyebrow">{t("builtForLabel")}</p>
            <h2 className={`${H2} mt-4 max-w-[16em]`}>{t("whoTitle")}</h2>
          </Reveal>
          <Reveal>
            <PersonaChats
              personas={personas}
              label={t("whoTabsLabel")}
              caption={t("exampleAlertLabel")}
              hint={t("demoReplyHint")}
              sourcesLabel={t("whoSourcesLabel")}
              note={t("whoSoon")}
            />
          </Reveal>
        </section>

        {/* ── Closing call to action ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="mk-gridlines absolute inset-0" />
            <div className="mk-glow absolute -bottom-[340px] left-1/2 h-[640px] w-[min(1100px,170vw)] -translate-x-1/2" />
            <div className="mk-grain absolute inset-0" />
          </div>
          <Reveal className={`${CONTAINER} relative py-24 text-center md:py-32`}>
            <h2 className="mx-auto max-w-[14em] text-[clamp(2rem,6vw,4rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-balance">{t("closeTitle")}</h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-[1.1rem] leading-[1.55] text-mk-soft">{t("closeLead")}</p>
            <div className="mt-9 flex justify-center">
              <Link href="/signup" className={BTN_PRIMARY}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden className={ARROW} />
              </Link>
            </div>
            <p className="mt-5 text-[0.84rem] text-mk-soft">{t("heroNote")}</p>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
