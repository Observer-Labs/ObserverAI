import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, Mic, Paperclip, Phone, Smile, Video } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import Bubble, { TypingDots } from "@/components/marketing/Bubble";
import MotionToggle from "@/components/marketing/MotionToggle";

interface Noise {
  source: string;
  text: string;
  stars?: number;
}

function NoiseCard({ n }: { n: Noise }) {
  return (
    <div className="mk-noise">
      <div>
        {n.source}
        {n.stars !== undefined && <span className="mk-stars" style={{ "--n": n.stars } as CSSProperties} />}
      </div>
      <p>{n.text}</p>
    </div>
  );
}

// The convergence lines: one per lane, from each edge into the phone's side.
const RAILS = [155, 370, 585];
const railL = (y: number) => `M0 ${y}C220 ${y} 270 370 384 370`;
const railR = (y: number) => `M1160 ${y}C940 ${y} 890 370 776 370`;

/**
 * The page's signature moment: scattered reviews, orders and till data drift in
 * from both sides and disappear into one phone, where Observer's single WhatsApp
 * brief plays out. Pure CSS motion; the static state is a finished composition.
 */
export default function HeroStage() {
  const t = useTranslations("landing");

  const left: Noise[] = [
    { source: "Google Reviews", text: t("pipelineReview1"), stars: 2 },
    { source: t("sourcePos"), text: t("noise7") },
    { source: "Yemeksepeti", text: t("pipelineReview2"), stars: 1 },
  ];
  const right: Noise[] = [
    { source: "Getir", text: t("noise8") },
    { source: "Google Reviews", text: t("noise5"), stars: 2 },
    { source: "Trendyol", text: t("noise6"), stars: 2 },
  ];
  const mobile = [left[0], right[0], left[1], right[1]];

  return (
    <figure data-stage aria-label={t("demoLabel")} className="relative mx-auto mt-10 w-full max-w-[1160px] lg:mt-9">
      {/* Light and texture */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-16 -top-24 overflow-hidden [mask-image:radial-gradient(ellipse_62%_58%_at_50%_52%,#000_45%,transparent_100%)]">
        <div className="mk-gridlines absolute inset-0" />
        <div className="mk-glow absolute left-1/2 top-[54%] h-[980px] w-[min(1500px,220vw)] -translate-x-1/2 -translate-y-1/2 opacity-25" />
        <div className="absolute left-1/2 top-[56%] h-[520px] w-[min(430px,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,96,36,0.62)] blur-[80px]" />
        <div className="mk-grain absolute inset-0" />
      </div>

      <div className="relative lg:h-[740px]">
        {/* Desktop: convergence lines with light pulses */}
        <svg aria-hidden viewBox="0 0 1160 740" preserveAspectRatio="none" className="absolute inset-0 hidden size-full [mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent)] lg:block">
          <defs>
            <linearGradient id="mk-line-l" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(255,244,230,0)" />
              <stop offset="0.5" stopColor="rgba(255,244,230,0.14)" />
              <stop offset="1" stopColor="rgba(255,90,31,0.55)" />
            </linearGradient>
            <linearGradient id="mk-line-r" x1="1" x2="0">
              <stop offset="0" stopColor="rgba(255,244,230,0)" />
              <stop offset="0.5" stopColor="rgba(255,244,230,0.14)" />
              <stop offset="1" stopColor="rgba(255,90,31,0.55)" />
            </linearGradient>
          </defs>
          <g className="mk-rails" stroke="url(#mk-line-l)">
            {RAILS.map((y) => (
              <path key={y} d={railL(y)} />
            ))}
          </g>
          <g className="mk-rails" stroke="url(#mk-line-r)">
            {RAILS.map((y) => (
              <path key={y} d={railR(y)} />
            ))}
          </g>
          <g className="mk-pulses">
            {RAILS.map((y) => (
              <path key={`l${y}`} d={railL(y)} />
            ))}
            {RAILS.map((y) => (
              <path key={`r${y}`} d={railR(y)} />
            ))}
          </g>
        </svg>

        {/* Desktop: noise drifting towards the phone (lanes are defined in globals.css) */}
        <div aria-hidden className="absolute inset-0 hidden overflow-hidden lg:block">
          <div className="mk-lanes">
            {left.map((n, i) => (
              <NoiseCard key={i} n={n} />
            ))}
          </div>
          <div className="mk-lanes mk-lanes-r">
            {right.map((n, i) => (
              <NoiseCard key={i} n={n} />
            ))}
          </div>
        </div>

        {/* The phone: a WhatsApp conversation in WhatsApp's own colours */}
        <div className="relative z-10 mx-auto w-full max-w-[372px] lg:absolute lg:left-1/2 lg:top-1/2 lg:w-[372px] lg:-translate-x-1/2 lg:-translate-y-1/2">
          <div className="rounded-[58px] border border-white/20 bg-[linear-gradient(150deg,#55504a,#1d1b18_30%,#0a0908_62%,#3a3632)] p-[10px] shadow-[0_80px_140px_-50px_#000,0_0_110px_-10px_rgba(255,90,31,0.32),inset_0_1.5px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(255,255,255,0.12)]">
            <div className="relative flex min-h-[690px] flex-col overflow-hidden rounded-[48px] lg:h-[690px] bg-[#0b141a] text-[#e9edef] ring-1 ring-black">
              {/* Status bar */}
              <div className="relative flex h-12 shrink-0 items-center justify-between bg-[#1f2c34] px-8 pt-2 text-[0.8rem] font-semibold">
                <span>09:26</span>
                <span aria-hidden className="absolute left-1/2 top-3 h-[28px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
                <span aria-hidden className="flex items-center gap-1.5">
                  <span className="flex items-end gap-[2px]">
                    {[4, 6, 8, 10].map((h) => (
                      <span key={h} style={{ height: h }} className="w-[3px] rounded-[1px] bg-[#e9edef]" />
                    ))}
                  </span>
                  <span className="relative h-[11px] w-[22px] rounded-[3.5px] border border-[#e9edef]/50 p-px">
                    <span className="block h-full w-[78%] rounded-[2px] bg-[#e9edef]" />
                  </span>
                </span>
              </div>

              {/* Chat header */}
              <div className="flex shrink-0 items-center gap-2.5 bg-[#1f2c34] px-3 pb-2.5 pt-1.5">
                <ChevronLeft aria-hidden className="size-6 text-[#e9edef]" strokeWidth={1.8} />
                <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-[#0b141a]">
                  <LogoMark size={21} />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[0.96rem] font-semibold">Observer</span>
                  <span className="block text-[0.72rem] text-[#9aa8b1]">{t("waBusinessLabel")}</span>
                </span>
                <span aria-hidden className="ml-auto flex items-center gap-5 pr-1.5 text-[#e9edef]">
                  <Video className="hidden size-5 min-[360px]:block" strokeWidth={1.7} />
                  <Phone className="size-[18px]" strokeWidth={1.7} />
                </span>
              </div>

              {/* Thread */}
              <div className="relative flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5 pb-3 pt-2.5">
                <p className="mx-auto rounded-lg bg-[#182229] px-2.5 py-1 text-[0.7rem] text-[#9aa8b1]">{t("chatToday")}</p>

                <div className="relative">
                  <Bubble wa className="mk-typing-life absolute left-0 top-0 px-4 py-3.5 text-[#9aa8b1]">
                    <TypingDots />
                  </Bubble>
                  <Bubble wa className="mk-pop max-w-[90%] origin-top-left" style={{ animationDelay: "1.7s" }}>
                    <p className="font-semibold">{t("feedCard1Title")}</p>
                    <p className="mt-1">{t("feedCard1Body")}</p>
                    <p className="mt-2">
                      <span className="font-semibold">{t("feedCard3Title")}:</span> {t("feedCard3Body")}
                    </p>
                    <p className="mt-2 text-[0.8rem] text-[#9aa8b1]">{t("demoReplyHint")}</p>
                    <p className="-mb-0.5 text-right text-[0.66rem] text-[#9aa8b1]">09:24</p>
                  </Bubble>
                </div>

                <Bubble wa tone="owner" className="mk-pop ml-auto flex origin-top-right items-end gap-3 py-1.5" style={{ animationDelay: "3.3s" }}>
                  1
                  <span className="flex items-center gap-1 text-[0.66rem] text-[#b6d5cd]">
                    09:25 <span aria-hidden className="size-4 text-[#53bdeb] mk-ico mk-ico-checks" />
                  </span>
                </Bubble>

                <Bubble wa className="mk-pop max-w-[90%] origin-top-left" style={{ animationDelay: "4.2s" }}>
                  {t("demoDetails")}
                  <span className="-mb-0.5 block text-right text-[0.66rem] text-[#9aa8b1]">09:25</span>
                </Bubble>

                <Bubble wa tone="owner" className="mk-pop ml-auto flex origin-top-right items-end gap-3 py-1.5" style={{ animationDelay: "5.8s" }}>
                  2
                  <span className="flex items-center gap-1 text-[0.66rem] text-[#b6d5cd]">
                    09:26 <span aria-hidden className="size-4 text-[#53bdeb] mk-ico mk-ico-checks" />
                  </span>
                </Bubble>

                <Bubble wa className="mk-pop w-fit max-w-[90%] origin-top-left" style={{ animationDelay: "6.6s" }}>
                  {t("demoAck")}
                  <span className="ml-2.5 text-[0.66rem] text-[#9aa8b1]">09:26</span>
                </Bubble>
              </div>

              {/* Composer */}
              <div aria-hidden className="flex shrink-0 items-center gap-2 px-2 pb-7 pt-1.5">
                <span className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-[#1f2c34] px-3 text-[0.9rem] text-[#9aa8b1]">
                  <Smile className="size-5" strokeWidth={1.7} />
                  {t("phoneInput")}
                  <Paperclip className="ml-auto size-[18px]" strokeWidth={1.7} />
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a]">
                  <Mic className="size-[18px]" strokeWidth={2} />
                </span>
                <span className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-[#e9edef]/45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: one thin stream of noise below the phone */}
      <div aria-hidden className="relative mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)] lg:hidden">
        <div className="mk-marquee flex w-max gap-3">
          {[...mobile, ...mobile].map((n, i) => (
            <NoiseCard key={i} n={n} />
          ))}
        </div>
      </div>

      <figcaption className="relative mt-5 flex items-center justify-center gap-3 font-mk-mono text-[0.66rem] text-mk-muted lg:mt-0 lg:justify-end lg:pr-2">
        {t("demoCaption")}
        <MotionToggle label={t("stagePause")} />
      </figcaption>
    </figure>
  );
}
