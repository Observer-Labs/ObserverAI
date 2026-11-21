import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Star } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import Bubble, { TypingDots } from "@/components/marketing/Bubble";
import HeroChat from "@/components/marketing/HeroChat";
import HowItWorks from "@/components/marketing/HowItWorks";
import PersonaChats, { type Persona } from "@/components/marketing/PersonaChats";
import Reveal from "@/components/marketing/Reveal";
import SiteFooter from "@/components/marketing/SiteFooter";
import { marketingFonts } from "@/components/marketing/fonts";
import { cn } from "@/lib/utils";

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
const H2 = "font-mk-display text-[clamp(2rem,4.8vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance";
const BTN =
  "group inline-flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[1rem] font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97]";
const ARROW = "size-4 transition-transform duration-200 group-mkh:translate-x-1";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const sources = ["Google Reviews", "Getir", "Yemeksepeti", "Trendyol", t("sourcePos"), "Google Analytics"];

  const personas: Persona[] = [
    { id: "cafe", name: t("persona1Type"), sources: ["Google Reviews", "Getir", "POS"], alert: t("persona1Alert") },
    { id: "restaurant", name: t("persona2Type"), sources: ["Yemeksepeti", "Trendyol", "Google Reviews"], alert: t("persona2Alert") },
    { id: "retail", name: t("persona3Type"), sources: ["Google Reviews", "POS", "Google Analytics"], alert: t("persona3Alert") },
  ];

  // The unread pile: what customers say, spread over apps nobody has time to open.
  const noise = [
    { text: t("pipelineReview1"), source: "Google Reviews", stars: 2, cls: "" },
    { text: t("pipelineReview2"), source: "Yemeksepeti", stars: 1, cls: "ml-auto" },
    { text: t("noise4"), source: "Getir", stars: 1, cls: "ml-6 sm:ml-10" },
    { text: t("pipelineReview3"), source: "Google Reviews", stars: 3, cls: "ml-auto mr-4" },
    { text: t("noise5"), source: "Google Reviews", stars: 2, cls: "" },
    { text: t("noise6"), source: "Trendyol", stars: 2, cls: "ml-auto" },
  ];

  return (
    <div className={`mk min-h-screen overflow-x-clip ${marketingFonts}`}>
      <SiteHeader />

      <main>
        {/* ── Hero: the headline answers in a bubble, the product answers in a chat ── */}
        <section className={`${CONTAINER} grid grid-cols-1 items-center gap-x-12 gap-y-12 pb-16 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-24 lg:pt-16`}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-mk-line py-1.5 pl-2.5 pr-3.5 text-[0.82rem] font-medium text-mk-soft">
              <span aria-hidden className="size-2 rounded-full bg-mk-accent" />
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-6 font-mk-display text-[clamp(1.9rem,9.6vw,4.9rem)] font-extrabold leading-[0.98] tracking-[-0.045em] min-[360px]:text-[clamp(2.2rem,10.4vw,4.9rem)] lg:text-[clamp(2.9rem,4.5vw,4rem)]">
              {t("heroTitleA")}
              <span className="mt-[0.12em] block">
                {t("heroTitleB1")}{" "}
                <span className="inline-block -rotate-[1.5deg] rounded-[0.42em] rounded-bl-[0.1em] bg-mk-accent px-[0.26em] pb-[0.1em] pt-[0.04em] text-[#0f1512]">
                  {t("heroTitleB2")}
                </span>
              </span>
            </h1>
            <p className="mt-7 max-w-[46ch] text-[1.1rem] leading-[1.6] text-mk-soft sm:text-[1.16rem]">{t("heroLead")}</p>
            <div className="mt-9 flex flex-col gap-3 min-[440px]:flex-row min-[440px]:items-center">
              <Link href="/signup" className={`${BTN} bg-mk-ink text-mk-paper mkh:bg-mk-soft`}>
                {t("ctaPrimary")}
                <ArrowRight aria-hidden className={ARROW} />
              </Link>
              <a href="#nasil-calisir" className={`${BTN} border border-mk-line px-6 text-mk-ink mkh:border-mk-ink`}>
                {t("ctaSecondary")}
              </a>
            </div>
            <p className="mt-5 text-[0.86rem] text-mk-muted">{t("heroNote")}</p>
          </div>

          <HeroChat />
        </section>

        {/* ── Sources: the channels Observer reads ── */}
        <section aria-label={t("sourcesLabel")} className={CONTAINER}>
          <div className="flex flex-col gap-x-8 gap-y-4 border-y border-mk-line py-6 md:flex-row md:items-center">
            <p className="shrink-0 font-mk-mono text-[0.7rem] uppercase tracking-[0.08em] text-mk-muted">{t("sourcesLabel")}</p>
            <ul className="flex flex-wrap items-center gap-2 md:ml-auto">
              {sources.map((src) => (
                <li key={src} className="rounded-full bg-mk-sunken px-3.5 py-1.5 text-[0.9rem] font-medium text-mk-soft">
                  {src}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Problem: the unread pile ── */}
        <section className={`${CONTAINER} grid grid-cols-1 items-center gap-x-16 gap-y-10 py-20 md:grid-cols-2 md:py-28`}>
          <Reveal>
            <p className="mk-eyebrow">{t("problemLabel")}</p>
            <h2 className={`${H2} mt-4`}>
              {t("problemTitleA")} <span className="text-mk-muted">{t("problemTitleB")}</span>
            </h2>
            <div className="mt-7 flex max-w-[52ch] flex-col gap-4 text-[1.05rem] leading-[1.65] text-mk-soft">
              <p>{t("problemBody1")}</p>
              <p>{t("problemBody2")}</p>
            </div>
          </Reveal>
          <Reveal stagger="[data-noise]">
            <ul aria-label={t("noiseLabel")} className="mk-wall flex flex-col gap-2.5 rounded-[28px] px-4 py-6 sm:px-7 sm:py-8">
              {noise.map((n, i) => (
                <li key={n.text} data-noise className={cn("w-fit max-w-[86%]", n.cls, i > 3 && "hidden sm:block")}>
                  <Bubble tone="customer" className={cn("py-2.5", i % 2 === 1 && "rounded-bl-[20px] rounded-br-[6px]")}>
                    <span className="flex items-center gap-2 font-mk-mono text-[0.64rem] text-mk-muted">
                      {n.source}
                      <span aria-hidden className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={cn("size-2.5", s <= n.stars ? "fill-mk-ink text-mk-ink" : "fill-mk-line text-mk-line")} />
                        ))}
                      </span>
                    </span>
                    <span className="mt-1 block">&ldquo;{n.text}&rdquo;</span>
                  </Bubble>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right font-mk-mono text-[0.66rem] text-mk-muted">{t("demoCaption")}</p>
          </Reveal>
        </section>

        {/* ── How it works: one conversation, four steps ── */}
        <section id="nasil-calisir" className={`${CONTAINER} scroll-mt-20 pb-20 md:pb-28`}>
          <Reveal className="mb-10 max-w-[640px] md:mb-12">
            <p className="mk-eyebrow">{t("howItWorksLabel")}</p>
            <h2 className={`${H2} mt-4`}>{t("howTitle")}</h2>
            <p className="mt-5 text-[1.05rem] leading-[1.65] text-mk-soft">{t("howLead")}</p>
          </Reveal>
          <Reveal stagger="[data-step]">
            <HowItWorks />
          </Reveal>
        </section>

        {/* ── Who it is for: pick a chat ── */}
        <section className={`${CONTAINER} pb-20 md:pb-28`}>
          <Reveal className="mb-10 max-w-[640px] md:mb-12">
            <p className="mk-eyebrow">{t("builtForLabel")}</p>
            <h2 className={`${H2} mt-4`}>{t("whoTitle")}</h2>
          </Reveal>
          <Reveal>
            <PersonaChats personas={personas} label={t("whoTabsLabel")} caption={t("exampleAlertLabel")} hint={t("demoReplyHint")} />
            <p className="mt-5 text-[0.9rem] text-mk-muted">{t("whoSoon")}</p>
          </Reveal>
        </section>

        {/* ── Closing call to action: Observer is already typing ── */}
        <section className="mk-orange">
          <Reveal className={`${CONTAINER} grid grid-cols-1 items-end gap-x-12 gap-y-10 py-20 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-center md:py-28`}>
            <div>
              <h2 className="max-w-[16ch] font-mk-display text-[clamp(2.3rem,6.4vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-balance">
                {t("closeTitle")}
              </h2>
              <p className="mt-6 max-w-[40ch] text-[1.12rem] font-medium leading-[1.55] text-mk-soft">{t("closeLead")}</p>
              <div className="mt-9 flex flex-col gap-x-5 gap-y-3 min-[440px]:flex-row min-[440px]:items-center">
                <Link href="/signup" className={`${BTN} bg-mk-ink text-white mkh:bg-[#26302a]`}>
                  {t("ctaPrimary")}
                  <ArrowRight aria-hidden className={ARROW} />
                </Link>
                <span className="text-[0.9rem] font-medium text-mk-muted">{t("heroNote")}</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <Bubble className="flex items-center rounded-[28px] rounded-bl-[8px] px-8 py-7 text-mk-ink shadow-[0_24px_48px_-24px_rgba(15,21,18,0.45)]">
                <TypingDots className="mk-dots-wait gap-2 [&>span]:size-3" />
              </Bubble>
              <p className="font-mk-mono text-[0.74rem] font-medium text-mk-muted">{t("typingLabel")}</p>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
