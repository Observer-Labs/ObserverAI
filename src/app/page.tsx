"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteHeader from "@/components/layout/SiteHeader";
import Logo from "@/components/Logo";
import SignalFeed from "@/components/marketing/SignalFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HeroCanvas = dynamic(() => import("@/components/marketing/HeroCanvas"), { ssr: false });

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Data ────────────────────────────────────────────────────────────────────

const sources = [
  "Google Reviews", "Getir", "Yemeksepeti", "Trendyol", "POS / Payments", "Google Analytics",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");
  const root = useRef<HTMLDivElement>(null);

  const personas = [
    { icon: "☕", type: t("persona1Type"), sources: ["Google Reviews", "Getir", "POS"], gap: "Bu hafta 12 kişi Kadıköy şubenizde sabah kuyruğunun çok yavaş olduğunu söyledi. 8-10 arası vardiyaya bir barista ekleyin." },
    { icon: "🍽️", type: t("persona2Type"), sources: ["Yemeksepeti", "Trendyol", "Google"], gap: "Yemeksepeti'ndeki soğuk yemek şikayetleri bu hafta sonu üçe katlandı, hepsi gece 9'dan sonraki geç teslimatlardan. Kurye teslimat sürecini kontrol edin." },
    { icon: "🏪", type: t("persona3Type"), sources: ["Google Reviews", "POS", "Analytics"], gap: "Cumartesi müşteri trafiği artıyor ama satışlar sabit. Müşteriler uzun ödeme kuyruklarından bahsediyor. Hafta sonları ikinci kasayı açın." },
  ];

  const steps = [
    { n: "01", icon: "🔌", title: t("step1Title"), body: t("step1Body") },
    { n: "02", icon: "🧠", title: t("step2Title"), body: t("step2Body") },
    { n: "03", icon: "💬", title: t("step3Title"), body: t("step3Body") },
    { n: "04", icon: "✅", title: t("step4Title"), body: t("step4Body") },
  ];

  const proof = [
    { n: "5dk", label: t("proof1Label") },
    { n: "0", label: t("proof2Label") },
    { n: "1", label: t("proof3Label") },
    { n: "7/24", label: t("proof4Label") },
  ];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-hero] > *", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 });
      gsap.to("[data-marquee]", { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 28, opacity: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-screen bg-[#fbfaf7] text-foreground">

      {/* ── Nav ── */}
      <SiteHeader />

      {/* ── Hero ── */}
      <div className="relative">
        <HeroCanvas className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-14 sm:px-10 md:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-20">
            <div data-hero>
              {/* Value-prop flow: customer signals -> Observer -> WhatsApp */}
              <div className="mb-8 inline-flex flex-wrap items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2 font-mono shadow-sm">
                <span className="text-[0.72rem] text-muted-foreground">{t("heroFlow")}</span>
                <span className="text-muted-foreground/45">→</span>
                <span className="text-[0.72rem] font-bold">Observer</span>
                <span className="text-muted-foreground/45">→</span>
                <span className="inline-flex items-center gap-[5px] text-[0.72rem] font-bold text-[#00a884]">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#00a884]" />
                  WhatsApp
                </span>
              </div>

              <h1 className="mb-6 font-display text-[clamp(2.9rem,5.5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.03em]">
                {t("heroTitle")}<br />
                <span className="bg-[linear-gradient(transparent_62%,rgba(253,186,116,0.55)_62%)] pr-1">{t("heroTitleAccent")}</span>
              </h1>

              <p className="mb-10 max-w-[470px] text-[1.1rem] leading-[1.7] text-muted-foreground">
                {t("heroSubtitle")}
              </p>

              <div className="mb-[18px] flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-[#f97316] px-8 text-[0.975rem] text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#ea6a0a] hover:shadow-[0_12px_32px_rgba(249,115,22,0.4)]">
                  <Link href="/signup">{t("tryFree")}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-6 text-[0.95rem] text-foreground hover:bg-[#f4f1ea]">
                  <Link href="/showcase">{t("seeExample")} →</Link>
                </Button>
              </div>
              <p className="text-[0.78rem] text-muted-foreground">
                {t("noCard")}
              </p>
            </div>

            <SignalFeed />
          </div>
        </div>
      </div>

      {/* ── Sources marquee ── */}
      <div className="py-10">
        <p className="mb-6 text-center text-[0.64rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("watchesLabel")}</p>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div data-marquee className="flex w-max">
            {[0, 1].map((set) => (
              <div key={set} className="flex shrink-0 gap-3 pr-3" aria-hidden={set === 1}>
                {sources.map((src) => (
                  <Badge key={src} variant="outline" className="rounded-full border-[#eae5da] bg-white px-5 py-2.5 text-[0.85rem] font-semibold text-foreground/70 shadow-sm">
                    {src}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <div data-reveal className="mx-auto max-w-[860px] px-5 py-28 text-center sm:px-10 md:py-36">
        <p className="mb-7 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#f97316]">{t("problemLabel")}</p>
        <h2 className="mb-8 font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-bold leading-[1.08] tracking-[-0.025em]">
          {t("problemTitle")}<br />
          <span className="bg-[linear-gradient(transparent_62%,rgba(253,186,116,0.55)_62%)] pr-1">{t("problemTitleAccent")}</span>
        </h2>
        <p className="mx-auto mb-4 max-w-[620px] text-[1.05rem] leading-[1.75] text-muted-foreground">
          {t("problemBody1")}
        </p>
        <p className="mx-auto max-w-[620px] text-[1.05rem] leading-[1.75] text-muted-foreground">
          {t("problemBody2")}
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="px-3 sm:px-5">
        <div data-reveal className="mx-auto max-w-[1320px] rounded-[40px] bg-[#f3efe6] px-5 py-20 sm:px-10 md:py-24">
          <p className="mb-14 text-center text-[0.64rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("howItWorksLabel")}</p>
          <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
            {steps.map((step, i) => {
              const chipTints = ["bg-[#ffe8d6]", "bg-[#fde7f1]", "bg-[#e3f2e9]", "bg-[#e7f0fd]"];
              return (
                <div key={step.n} className="relative rounded-3xl bg-white p-7 shadow-[0_2px_16px_rgba(60,50,30,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-0.5deg] hover:shadow-[0_18px_44px_rgba(60,50,30,0.12)]">
                  <div className={`mb-5 flex size-14 items-center justify-center rounded-2xl text-[1.65rem] ${chipTints[i]}`}>{step.icon}</div>
                  <div className="mb-1.5 font-mono text-[0.6rem] font-bold tracking-[0.1em] text-[#f97316]">{step.n}</div>
                  <div className="mb-[9px] text-[1.05rem] font-bold tracking-[-0.02em]">{step.title}</div>
                  <div className="text-[0.86rem] leading-relaxed text-muted-foreground">{step.body}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Personas ── */}
      <div data-reveal className="mx-auto max-w-[1160px] px-5 py-24 sm:px-10 md:py-32">
        <div className="mb-14 text-center">
          <p className="mb-3.5 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#f97316]">{t("builtForLabel")}</p>
          <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.7rem)] font-bold tracking-[-0.025em]">
            {t("builtForTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {personas.map((p, i) => {
            const tints = ["bg-[#fff3e8]", "bg-[#eef6ee]", "bg-[#eef3fb]"];
            const rotations = ["md:-rotate-1", "md:translate-y-3", "md:rotate-1"];
            return (
              <div key={p.type} className={`rounded-[28px] p-8 transition-all duration-300 hover:-translate-y-2 hover:rotate-0 hover:shadow-[0_20px_48px_rgba(60,50,30,0.12)] ${tints[i]} ${rotations[i]}`}>
                <div className="mb-4 text-[2.4rem]">{p.icon}</div>
                <div className="mb-4 font-display text-[1.15rem] font-bold tracking-[-0.01em]">{p.type}</div>
                <div className="mb-5 flex flex-wrap gap-[5px]">
                  {p.sources.map((s) => (
                    <Badge key={s} variant="outline" className="rounded-full border-black/[0.06] bg-white/70 px-[10px] py-[3px] font-mono text-[0.66rem] font-semibold text-foreground/60">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(60,50,30,0.06)]">
                  <div className="mb-2 flex items-center gap-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#f97316]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#f97316]" />
                    {t("exampleAlertLabel")}
                  </div>
                  <div className="text-[0.84rem] leading-relaxed text-foreground/85">{p.gap}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p
          className="mt-10 text-center text-[0.8rem] text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: t.raw("comingSoon") }}
        />
      </div>

      {/* ── Proof ── */}
      <div className="px-3 sm:px-5">
        <div data-reveal className="mx-auto max-w-[1320px] rounded-[40px] bg-[#101728] px-5 py-16 sm:px-10 md:py-20">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-10 text-center sm:grid-cols-2 md:grid-cols-4">
            {proof.map((p) => (
              <div key={p.label}>
                <div className="mb-3 font-display text-[3.4rem] font-bold leading-none tracking-[-0.03em] text-white">
                  {p.n}
                </div>
                <div className="mx-auto max-w-[200px] text-[0.86rem] leading-normal text-white/55">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="px-3 py-16 sm:px-5 md:py-20">
        <div data-reveal className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#f97316_0%,#fb923c_55%,#fdba74_100%)] px-5 py-20 text-center sm:px-10 md:py-28">
          <div className="pointer-events-none absolute -right-20 -top-24 size-[340px] rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 size-[300px] rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative mx-auto mb-10 max-w-[720px] font-display text-[clamp(2.4rem,4.6vw,3.8rem)] font-bold leading-[1.06] tracking-[-0.03em] text-white">
            {t("ctaTitle")}
          </h2>
          <Button asChild size="lg" className="relative h-[52px] rounded-full bg-white px-10 text-base font-bold text-[#ea6a0a] shadow-[0_10px_30px_rgba(124,45,0,0.25)] transition-all hover:-translate-y-0.5 hover:bg-white/95">
            <Link href="/signup">{t("tryFree")}</Link>
          </Button>
          <p className="relative mt-[18px] text-[0.78rem] text-white/75">{t("noCard")}</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8df] px-5 py-6 sm:px-10">
        <Logo size={18} textSize="0.82rem" color="var(--muted-foreground)" gap={7} />
        <div className="flex gap-5">
          <Link href="/pricing" className="text-[0.78rem] text-muted-foreground hover:text-foreground">{tNav("pricing")}</Link>
          <Link href="/login" className="text-[0.78rem] text-muted-foreground hover:text-foreground">{tNav("signIn")}</Link>
          <Link href="/signup" className="text-[0.78rem] text-muted-foreground hover:text-foreground">{tNav("signUp")}</Link>
          <Link href="/terms" className="text-[0.78rem] text-muted-foreground hover:text-foreground">{t("footerTerms")}</Link>
          <Link href="/privacy" className="text-[0.78rem] text-muted-foreground hover:text-foreground">{t("footerPrivacy")}</Link>
        </div>
        <span className="text-[0.72rem] text-muted-foreground">{t("footerTagline")}</span>
      </div>
    </div>
  );
}
