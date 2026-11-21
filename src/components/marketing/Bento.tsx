"use client";
// Client component on purpose: this is markup-heavy scenery, and as a server component
// its whole tree would be sent twice (HTML plus the RSC payload), which costs more
// than the small script that renders it. It has no data of its own.
import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Send } from "lucide-react";
import Bubble from "@/components/marketing/Bubble";
import Spotlight from "@/components/marketing/Spotlight";
import { cn } from "@/lib/utils";

function Tile({ title, body, className, wide, children }: { title: string; body: string; className?: string; wide?: boolean; children: ReactNode }) {
  return (
    <li data-tile className={cn("mk-surface mk-tile flex flex-col rounded-[20px]", wide && "lg:flex-row-reverse lg:items-center", className)}>
      <div className={cn("relative flex flex-1 items-center justify-center overflow-hidden px-5 pt-5", wide ? "pb-1 lg:py-6 lg:pl-0 lg:pr-7" : "pb-1")}>{children}</div>
      <div className={cn("px-5 pb-5 pt-4", wide && "lg:w-[34%] lg:shrink-0 lg:py-6 lg:pl-7")}>
        <h3 className="text-[1.12rem] font-semibold tracking-[-0.015em]">{title}</h3>
        <p className={cn("mt-1.5 max-w-[46ch] text-[0.94rem] leading-[1.5] text-mk-muted text-balance", !wide && "lg:min-h-[2.82rem]")}>{body}</p>
      </div>
    </li>
  );
}

const ROW = "mk-row";
const MONO = "mk-mono";

/** Severity as three bars: one hue, three levels. */
function Level({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span aria-hidden className="flex items-end gap-[3px]">
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ height: 4 + i * 3 }} className={cn("w-[3px] rounded-full", i <= n ? "bg-mk-accent" : "bg-mk-faint/60")} />
      ))}
    </span>
  );
}

/**
 * What the product does, as six small live scenes. Everything shown is sample
 * stage data; no figure here is a claim about results.
 */
export default function Bento() {
  const t = useTranslations("landing");
  const days = t("days").split(",");

  const reviews = [
    { source: "Google Reviews", when: t("ago1"), stars: 2, text: t("pipelineReview1") },
    { source: "Google Reviews", when: t("ago2"), stars: 2, text: t("noise5") },
    { source: t("sourcePos"), when: t("ago3"), text: t("noise11") },
  ];
  const sources = ["Google Reviews", "Getir", "Yemeksepeti"];
  const ranked = [
    { title: t("feedCard2Title"), source: "Yemeksepeti", level: 3 as const, label: t("sevCritical") },
    { title: t("sig3Title"), source: t("sourcePos"), level: 2 as const, label: t("sevHigh") },
    { title: t("sig4Title"), source: "Getir", level: 1 as const, label: t("sevMedium") },
  ];
  const keys = [
    { key: "1", label: t("replyDetails") },
    { key: "2", label: t("replyDone") },
    { key: "3", label: t("replySkip") },
  ];
  const trail = [
    { time: "09:24", label: t("statusSent") },
    { time: "09:25", label: `${t("replyDetails")}: 1` },
    { time: "09:26", label: t("statusReplied") },
  ];
  // four sample weeks, one character per day: . nothing, s a signal was sent, r it was resolved
  const weeks = ["..r...r", ".r..s..", "r...r.r", ".r.srr."];

  return (
    <Spotlight>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6 lg:gap-4">
        {/* 1 · clustering */}
        <Tile title={t("tileClusterTitle")} body={t("tileClusterBody")} className="md:col-span-2 lg:col-span-4">
          <div className="grid w-full grid-cols-1 items-center gap-y-3 py-3 sm:grid-cols-[minmax(0,1.1fr)_64px_minmax(0,1fr)] lg:py-5">
            <ul className="flex flex-col gap-2">
              {reviews.map((r) => (
                <li key={r.text} className={cn(ROW, "flex-col items-stretch gap-1")}>
                  <span className={cn(MONO, "flex items-center justify-between gap-2")}>
                    <span>
                      {r.source} · {r.when}
                    </span>
                    {r.stars !== undefined && <span className="mk-stars" style={{ "--n": r.stars } as CSSProperties} />}
                  </span>
                  <span className="text-[0.9rem] leading-snug text-mk-ink">&ldquo;{r.text}&rdquo;</span>
                </li>
              ))}
            </ul>
            <svg aria-hidden viewBox="0 0 64 200" preserveAspectRatio="none" className="hidden h-[200px] w-full sm:block" fill="none">
              {[30, 100, 170].map((y, i) => (
                <g key={y}>
                  <path d={`M0 ${y}C36 ${y} 28 100 64 100`} stroke="rgba(255,244,230,0.2)" strokeWidth="1.5" />
                  <path className="mk-pulse mk-loop" style={{ "--delay": `${-i * 1.5}s` } as CSSProperties} d={`M0 ${y}C36 ${y} 28 100 64 100`} stroke="#ffb38f" strokeWidth="4" strokeLinecap="round" />
                </g>
              ))}
            </svg>
            <div className="rounded-[14px] border border-mk-accent/50 bg-[linear-gradient(160deg,rgba(255,90,31,0.2),rgba(255,90,31,0.04)_62%)] p-4 sm:p-5">
              <p className="flex items-center justify-between gap-2 font-mk-mono text-[0.72rem] uppercase tracking-[0.08em] text-mk-accent-ink">
                {t("signalLabel")} · {t("sevCritical")}
                <Level n={3} />
              </p>
              <p className="mt-2.5 text-[1.12rem] font-semibold leading-snug tracking-[-0.015em]">{t("feedCard1Title")}</p>
              <p className="mt-1.5 text-[0.9rem] leading-snug text-mk-soft">{t("feedCard1Body")}</p>
              <p className={cn(MONO, "mt-3 border-t border-mk-line pt-2.5")}>{t("clusterMeta")}</p>
            </div>
          </div>
        </Tile>

        {/* 2 · connect */}
        <Tile title={t("tileConnectTitle")} body={t("tileConnectBody")} className="lg:col-span-2">
          <ul className="flex w-full flex-col gap-2 py-2">
            {sources.map((s) => (
              <li key={s} className={cn(ROW, "justify-between")}>
                <span className="text-[0.92rem] font-medium">{s}</span>
                <span className="flex items-center gap-1.5 text-[0.8rem] text-mk-soft">
                  <span aria-hidden className="size-3.5 text-mk-accent-ink mk-ico mk-ico-check" />
                  {t("stepConnected")}
                </span>
              </li>
            ))}
            <li className={cn(ROW, "justify-between")}>
              <span className="text-[0.92rem] font-medium">{t("sourcePos")}</span>
              <span className="grid text-[0.8rem]">
                <span className="mk-swap-a mk-loop col-start-1 row-start-1 flex items-center justify-end gap-1.5 text-mk-muted">
                  <LoaderCircle className="mk-spin mk-loop size-3.5" />
                  {t("stepConnecting")}
                </span>
                <span aria-hidden className="mk-swap-b mk-loop col-start-1 row-start-1 flex items-center justify-end gap-1.5 text-mk-soft">
                  <span aria-hidden className="size-3.5 text-mk-accent-ink mk-ico mk-ico-check" />
                  {t("stepConnected")}
                </span>
              </span>
            </li>
          </ul>
        </Tile>

        {/* 3 · priority */}
        <Tile title={t("tilePriorityTitle")} body={t("tilePriorityBody")} className="lg:col-span-2">
          <ol className="flex w-full flex-col gap-2 py-2">
            {ranked.map((r, i) => (
              <li key={r.title} className={ROW} style={i === 0 ? { borderColor: "rgba(255,110,55,0.5)", background: "rgba(255,90,31,0.1)" } : undefined}>
                <span className={MONO}>0{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9rem] font-medium leading-snug">{r.title}</span>
                  <span className={cn(MONO, "mt-0.5 flex flex-wrap items-center gap-x-1.5")}>
                    {r.source} · {r.label}
                    {i === 0 && (
                      <span className="flex items-center gap-1 text-mk-accent-ink">
                        <Send aria-hidden className="size-3" /> {t("toWhatsapp")}
                      </span>
                    )}
                  </span>
                </span>
                <Level n={r.level} />
              </li>
            ))}
          </ol>
        </Tile>

        {/* 4 · reply keys answer a message */}
        <Tile title={t("tileReplyTitle")} body={t("step4Body")} className="lg:col-span-2">
          <div className="flex w-full flex-col gap-4 py-2">
            <Bubble className="max-w-[92%]">
              <span className="font-semibold">{t("feedCard2Title")}</span>
              <span className="mt-0.5 block text-[0.84rem] text-mk-muted">{t("demoReplyHint")}</span>
            </Bubble>
            <ul className="flex justify-center gap-3 pb-2">
              {keys.map((k) => (
                <li key={k.key} className="flex flex-1 flex-col items-center gap-2">
                  <span
                    className={cn(
                      "flex h-[60px] w-full items-center justify-center rounded-[14px] border text-[1.4rem] font-semibold shadow-[0_5px_0_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,244,230,0.12)]",
                      k.key === "2" ? "mk-key-press mk-loop border-mk-accent/60 bg-[linear-gradient(180deg,#ff6a33,#e8490f)] text-[#0c0b0a]" : "border-mk-strong bg-[linear-gradient(180deg,#26231f,#1a1815)] text-mk-ink",
                    )}
                  >
                    {k.key}
                  </span>
                  <span className="text-[0.84rem] text-mk-muted">{k.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        {/* 5 · resolved */}
        <Tile title={t("tileResolvedTitle")} body={t("tileResolvedBody")} className="lg:col-span-2">
          <ol className="relative flex w-full flex-col gap-2 py-2 before:absolute before:bottom-8 before:left-[21px] before:top-8 before:w-px before:bg-mk-strong">
            {trail.map((s) => (
              <li key={s.label} className={cn(ROW, "relative")}>
                <span aria-hidden className="size-[9px] shrink-0 rounded-full border border-mk-muted bg-mk-sunken" />
                <span className="flex-1 text-[0.9rem] text-mk-soft">{s.label}</span>
                <span className={MONO}>{s.time}</span>
              </li>
            ))}
            <li className={cn(ROW, "relative")} style={{ borderColor: "rgba(255,110,55,0.5)", background: "rgba(255,90,31,0.1)" }}>
              <span aria-hidden className="-ml-1 flex size-[17px] shrink-0 items-center justify-center rounded-full bg-mk-accent text-[#0c0b0a]">
                <span aria-hidden className="size-2.5 mk-ico mk-ico-checks" />
              </span>
              <span className="flex-1 text-[0.92rem] font-semibold">{t("statusResolved")}</span>
              <span className={MONO}>09:26</span>
            </li>
          </ol>
        </Tile>

        {/* 6 · history */}
        <Tile wide title={t("tileHistoryTitle")} body={t("tileHistoryBody")} className="md:col-span-2 lg:col-span-6">
          <div className="w-full py-2">
            <div aria-hidden className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((d) => (
                <span key={d} className={cn(MONO, "pb-1 text-center")}>
                  {d}
                </span>
              ))}
              {weeks.flatMap((w, wi) =>
                w.split("").map((c, di) => (
                  <span
                    key={`${wi}-${di}`}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-[8px] border",
                      c === "r" ? "border-mk-accent/50 bg-mk-accent/15 text-mk-accent-ink" : c === "s" ? "border-mk-strong bg-black/25" : "border-mk-line",
                      wi < 3 && "opacity-70",
                    )}
                  >
                    {c === "r" ? <span className="mk-ico mk-ico-check text-[0.8rem]" /> : c === "s" ? <span className="size-2 rounded-full border-2 border-mk-accent" /> : null}
                  </span>
                )),
              )}
            </div>
            <p className={cn(MONO, "mt-3 flex flex-wrap items-center gap-x-5 gap-y-1")}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full border-2 border-mk-accent" /> {t("legendSent")}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="mk-ico mk-ico-check text-[0.8rem] text-mk-accent-ink" /> {t("legendResolved")}
              </span>
            </p>
          </div>
        </Tile>
      </ul>
    </Spotlight>
  );
}
