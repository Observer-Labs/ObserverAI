import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Camera, ChevronLeft, CircleCheck, Mic, Paperclip, Phone, Smile, Video, Wifi } from "lucide-react";
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

// Inside the phone the type is the platform's own, as WhatsApp renders it.
const PHONE_FONT = "[font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',Roboto,'Helvetica_Neue',sans-serif]";

/** Message time, tucked into the bubble's bottom-right corner the way WhatsApp sets it. */
function WaTime({ children, read }: { children: string; read?: boolean }) {
  return (
    <span className={`float-right -mb-[3px] ml-3 mt-[6px] flex items-center gap-[3px] text-[0.69rem] leading-[15px] ${read ? "text-[#a5c9c0]" : "text-[#8696a0]"}`}>
      {children}
      {read && <span aria-hidden className="mk-ico mk-ico-checks size-[15px] text-[#53bdeb]" />}
    </span>
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
  const replies = [t("replyDetails"), t("replyDone"), t("replySkip")];

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

        {/* The phone: a WhatsApp conversation in WhatsApp's own colours and type */}
        <div className="relative z-10 mx-auto w-full max-w-[376px] lg:absolute lg:left-1/2 lg:top-1/2 lg:w-[376px] lg:-translate-x-1/2 lg:-translate-y-1/2">
          {/* Side buttons */}
          <span aria-hidden className="absolute -left-[2px] top-[118px] h-7 w-[3px] rounded-l-[2px] bg-[#4a453f]" />
          <span aria-hidden className="absolute -left-[2px] top-[172px] h-[52px] w-[3px] rounded-l-[2px] bg-[#4a453f]" />
          <span aria-hidden className="absolute -left-[2px] top-[236px] h-[52px] w-[3px] rounded-l-[2px] bg-[#4a453f]" />
          <span aria-hidden className="absolute -right-[2px] top-[196px] h-[84px] w-[3px] rounded-r-[2px] bg-[#4a453f]" />

          {/* Titanium band, then the black bezel, then the screen */}
          <div className="relative rounded-[60px] bg-[linear-gradient(145deg,#9a9187,#3a3632_18%,#151412_46%,#2b2825_72%,#8a8279)] p-[3px] shadow-[0_80px_140px_-50px_#000,0_0_110px_-10px_rgba(255,90,31,0.32)]">
            <div className="rounded-[57px] bg-black p-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <div className={`relative flex min-h-[640px] flex-col overflow-hidden rounded-[48px] bg-[#0b141a] text-[#e9edef] lg:h-[664px] ${PHONE_FONT}`}>
                {/* Status bar */}
                <div className="relative flex h-[50px] shrink-0 items-center justify-between bg-[#1f2c34] pl-9 pr-8 pt-2.5 text-[0.94rem] font-semibold tracking-[-0.01em]">
                  <span>09:26</span>
                  <span aria-hidden className="absolute left-1/2 top-[11px] h-[30px] w-[102px] -translate-x-1/2 rounded-full bg-black" />
                  <span aria-hidden className="flex items-center gap-[5px]">
                    <span className="flex items-end gap-[2px]">
                      {[4, 6, 8, 10].map((h) => (
                        <span key={h} style={{ height: h }} className="w-[3px] rounded-[1px] bg-[#e9edef]" />
                      ))}
                    </span>
                    <Wifi className="size-[15px]" strokeWidth={2.6} />
                    <span className="relative h-[12px] w-[24px] rounded-[4px] border border-[#e9edef]/45 p-px">
                      <span className="block h-full w-[78%] rounded-[2.5px] bg-[#e9edef]" />
                    </span>
                  </span>
                </div>

                {/* Chat header */}
                <div className="flex shrink-0 items-center gap-2 bg-[#1f2c34] px-2.5 pb-2.5 pt-1.5 shadow-[0_1px_0_rgba(0,0,0,0.35)]">
                  <ChevronLeft aria-hidden className="size-[26px] text-[#e9edef]" strokeWidth={1.8} />
                  <span aria-hidden className="flex size-[38px] items-center justify-center rounded-full bg-[#0b141a] ring-1 ring-white/10">
                    <LogoMark size={22} />
                  </span>
                  <span className="ml-0.5 min-w-0 leading-tight">
                    <span className="block text-[1rem] font-semibold tracking-[-0.01em]">Observer</span>
                    <span className="block text-[0.75rem] text-[#8696a0]">{t("waBusinessLabel")}</span>
                  </span>
                  <span aria-hidden className="ml-auto flex items-center gap-5 pr-2 text-[#e9edef]">
                    <Video className="hidden size-[22px] min-[360px]:block" strokeWidth={1.6} />
                    <Phone className="size-[19px]" strokeWidth={1.6} />
                  </span>
                </div>

                {/* Thread: anchored to the bottom, like a real conversation */}
                <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(rgba(233,237,239,0.04)_1px,transparent_1.2px)] px-[14px] pb-2 pt-2.5 [background-size:17px_17px]">
                  <p className="mx-auto mb-auto rounded-[8px] bg-[#182229] px-3 py-[5px] text-[0.75rem] text-[#8696a0] shadow-[0_1px_0.5px_rgba(0,0,0,0.4)]">{t("chatToday")}</p>

                  <div className="relative mt-3">
                    <Bubble wa className="mk-typing-life absolute left-0 top-0 px-4 py-3.5 text-[#8696a0]">
                      <TypingDots />
                    </Bubble>
                    <Bubble wa className="mk-pop max-w-[88%] origin-top-left" style={{ animationDelay: "1.7s" }}>
                      <p className="font-semibold">{t("feedCard1Title")}</p>
                      <p className="text-[#d1d7db]">{t("feedCard1Body")}</p>
                      <div className="mt-2 rounded-[6px] border-l-[3px] border-[#ff7a45] bg-black/25 px-2.5 py-1.5">
                        <p className="text-[0.78rem] font-semibold text-[#ff9466]">{t("feedCard3Title")}</p>
                        <p>{t("feedCard3Body")}</p>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {replies.map((label, i) => (
                          <li key={label} className="flex items-center gap-1.5 rounded-[6px] bg-white/[0.07] py-[3px] pl-[3px] pr-2 text-[0.8rem] text-[#d1d7db]">
                            <span className="flex size-[18px] items-center justify-center rounded-[4px] bg-white/[0.14] text-[0.72rem] font-semibold text-[#e9edef]">{i + 1}</span>
                            {label}
                          </li>
                        ))}
                      </ul>
                      <WaTime>09:24</WaTime>
                    </Bubble>
                  </div>

                  <Bubble wa tone="owner" className="mk-pop ml-auto mt-2 min-w-[78px] origin-top-right" style={{ animationDelay: "3.3s" }}>
                    <span className="font-medium">1</span>
                    <WaTime read>09:25</WaTime>
                  </Bubble>

                  <Bubble wa className="mk-pop mt-2 max-w-[88%] origin-top-left" style={{ animationDelay: "4.2s" }}>
                    {t("demoDetails")}
                    <WaTime>09:25</WaTime>
                  </Bubble>

                  <Bubble wa tone="owner" className="mk-pop ml-auto mt-2 min-w-[78px] origin-top-right" style={{ animationDelay: "5.8s" }}>
                    <span className="font-medium">2</span>
                    <WaTime read>09:26</WaTime>
                  </Bubble>

                  <Bubble wa className="mk-pop mt-2 w-fit max-w-[88%] origin-top-left" style={{ animationDelay: "6.6s" }}>
                    <CircleCheck aria-hidden className="-mt-0.5 mr-1.5 inline size-[15px] text-[#ff9466]" strokeWidth={2.2} />
                    {t("demoAck")}
                    <WaTime>09:26</WaTime>
                  </Bubble>
                </div>

                {/* Composer */}
                <div aria-hidden className="flex shrink-0 items-center gap-1.5 px-2 pb-[26px] pt-1.5">
                  <span className="flex h-[42px] flex-1 items-center gap-2.5 rounded-full bg-[#1f2c34] pl-3 pr-3.5 text-[0.98rem] text-[#8696a0]">
                    <Smile className="size-[22px]" strokeWidth={1.6} />
                    {t("phoneInput")}
                    <Paperclip className="ml-auto size-[19px]" strokeWidth={1.6} />
                    <Camera className="size-[20px]" strokeWidth={1.6} />
                  </span>
                  <span className="flex size-[42px] items-center justify-center rounded-full bg-[#00a884] text-[#0b141a]">
                    <Mic className="size-[20px]" strokeWidth={2} />
                  </span>
                  <span className="absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-[#e9edef]/50" />
                </div>
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
