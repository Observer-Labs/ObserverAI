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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HeroCanvas = dynamic(() => import("@/components/marketing/HeroCanvas"), { ssr: false });

gsap.registerPlugin(useGSAP, ScrollTrigger);

// ── Data ────────────────────────────────────────────────────────────────────

const sources = [
  "Google Reviews", "Getir", "Yemeksepeti", "Trendyol", "POS / Payments", "Google Analytics",
];

// ── WhatsApp phone mockup (dark, the one dark element) ───────────────────────

function PhoneMockup({ waBusinessLabel, waUrgentLabel, waReplyHint }: { waBusinessLabel: string; waUrgentLabel: string; waReplyHint: string }) {
  return (
    <div className="relative mx-auto w-80 max-w-full overflow-hidden rounded-[36px] border-[10px] border-[#18181b] bg-[#0a0a0a] shadow-[0_30px_90px_rgba(16,24,40,0.18),0_0_0_1px_rgba(16,24,40,0.04)]">
      <div className="absolute left-1/2 top-0 z-[3] h-[22px] w-[120px] -translate-x-1/2 rounded-b-[14px] bg-[#18181b]" />
      <div className="flex items-center gap-[11px] bg-[#1f2c34] px-4 pb-3 pt-[26px]">
        <div className="flex size-[38px] items-center justify-center rounded-full border-[1.5px] border-white/15 bg-[#202c33] text-[0.9rem] font-extrabold text-[#e9edef]">S</div>
        <div className="flex-1">
          <div className="text-[0.92rem] font-semibold text-[#e9edef]">Observer</div>
          <div className="text-[0.7rem] text-[#8696a0]">{waBusinessLabel}</div>
        </div>
        <div className="text-[1.1rem] text-[#8696a0]">⋮</div>
      </div>
      <div className="flex min-h-[420px] flex-col gap-2 bg-[#0b141a] px-3 pb-[18px] pt-4">
        <div className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-[#202c33] px-[13px] py-[11px]">
          <div className="mb-[5px] text-[0.8rem] font-extrabold text-[#f0857d]">{waUrgentLabel}</div>
          <div className="mb-[7px] text-[0.82rem] leading-relaxed text-[#e9edef]">
            <strong>Wait times spiking at Kadıköy</strong><br />
            14 customers complained this week, 2× vs last week.
          </div>
          <div className="mb-2 text-[0.76rem] text-[#9fd9bf]">💰 Weekend revenue at risk</div>
          <div
            className="border-t border-white/[0.07] pt-[7px] text-[0.72rem] text-[#8696a0]"
            dangerouslySetInnerHTML={{ __html: waReplyHint }}
          />
          <div className="mt-1 text-right text-[0.6rem] text-[#667781]">09:24</div>
        </div>
        <div className="max-w-[50%] self-end rounded-[12px_4px_12px_12px] bg-[#005c4b] px-[13px] py-2">
          <div className="text-[0.85rem] font-semibold text-[#e9edef]">1</div>
          <div className="mt-0.5 text-right text-[0.6rem] text-[#9fd9bf]">09:24 ✓✓</div>
        </div>
        <div className="max-w-[92%] rounded-[4px_12px_12px_12px] bg-[#202c33] px-[13px] py-[11px]">
          <div className="text-[0.8rem] leading-[1.55] text-[#e9edef]">
            📊 <strong>9 Google reviews · 5 Getir orders</strong> mention waits over 15 min, mostly Fri to Sun, 7 to 9pm.<br /><br />
            ✅ <strong>Suggested:</strong> add one person to the weekend evening shift.
          </div>
          <div className="mt-1 text-right text-[0.6rem] text-[#667781]">09:24</div>
        </div>
        <div className="max-w-[55%] self-end rounded-[12px_4px_12px_12px] bg-[#005c4b] px-[13px] py-2">
          <div className="text-[0.85rem] font-semibold text-[#e9edef]">2 ✓</div>
          <div className="mt-0.5 text-right text-[0.6rem] text-[#9fd9bf]">09:25 ✓✓</div>
        </div>
        <div className="max-w-[80%] rounded-[10px] border border-[#00a884]/30 bg-[#00a884]/[0.18] px-3 py-2">
          <div className="text-[0.76rem] font-semibold text-[#7fe0c0]">✅ Marked as handled. Logged.</div>
        </div>
      </div>
    </div>
  );
}

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
      gsap.from("[data-phone]", { y: 40, opacity: 0, duration: 0.9, delay: 0.25, ease: "power3.out" });
      gsap.to("[data-phone]", { y: -10, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });
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
    <div ref={root} className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <SiteHeader />

      {/* ── Hero ── */}
      <div className="relative">
        <HeroCanvas className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
        <div className="relative mx-auto max-w-[1160px] px-5 pb-[90px] pt-20 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_0.85fr] md:gap-16">
            <div data-hero>
              {/* Value-prop flow: customer signals -> Observer -> WhatsApp */}
              <div className="mb-7 flex flex-wrap items-center gap-2.5 font-mono">
                <span className="text-[0.72rem] text-muted-foreground">{t("heroFlow")}</span>
                <span className="text-muted-foreground/45">→</span>
                <span className="text-[0.72rem] font-bold">Observer</span>
                <span className="text-muted-foreground/45">→</span>
                <span className="inline-flex items-center gap-[5px] text-[0.72rem] font-bold text-[#00a884]">
                  <span className="size-1.5 rounded-full bg-[#00a884]" />
                  WhatsApp
                </span>
              </div>

              <h1 className="mb-[22px] text-[clamp(2.6rem,5vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
                {t("heroTitle")}<br />
                <span className="text-muted-foreground">{t("heroTitleAccent")}</span>
              </h1>

              <p className="mb-9 max-w-[470px] text-[1.05rem] leading-[1.68] text-muted-foreground">
                {t("heroSubtitle")}
              </p>

              <div className="mb-[18px] flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-[10px] px-7 text-[0.975rem]">
                  <Link href="/signup">{t("tryFree")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-[10px] px-[22px] text-[0.9rem]">
                  <Link href="/showcase">{t("seeExample")}</Link>
                </Button>
              </div>
              <p className="text-[0.78rem] text-muted-foreground">
                {t("noCard")}
              </p>
            </div>

            <div data-phone>
              <PhoneMockup waBusinessLabel={t("waBusinessLabel")} waUrgentLabel={t("waUrgentLabel")} waReplyHint={t.raw("waReplyHint")} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sources strip ── */}
      <div className="border-y border-border bg-muted">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-5 px-5 py-[18px] sm:px-10">
          <span className="shrink-0 text-[0.64rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("watchesLabel")}</span>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src) => (
              <Badge key={src} variant="outline" className="rounded-full bg-background px-3 py-1 text-[0.78rem] font-medium text-muted-foreground">
                {src}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <div data-reveal className="mx-auto max-w-[740px] px-5 py-24 sm:px-10">
        <p className="mb-[26px] text-[0.64rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("problemLabel")}</p>
        <h2 className="mb-[26px] text-[clamp(1.75rem,3.5vw,2.7rem)] font-extrabold leading-[1.15] tracking-[-0.035em]">
          {t("problemTitle")}<br />{t("problemTitleAccent")}
        </h2>
        <p className="mb-4 max-w-[600px] text-base leading-[1.72] text-muted-foreground">
          {t("problemBody1")}
        </p>
        <p className="max-w-[600px] text-base leading-[1.72] text-muted-foreground">
          {t("problemBody2")}
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="border-t border-border">
        <div data-reveal className="mx-auto max-w-[1160px] px-5 py-20 sm:px-10">
          <p className="mb-10 text-center text-[0.64rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("howItWorksLabel")}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-2xl border border-border bg-card p-[22px] pt-[26px] transition-shadow hover:shadow-md">
                <div className="mb-3.5 text-[1.8rem]">{step.icon}</div>
                <div className="mb-1.5 font-mono text-[0.6rem] font-bold tracking-[0.1em] text-muted-foreground">{step.n}</div>
                <div className="mb-[9px] text-base font-bold tracking-[-0.02em]">{step.title}</div>
                <div className="text-[0.84rem] leading-relaxed text-muted-foreground">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Personas ── */}
      <div className="border-t border-border bg-muted">
        <div data-reveal className="mx-auto max-w-[1160px] px-5 py-20 sm:px-10">
          <div className="mb-12 text-center">
            <p className="mb-3.5 text-[0.64rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("builtForLabel")}</p>
            <h2 className="text-[clamp(1.6rem,3.2vw,2.4rem)] font-extrabold tracking-[-0.03em]">
              {t("builtForTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {personas.map((p) => (
              <div key={p.type} className="rounded-[20px] border border-border bg-card p-7 transition-shadow hover:shadow-md">
                <div className="mb-3.5 text-[2.2rem]">{p.icon}</div>
                <div className="mb-3.5 text-[0.92rem] font-bold tracking-[-0.01em]">{p.type}</div>
                <div className="mb-[18px] flex flex-wrap gap-[5px]">
                  {p.sources.map((s) => (
                    <Badge key={s} variant="outline" className="rounded-full bg-muted px-[9px] py-[3px] font-mono text-[0.66rem] font-semibold text-muted-foreground">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-muted px-4 py-3.5">
                  <div className="mb-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("exampleAlertLabel")}</div>
                  <div className="text-[0.82rem] leading-relaxed">{p.gap}</div>
                </div>
              </div>
            ))}
          </div>
          <p
            className="mt-7 text-center text-[0.8rem] text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: t.raw("comingSoon") }}
          />
        </div>
      </div>

      {/* ── Proof ── */}
      <div className="border-t border-border">
        <div data-reveal className="mx-auto max-w-[1160px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            {proof.map((p, i) => (
              <div key={p.label} className={`px-5 py-12 sm:px-10 ${i < 3 ? "md:border-r md:border-border" : ""}`}>
                <div className="mb-2.5 font-mono text-[3rem] font-extrabold leading-none tracking-[-0.045em]">{p.n}</div>
                <div className="text-[0.84rem] leading-normal text-muted-foreground">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="border-t border-border">
        <div data-reveal className="mx-auto max-w-[1160px] px-5 pb-[110px] pt-24 text-center sm:px-10">
          <h2 className="mx-auto mb-8 max-w-[680px] text-[clamp(2.2rem,4.5vw,3.6rem)] font-extrabold leading-[1.08] tracking-[-0.04em]">
            {t("ctaTitle")}
          </h2>
          <Button asChild size="lg" className="rounded-[10px] px-[34px] text-base">
            <Link href="/signup">{t("tryFree")}</Link>
          </Button>
          <p className="mt-[18px] text-[0.78rem] text-muted-foreground">{t("noCard")}</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-5 sm:px-10">
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
