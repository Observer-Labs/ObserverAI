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
const OUT_DASH = "M400,8 C400,66 648,58 648,128";

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

function PhoneMock({ title, body, severity, handled }: { title: string; body: string; severity: string; handled: string }) {
  return (
    <div className="w-[270px] overflow-hidden rounded-[38px] border-[9px] border-[#18181b] bg-[#0b141a] shadow-[0_24px_60px_rgba(30,25,15,0.18)]">
      {/* notch */}
      <div className="relative z-[2] mx-auto -mb-5 h-5 w-[110px] rounded-b-[12px] bg-[#18181b]" />
      {/* WA header */}
      <div className="flex items-center gap-2.5 bg-[#1f2c34] px-3.5 pb-2.5 pt-7">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#202c33]">
          <LogoMark size={18} />
        </div>
        <div className="flex-1">
          <div className="text-[0.8rem] font-semibold text-[#e9edef]">Observer</div>
          <div className="flex items-center gap-1 text-[0.62rem] text-[#9fd9bf]">
            <span className="size-1 rounded-full bg-[#00a884]" /> online
          </div>
        </div>
      </div>
      {/* chat */}
      <div className="flex min-h-[270px] flex-col gap-2 px-3 py-4">
        <div className="max-w-[94%] rounded-[4px_12px_12px_12px] bg-[#202c33] px-3 py-2.5">
          <div className="mb-1 flex items-start justify-between gap-2">
            <span className="text-[0.78rem] font-bold leading-snug text-[#e9edef]">{title}</span>
            <span className="shrink-0 rounded-full bg-[#f0857d]/15 px-1.5 py-0.5 font-mono text-[0.52rem] font-bold text-[#f0857d]">{severity}</span>
          </div>
          <p className="text-[0.7rem] leading-relaxed text-[#8696a0]">{body}</p>
          <div className="mt-1 text-right text-[0.55rem] text-[#667781]">09:24</div>
        </div>
        <div className="ml-auto w-fit rounded-[12px_4px_12px_12px] bg-[#005c4b] px-3 py-1.5">
          <span className="text-[0.76rem] font-semibold text-[#e9edef]">1</span>
          <span className="ml-1.5 text-[0.56rem] text-[#9fd9bf]">✓✓</span>
        </div>
        <div className="max-w-[80%] rounded-[10px] border border-[#00a884]/30 bg-[#00a884]/[0.16] px-2.5 py-1.5">
          <span className="text-[0.66rem] font-semibold text-[#7fe0c0]">✅ {handled}</span>
        </div>
      </div>
    </div>
  );
}

function MacbookMock({ statText, row1, row2, sevHigh, sevMedium }: { statText: string; row1: string; row2: string; sevHigh: string; sevMedium: string }) {
  const tNav = useTranslations("nav");
  const navItems = [tNav("signals"), tNav("sources"), tNav("alerts"), tNav("history")];
  return (
    <div className="absolute left-0 top-0 w-[680px] max-w-none sm:w-[760px]">
      {/* screen */}
      <div className="rounded-t-[14px] border-[10px] border-b-0 border-[#1c1c1e] bg-[#1c1c1e] shadow-[0_24px_60px_rgba(30,25,15,0.18)]">
        <div className="overflow-hidden rounded-t-[5px] bg-white">
          {/* browser chrome */}
          <div className="flex items-center gap-2 border-b border-[#eee9df] bg-[#faf8f3] px-3.5 py-2">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
            <span className="ml-3 rounded-md bg-white px-3 py-0.5 font-mono text-[0.6rem] text-foreground/45">observerai.app/dashboard</span>
          </div>
          <div className="flex">
            {/* sidebar */}
            <div className="w-36 shrink-0 border-r border-[#eee9df] px-3.5 py-4">
              <div className="mb-4 flex items-center gap-1.5">
                <LogoMark size={16} />
                <span className="text-[0.7rem] font-bold italic">Observer</span>
              </div>
              {navItems.map((label, i) => (
                <div key={label} className={`mb-1 rounded-md px-2 py-1.5 text-[0.66rem] font-medium ${i === 0 ? "bg-[#f3efe6] text-foreground" : "text-foreground/45"}`}>
                  {label}
                </div>
              ))}
            </div>
            {/* main */}
            <div className="min-h-[280px] flex-1 px-5 py-4">
              <div className="mb-3 text-[0.78rem] font-bold">{statText}</div>
              <div className="mb-4 flex h-[64px] max-w-[300px] items-end gap-1">
                {[34, 58, 26, 72, 44, 62, 90].map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-[3px] ${i === 6 ? "bg-[var(--brand)]" : "bg-[#ece7da]"}`} />
                ))}
              </div>
              <div className="flex max-w-[420px] flex-col gap-1.5">
                <div className="flex items-center gap-2 rounded-lg border border-[#eee9df] px-3 py-2">
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-mono text-[0.52rem] font-bold text-amber-600">{sevHigh}</span>
                  <span className="truncate text-[0.68rem] text-foreground/75">{row1}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#eee9df] px-3 py-2">
                  <span className="rounded-full bg-sky-50 px-1.5 py-0.5 font-mono text-[0.52rem] font-bold text-sky-600">{sevMedium}</span>
                  <span className="truncate text-[0.68rem] text-foreground/75">{row2}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* base */}
      <div className="relative -mx-[4%] h-3.5 rounded-b-[12px] bg-[#2a2a2e]">
        <div className="absolute left-1/2 top-0 h-1.5 w-[90px] -translate-x-1/2 rounded-b-[8px] bg-[#1c1c1e]" />
      </div>
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

      {/* ── Outputs: phone left, cropped macbook right ── */}
      <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-[0.9fr_1.1fr] sm:gap-6">
        {/* WhatsApp phone — the prominent branch */}
        <div className="flex flex-col items-center">
          <PhoneMock
            title={t("feedCard1Title")}
            body={t("feedCard1Body")}
            severity={t("feedSevCritical")}
            handled={t("pipelineHandled")}
          />
          <p className="mt-5 max-w-[280px] text-center text-[0.84rem] leading-snug text-muted-foreground">{t("pipelineWhatsappCaption")}</p>
        </div>

        {/* Dashboard macbook — bleeds off the right edge */}
        <div className="flex flex-col">
          <div className="relative h-[260px] sm:h-[340px]">
            <MacbookMock
              statText={t("pipelineDashboardStat")}
              row1={t("feedCard2Title")}
              row2={t("feedCard5Title")}
              sevHigh={t("feedSevHigh")}
              sevMedium={t("feedSevMedium")}
            />
          </div>
          <p className="mt-5 max-w-[320px] text-[0.84rem] leading-snug text-muted-foreground">{t("pipelineDashboardCaption")}</p>
        </div>
      </div>
    </div>
  );
}
