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

function WhatsAppWindow({ title, body, severity, handled }: { title: string; body: string; severity: string; handled: string }) {
  return (
    <div className="w-[330px] overflow-hidden rounded-xl bg-[#0b141a] shadow-[0_32px_70px_rgba(25,20,10,0.35)] ring-1 ring-black/20">
      {/* window chrome + WA header */}
      <div className="bg-[#202c33]">
        <div className="flex items-center gap-1.5 px-3.5 pt-3">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 pt-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#0b141a]">
            <LogoMark size={20} />
          </div>
          <div className="flex-1">
            <div className="text-[0.88rem] font-semibold leading-tight text-[#e9edef]">Observer</div>
            <div className="text-[0.7rem] text-[#8696a0]">online</div>
          </div>
          <span className="text-[#8696a0]">⌕</span>
          <span className="text-[#8696a0]">⋮</span>
        </div>
      </div>
      {/* chat */}
      <div className="flex min-h-[300px] flex-col justify-end gap-2 bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:18px_18px] px-4 py-5">
        <div className="max-w-[92%] rounded-lg rounded-tl-none bg-[#202c33] px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
          <div className="mb-1 flex items-start justify-between gap-2">
            <span className="text-[0.82rem] font-bold leading-snug text-[#e9edef]">{title}</span>
            <span className="mt-0.5 shrink-0 rounded bg-[#f0857d]/15 px-1.5 py-px font-mono text-[0.55rem] font-bold text-[#f0857d]">{severity}</span>
          </div>
          <p className="text-[0.74rem] leading-relaxed text-[#aebac1]">{body}</p>
          <div className="mt-1 text-right text-[0.58rem] text-[#667781]">09:24</div>
        </div>
        <div className="ml-auto flex w-fit items-baseline gap-2 rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
          <span className="text-[0.8rem] text-[#e9edef]">1</span>
          <span className="text-[0.56rem] text-[#7fc4ab]">09:25 ✓✓</span>
        </div>
        <div className="self-center rounded-full border border-[#00a884]/25 bg-[#00a884]/10 px-3 py-1 text-[0.66rem] font-medium text-[#7fe0c0]">
          ✅ {handled}
        </div>
      </div>
      {/* input bar */}
      <div className="flex items-center gap-2.5 bg-[#202c33] px-4 py-2.5">
        <span className="text-[#8696a0]">☺</span>
        <div className="flex-1 rounded-lg bg-[#2a3942] px-3 py-1.5 text-[0.72rem] text-[#8696a0]">Mesaj</div>
        <span className="text-[#8696a0]">🎤</span>
      </div>
    </div>
  );
}

function BrowserWindow({ statText, row1, row2, sevHigh, sevMedium }: { statText: string; row1: string; row2: string; sevHigh: string; sevMedium: string }) {
  const tNav = useTranslations("nav");
  const navItems = [tNav("signals"), tNav("sources"), tNav("alerts"), tNav("history")];
  return (
    <div className="absolute left-0 top-0 w-[760px] max-w-none overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_rgba(25,20,10,0.18)] ring-1 ring-black/[0.08]">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-[#e8e3d8] bg-[#f6f3ec] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex items-center gap-1.5 rounded-md bg-white px-3 py-1 ring-1 ring-black/[0.05]">
          <span className="text-[0.6rem] text-[#28c840]">🔒</span>
          <span className="font-mono text-[0.64rem] text-foreground/50">observerai.app/dashboard</span>
        </div>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="w-40 shrink-0 border-r border-[#efebe1] px-4 py-4">
          <div className="mb-5 flex items-center gap-1.5">
            <LogoMark size={17} />
            <span className="text-[0.74rem] font-bold italic">Observer</span>
          </div>
          {navItems.map((label, i) => (
            <div key={label} className={`mb-1 rounded-md px-2.5 py-1.5 text-[0.7rem] font-medium ${i === 0 ? "bg-[#f3efe6] text-foreground" : "text-foreground/45"}`}>
              {label}
            </div>
          ))}
        </div>
        {/* main */}
        <div className="min-h-[300px] flex-1 px-6 py-5">
          <div className="mb-3.5 text-[0.85rem] font-bold">{statText}</div>
          <div className="mb-5 flex h-[72px] max-w-[330px] items-end gap-1.5">
            {[34, 58, 26, 72, 44, 62, 90].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-[3px] ${i === 6 ? "bg-[var(--brand)]" : "bg-[#ece7da]"}`} />
            ))}
          </div>
          <div className="flex max-w-[440px] flex-col gap-2">
            <div className="flex items-center gap-2.5 rounded-lg border border-[#efebe1] px-3.5 py-2.5">
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[0.55rem] font-bold text-amber-600">{sevHigh}</span>
              <span className="truncate text-[0.72rem] text-foreground/75">{row1}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-[#efebe1] px-3.5 py-2.5">
              <span className="rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[0.55rem] font-bold text-sky-600">{sevMedium}</span>
              <span className="truncate text-[0.72rem] text-foreground/75">{row2}</span>
            </div>
          </div>
        </div>
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

      {/* ── Outputs: overlapping app windows, browser bleeds off the right ── */}
      <div className="relative sm:h-[440px]">
        {/* dashboard browser window, behind, cropped at the panel edge */}
        <div className="relative mb-6 h-[300px] overflow-hidden rounded-xl sm:absolute sm:left-[230px] sm:top-0 sm:mb-0 sm:h-auto sm:overflow-visible">
          <BrowserWindow
            statText={t("pipelineDashboardStat")}
            row1={t("feedCard2Title")}
            row2={t("feedCard5Title")}
            sevHigh={t("feedSevHigh")}
            sevMedium={t("feedSevMedium")}
          />
        </div>
        {/* whatsapp window, in front */}
        <div className="relative z-10 mx-auto w-fit sm:mx-0 sm:mt-10">
          <WhatsAppWindow
            title={t("feedCard1Title")}
            body={t("feedCard1Body")}
            severity={t("feedSevCritical")}
            handled={t("pipelineHandled")}
          />
        </div>
      </div>

      {/* captions */}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <p className="max-w-[300px] text-[0.84rem] leading-snug text-muted-foreground">{t("pipelineWhatsappCaption")}</p>
        <p className="max-w-[300px] text-[0.84rem] leading-snug text-muted-foreground sm:text-right">{t("pipelineDashboardCaption")}</p>
      </div>
    </div>
  );
}
