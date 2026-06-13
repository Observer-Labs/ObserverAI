"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Hand-drawn connector arrow between two pipeline stages. */
function FlowArrow() {
  return (
    <div data-arrow className="flex shrink-0 items-center justify-center py-5 sm:w-16 sm:py-0">
      {/* vertical on mobile, horizontal on desktop; wobbly sketch stroke */}
      <svg className="h-10 w-10 rotate-90 text-[var(--brand)] sm:h-12 sm:w-16 sm:rotate-0" viewBox="0 0 64 40" fill="none" aria-hidden>
        <path
          d="M4 21 C 16 13, 25 28, 37 19 S 49 16, 55 21"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none"
        />
        <path
          d="M47 12 C 51 16, 54 19, 56 21 C 53 23, 50 26, 47 30"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
    </div>
  );
}

function StageHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-5 text-center">
      <div className="mb-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">{label}</div>
      <div className="font-display text-[1.2rem] font-bold tracking-[-0.01em]">{title}</div>
    </div>
  );
}

export default function PipelineSection() {
  const t = useTranslations("landing");
  const wrap = useRef<HTMLDivElement>(null);

  const reviews = [
    { text: t("pipelineReview1"), stars: 2 },
    { text: t("pipelineReview2"), stars: 1 },
    { text: t("pipelineReview3"), stars: 3 },
  ];

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-stage]", {
        y: 30, opacity: 0, duration: 0.6, stagger: 0.18, ease: "power2.out",
        scrollTrigger: { trigger: wrap.current, start: "top 75%" },
      });
      gsap.from("[data-arrow]", {
        opacity: 0, scale: 0.6, duration: 0.4, stagger: 0.18, delay: 0.3, ease: "back.out(2)",
        scrollTrigger: { trigger: wrap.current, start: "top 75%" },
      });
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className="flex flex-col items-stretch sm:flex-row sm:items-center">

      {/* ── 1. Reviews ── */}
      <div data-stage className="flex w-full flex-col sm:flex-1">
        <StageHeader label="01" title={t("pipelineCol1Title")} />
        <div className="flex flex-1 flex-col gap-3 rounded-[28px] border border-[#ece8df] bg-white p-6">
          {reviews.map((r) => (
            <div key={r.text} className="rounded-2xl bg-[#faf8f3] px-4 py-3.5">
              <div className="mb-1.5 text-[0.78rem] tracking-[0.1em] text-[#f5a623]">
                {"★".repeat(r.stars)}<span className="text-[#e4ddcf]">{"★".repeat(5 - r.stars)}</span>
              </div>
              <p className="text-[0.86rem] leading-snug text-foreground/70">&ldquo;{r.text}&rdquo;</p>
            </div>
          ))}
          <p className="mt-1.5 text-center text-[0.78rem] text-muted-foreground">{t("pipelineCol1Caption")}</p>
        </div>
      </div>

      <FlowArrow />

      {/* ── 2. Dashboard (Observer reads & clusters) ── */}
      <div data-stage className="flex w-full flex-col sm:flex-1">
        <StageHeader label="02" title={t("pipelineCol2Title")} />
        <div className="flex flex-1 flex-col rounded-[28px] border border-[#ece8df] bg-white p-6">
          <div className="mb-4 flex items-center gap-2 border-b border-[#f3efe6] pb-4">
            <LogoMark size={22} />
            <span className="text-[0.85rem] font-bold italic">Observer</span>
            <span className="ml-auto flex items-center gap-1 text-[0.66rem] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--brand)]" />{t("step2Title")}
            </span>
          </div>
          <div className="mb-2 text-[0.82rem] font-bold">{t("pipelineDashboardStat")}</div>
          <div className="mb-4 flex h-[66px] items-end gap-1.5">
            {[34, 58, 26, 72, 44, 62, 90].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-[4px] ${i === 6 ? "bg-[var(--brand)]" : "bg-[#efeadd]"}`} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[
              { sev: t("feedSevCritical"), cls: "bg-red-50 text-red-600", txt: t("feedCard1Title") },
              { sev: t("feedSevHigh"), cls: "bg-amber-50 text-amber-600", txt: t("feedCard2Title") },
            ].map((r) => (
              <div key={r.txt} className="flex items-center gap-2.5 rounded-xl border border-[#f3efe6] px-3 py-2.5">
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[0.55rem] font-bold ${r.cls}`}>{r.sev}</span>
                <span className="truncate text-[0.74rem] text-foreground/70">{r.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FlowArrow />

      {/* ── 3. WhatsApp ── */}
      <div data-stage className="flex w-full flex-col sm:flex-1">
        <StageHeader label="03" title={t("pipelineCol3Title")} />
        <div className="flex flex-1 flex-col gap-3 rounded-[28px] bg-[#0b141a] p-6 ring-2 ring-[#00a884]/35">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-[#00a884]" />
            <span className="text-[0.85rem] font-bold text-[#9fd9bf]">WhatsApp</span>
            <span className="ml-auto text-[0.7rem] text-[#8696a0]">09:24</span>
          </div>
          <div className="rounded-[4px_16px_16px_16px] bg-[#202c33] px-4 py-3">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <span className="text-[0.88rem] font-bold leading-snug text-[#e9edef]">{t("feedCard1Title")}</span>
              <span className="shrink-0 rounded-full bg-[#f0857d]/15 px-2 py-0.5 font-mono text-[0.55rem] font-bold text-[#f0857d]">{t("feedSevCritical")}</span>
            </div>
            <p className="text-[0.8rem] leading-relaxed text-[#8696a0]">{t("feedCard1Body")}</p>
          </div>
          <div className="ml-auto w-fit rounded-[16px_4px_16px_16px] bg-[#005c4b] px-3.5 py-2">
            <span className="text-[0.84rem] font-semibold text-[#e9edef]">1</span>
            <span className="ml-2 text-[0.62rem] text-[#9fd9bf]">✓✓</span>
          </div>
          <div className="w-fit rounded-full border border-[#00a884]/25 bg-[#00a884]/10 px-3.5 py-1.5 text-[0.72rem] font-medium text-[#7fe0c0]">
            ✅ {t("pipelineHandled")}
          </div>
        </div>
      </div>
    </div>
  );
}
