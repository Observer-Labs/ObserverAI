"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";

gsap.registerPlugin(useGSAP, MotionPathPlugin);

/* Connector geometry. The strips share an 800-wide coordinate space with the
   card rows, so path endpoints line up with the card centers below/above. */
const IN_PATHS = [
  "M130,8 C130,64 400,40 400,100",
  "M400,8 C400,44 400,64 400,100",
  "M670,8 C670,64 400,40 400,100",
];
const OUT_WA = "M400,8 C400,66 225,58 225,128";
const OUT_DASH = "M400,8 C400,66 612,58 612,128";

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
        <path id="pout-dash" d={OUT_DASH} stroke="#ddd5c4" strokeWidth="1.5" strokeDasharray="3 5" />
        {[0, 0.75, 1.5].map((delay) => (
          <circle key={`wa-${delay}`} r="4.5" fill="#00a884" data-pulse="pout-wa" data-delay={`${delay}`} opacity="0" />
        ))}
        <circle r="4" fill="#b9b1a0" data-pulse="pout-dash" data-delay="0.4" opacity="0" />
      </svg>
      <div className="flex justify-center py-4 text-[#ddd5c4] sm:hidden">↓</div>

      {/* ── Outputs ── */}
      <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[1.15fr_0.85fr]">
        {/* WhatsApp — the prominent branch */}
        <div className="rounded-3xl bg-[#0b141a] p-6 ring-2 ring-[#00a884]/35">
          <div className="mb-4 flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-[#00a884]" />
            <span className="text-[0.8rem] font-bold text-[#9fd9bf]">WhatsApp</span>
            <span className="ml-auto text-[0.7rem] text-[#8696a0]">09:24</span>
          </div>
          <div className="mb-2 max-w-[92%] rounded-[4px_14px_14px_14px] bg-[#202c33] px-4 py-3">
            <div className="mb-1 flex items-start justify-between gap-3">
              <span className="text-[0.88rem] font-bold leading-snug text-[#e9edef]">{t("feedCard1Title")}</span>
              <span className="shrink-0 rounded-full bg-[#f0857d]/15 px-2 py-0.5 font-mono text-[0.58rem] font-bold text-[#f0857d]">{t("feedSevCritical")}</span>
            </div>
            <p className="text-[0.78rem] leading-relaxed text-[#8696a0]">{t("feedCard1Body")}</p>
          </div>
          <div className="ml-auto w-fit rounded-[14px_4px_14px_14px] bg-[#005c4b] px-3.5 py-1.5">
            <span className="text-[0.82rem] font-semibold text-[#e9edef]">1</span>
            <span className="ml-2 text-[0.62rem] text-[#9fd9bf]">✓✓</span>
          </div>
          <p className="mt-4 text-center text-[0.8rem] text-[#8696a0]">{t("pipelineWhatsappCaption")}</p>
        </div>

        {/* Dashboard — the quieter branch */}
        <div className="rounded-3xl border border-[#ece8df] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#b9b1a0]" />
            <span className="text-[0.8rem] font-bold text-foreground/60">Dashboard</span>
          </div>
          <div className="mb-3 flex h-[72px] items-end gap-1.5">
            {[34, 58, 26, 72, 44, 62, 90].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-t-[4px] ${i === 6 ? "bg-[var(--brand)]" : "bg-[#e9e4d7]"}`}
              />
            ))}
          </div>
          <div className="mb-1 text-[0.85rem] font-bold">{t("pipelineDashboardStat")}</div>
          <p className="text-[0.8rem] leading-snug text-muted-foreground">{t("pipelineDashboardCaption")}</p>
        </div>
      </div>
    </div>
  );
}
