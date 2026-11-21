"use client";
// Client component on purpose: this is markup-heavy scenery, and as a server component
// its whole tree would be sent twice (HTML plus the RSC payload), which costs more
// than the small script that renders it. It has no data of its own.
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import Bubble from "@/components/marketing/Bubble";

function Step({ n, title, body, last, children }: { n: string; title: string; body: string; last?: boolean; children: ReactNode }) {
  return (
    <li data-step className="relative flex flex-col">
      <div className="mk-surface relative flex h-[168px] items-center justify-center overflow-hidden rounded-[20px] px-5">{children}</div>
      {/* connector to the next step: a chevron on desktop, a short line on phones */}
      {!last && (
        <>
          <ChevronRight aria-hidden className="absolute -right-[21px] top-[74px] hidden size-[18px] text-mk-muted lg:block" strokeWidth={1.8} />
          <span aria-hidden className="absolute -bottom-7 left-5 h-5 w-px bg-mk-strong sm:hidden" />
        </>
      )}
      <p className="mt-5 font-mk-mono text-[0.75rem] text-mk-accent-ink">{n}</p>
      <h3 className="mt-1.5 text-[1.25rem] font-semibold leading-tight tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 text-[0.96rem] leading-[1.55] text-mk-muted text-pretty">{body}</p>
    </li>
  );
}

/** The sequence, left to right: connect, Observer reads, a message arrives, you decide. Each step shows what it looks like. */
export default function HowItWorks() {
  const t = useTranslations("landing");
  const sources = ["Google Reviews", "Getir", t("sourcePos")];
  const reading = [t("pipelineReview2"), t("noise6"), t("noise8"), t("noise7")];

  return (
    <ol className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
      <Step n="01" title={t("step1Title")} body={t("step1Body")}>
        <div className="flex w-full items-center gap-2">
          <ul className="flex flex-1 flex-col gap-1.5">
            {sources.map((s) => (
              <li key={s} className="mk-row justify-center whitespace-nowrap px-1.5 py-1.5 text-[0.78rem] font-medium text-mk-soft lg:text-[0.7rem] xl:text-[0.78rem]">
                {s}
              </li>
            ))}
          </ul>
          <span aria-hidden className="h-px w-5 shrink-0 bg-[linear-gradient(90deg,rgba(255,244,230,0.2),var(--mk-accent))]" />
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-mk-accent/50 bg-mk-accent/10 shadow-[0_0_30px_-4px_rgba(255,90,31,0.6)]">
            <LogoMark size={24} />
          </span>
        </div>
      </Step>

      <Step n="02" title={t("step2Title")} body={t("step2Body")}>
        <div className="relative w-full">
          <p className="mk-mono mb-2.5 flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-mk-accent" />
            {t("scanLabel")}
          </p>
          <ul className="relative flex flex-col gap-1.5 text-[0.8rem] leading-snug">
            {reading.map((line, i) => (
              <li key={line} className={i === 0 ? "truncate border-l-2 border-mk-accent pl-2 text-mk-ink" : "truncate border-l-2 border-transparent pl-2 text-mk-muted"}>
                &ldquo;{line}&rdquo;
              </li>
            ))}
            <li aria-hidden className="mk-scan mk-loop absolute inset-x-0 -top-2 h-5 rounded-full bg-[linear-gradient(180deg,rgba(255,90,31,0),rgba(255,90,31,0.28))]" />
          </ul>
        </div>
      </Step>

      <Step n="03" title={t("step3Title")} body={t("step3Body")}>
        <div className="w-full rounded-[14px] border border-white/10 bg-white/[0.07] p-3 shadow-[0_18px_40px_-20px_#000]">
          <p className="flex items-center gap-2 text-[0.75rem] text-mk-soft">
            <span aria-hidden className="flex size-5 items-center justify-center rounded-md bg-[#0b141a]">
              <LogoMark size={13} />
            </span>
            <span className="font-semibold text-mk-ink">Observer</span>
            <span className="ml-auto">{t("lockNow")}</span>
          </p>
          <p className="mt-2 text-[0.9rem] font-semibold leading-snug text-balance">{t("sig3Title")}</p>
          <p className="mt-0.5 text-[0.82rem] leading-snug text-mk-soft">{t("demoReplyHint")}</p>
        </div>
      </Step>

      <Step n="04" title={t("step4Title")} body={t("step4Body")} last>
        <div className="flex w-full flex-col items-center gap-3">
          <ul aria-hidden className="flex gap-2">
            {["1", "2", "3"].map((k) => (
              <li
                key={k}
                className={
                  k === "1"
                    ? "flex size-11 items-center justify-center rounded-[10px] border border-mk-accent/60 bg-[linear-gradient(180deg,#ff6a33,#e8490f)] text-[1.05rem] font-semibold text-[#0c0b0a] shadow-[0_3px_0_rgba(0,0,0,0.55)]"
                    : "flex size-11 items-center justify-center rounded-[10px] border border-mk-strong bg-[linear-gradient(180deg,#26231f,#1a1815)] text-[1.05rem] font-semibold shadow-[0_3px_0_rgba(0,0,0,0.55)]"
                }
              >
                {k}
              </li>
            ))}
          </ul>
          <Bubble tone="owner" className="flex items-end gap-3 py-1.5">
            1
            <span className="flex items-center gap-1 text-[0.7rem] text-mk-soft">
              09:25 <span aria-hidden className="mk-ico mk-ico-checks size-4 text-mk-accent-ink" />
            </span>
          </Bubble>
        </div>
      </Step>
    </ol>
  );
}
