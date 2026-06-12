"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";
import PhoneMockup from "@/components/marketing/PhoneMockup";

gsap.registerPlugin(useGSAP, MotionPathPlugin);

/* Connector geometry. The strips share an 800-wide coordinate space with the
   card rows, so path endpoints line up with the card centers below/above. */
const IN_PATHS = [
  "M130,8 C130,64 400,40 400,100",
  "M400,8 C400,44 400,64 400,100",
  "M670,8 C670,64 400,40 400,100",
];
const OUT_WA = "M400,8 C400,48 400,76 400,124";
const OUT_DASH_L = "M400,8 C400,62 145,56 145,124";
const OUT_DASH_R = "M400,8 C400,62 655,56 655,124";

function ReviewCard({ text, stars }: { text: string; stars: number }) {
  return (
    <div className="rounded-2xl border border-[#ece8df] bg-white px-5 py-4">
      <div className="mb-1.5 text-[0.78rem] tracking-[0.1em] text-[#f5a623]" aria-label={`${stars}/5`}>
        {"★".repeat(stars)}
        <span className="text-[#e4ddcf]">{"★".repeat(5 - stars)}</span>
      </div>
      <p className="text-[0.85rem] leading-snug text-foreground/75">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

export default function PipelineSection() {
  const t = useTranslations("landing");
  const tNavLabel = useTranslations("nav");
  const wrap = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // pulses traveling along the connectors
      gsap.utils.toArray<SVGCircleElement>("[data-pulse]").forEach((dot) => {
        const path = `#${dot.dataset.pulse}`;
        const delay = parseFloat(dot.dataset.delay ?? "0");
        gsap.set(dot, { opacity: 0 });
        gsap.to(dot, {
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
          duration: 2.2,
          delay,
          repeat: -1,
          repeatDelay: 0.6,
          ease: "none",
          onRepeat() { gsap.set(dot, { opacity: 1 }); },
          onStart() { gsap.set(dot, { opacity: 1 }); },
        });
      });
      // soft breathing ring on the core node
      gsap.to("[data-core-ring]", { scale: 1.18, opacity: 0, duration: 1.8, repeat: -1, ease: "power1.out" });
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className="mx-auto max-w-[860px]">
      {/* ── Reviews in ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
        <ReviewCard text={t("pipelineReview1")} stars={2} />
        <ReviewCard text={t("pipelineReview2")} stars={1} />
        <ReviewCard text={t("pipelineReview3")} stars={3} />
      </div>

      {/* converge connectors */}
      <svg viewBox="0 0 800 104" className="hidden h-[104px] w-full sm:block" fill="none" aria-hidden>
        {IN_PATHS.map((d, i) => (
          <path key={i} id={`pin-${i}`} d={d} stroke="#ddd5c4" strokeWidth="1.5" strokeDasharray="3 5" />
        ))}
        {IN_PATHS.map((_, i) => (
          <circle key={i} r="4" fill="var(--brand)" data-pulse={`pin-${i}`} data-delay={`${i * 0.7}`} opacity="0" />
        ))}
      </svg>
      <div className="flex justify-center py-4 text-[#ddd5c4] sm:hidden">↓</div>

      {/* ── Core node ── */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <span data-core-ring className="absolute inset-0 rounded-full border-2 border-[var(--brand)]" />
          <div className="relative flex size-20 items-center justify-center rounded-full border border-[#ece8df] bg-white">
            <LogoMark size={38} />
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="font-display text-[1.05rem] font-bold">{t("step2Title")}</div>
          <div className="mx-auto mt-1 max-w-[320px] text-[0.84rem] leading-snug text-muted-foreground">{t("pipelineCoreCaption")}</div>
        </div>
      </div>

      {/* diverge connectors */}
      <svg viewBox="0 0 800 132" className="hidden h-[132px] w-full sm:block" fill="none" aria-hidden>
        <path id="pout-wa" d={OUT_WA} stroke="#00a884" strokeWidth="2" strokeDasharray="3 5" opacity="0.55" />
        <path id="pout-dash-l" d={OUT_DASH_L} stroke="#ddd5c4" strokeWidth="1.5" strokeDasharray="3 5" />
        <path id="pout-dash-r" d={OUT_DASH_R} stroke="#ddd5c4" strokeWidth="1.5" strokeDasharray="3 5" />
        {[0, 0.75, 1.5].map((delay) => (
          <circle key={`wa-${delay}`} r="4.5" fill="#00a884" data-pulse="pout-wa" data-delay={`${delay}`} opacity="0" />
        ))}
        <circle r="4" fill="#b9b1a0" data-pulse="pout-dash-l" data-delay="0.4" opacity="0" />
        <circle r="4" fill="#b9b1a0" data-pulse="pout-dash-r" data-delay="1.1" opacity="0" />
      </svg>
      <div className="flex justify-center py-4 text-[#ddd5c4] sm:hidden">↓</div>

      {/* ── Outputs: whatsapp phone center, dashboard screens at the sides ── */}
      <div className="relative">
        {/* organic brand ribbon flowing behind the devices */}
        <svg viewBox="0 0 1000 480" className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[140%] -translate-x-1/2 -translate-y-1/2" fill="none" aria-hidden preserveAspectRatio="xMidYMid slice">
          <path d="M-60,360 C180,420 280,90 520,150 C740,205 760,420 1060,300" stroke="var(--brand)" strokeWidth="74" strokeLinecap="round" opacity="0.9" />
        </svg>

        <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-end sm:justify-center sm:gap-0">
          {/* left dashboard screen — signal list */}
          <div className="z-[1] w-[250px] overflow-hidden rounded-2xl border border-[#ece8df] bg-white sm:-mr-9 sm:mb-12">
            <div className="border-b border-[#f3efe6] px-4 py-2.5 text-[0.7rem] font-bold text-foreground/60">{tNavLabel("signals")}</div>
            <div className="flex flex-col gap-1.5 p-3">
              {[
                { sev: t("feedSevCritical"), cls: "bg-red-50 text-red-600", txt: t("feedCard1Title") },
                { sev: t("feedSevHigh"), cls: "bg-amber-50 text-amber-600", txt: t("feedCard2Title") },
                { sev: t("feedSevMedium"), cls: "bg-sky-50 text-sky-600", txt: t("feedCard5Title") },
              ].map((r) => (
                <div key={r.txt} className="flex items-center gap-2 rounded-lg border border-[#f3efe6] px-2.5 py-2">
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[0.5rem] font-bold ${r.cls}`}>{r.sev}</span>
                  <span className="truncate text-[0.66rem] text-foreground/70">{r.txt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* whatsapp phone — center, prominent */}
          <div className="z-10">
            <PhoneMockup />
          </div>

          {/* right dashboard screen — trend chart */}
          <div className="z-[1] w-[250px] overflow-hidden rounded-2xl border border-[#ece8df] bg-white sm:-ml-9 sm:mb-12">
            <div className="border-b border-[#f3efe6] px-4 py-2.5 text-[0.7rem] font-bold text-foreground/60">Dashboard</div>
            <div className="p-4">
              <div className="mb-2 text-[0.72rem] font-bold">{t("pipelineDashboardStat")}</div>
              <div className="mb-3 flex h-[58px] items-end gap-1">
                {[34, 58, 26, 72, 44, 62, 90].map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-[3px] ${i === 6 ? "bg-[var(--brand)]" : "bg-[#efeadd]"}`} />
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#f3efe6] px-2.5 py-2">
                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold text-emerald-600">{t("feedSevResolved")}</span>
                <span className="truncate text-[0.66rem] text-foreground/70">{t("feedCard6Title")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* captions */}
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <p className="max-w-[420px] text-[0.86rem] leading-snug text-muted-foreground">{t("pipelineWhatsappCaption")} · {t("pipelineDashboardCaption")}</p>
      </div>
    </div>
  );
}
