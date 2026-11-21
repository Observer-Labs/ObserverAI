import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PANEL = "mt-8 rounded-xl border border-mk-line bg-mk-paper";

function Stars({ count }: { count: number }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3", n <= count ? "fill-mk-ink text-mk-ink" : "fill-mk-line text-mk-line")} />
      ))}
    </span>
  );
}

function Step({ n, title, body, children }: { n: string; title: string; body: string; children: ReactNode }) {
  return (
    <li data-step className="flex flex-col bg-mk-raised p-6 sm:p-9">
      <span className="font-mk-mono text-[0.72rem] font-medium text-mk-accent-ink">{n}</span>
      <h3 className="mt-3 font-mk-display text-[1.75rem] leading-[1.1]">{title}</h3>
      <p className="mt-2.5 max-w-[42ch] text-[0.98rem] leading-[1.6] text-mk-muted">{body}</p>
      <div className="mt-auto">{children}</div>
    </li>
  );
}

/** Four steps in one hairline grid; each cell carries a small piece of the real interface. */
export default function HowItWorks() {
  const t = useTranslations("landing");

  const sources = [
    { name: "Google Reviews", connected: true },
    { name: "Getir", connected: true },
    { name: "Yemeksepeti", connected: true },
    { name: t("sourcePos"), connected: false },
  ];
  const reviews = [
    { text: t("pipelineReview1"), stars: 2 },
    { text: t("pipelineReview2"), stars: 1 },
    { text: t("pipelineReview3"), stars: 3 },
  ];
  const replies = [
    { key: "1", label: t("replyDetails"), active: false },
    { key: "2", label: t("replyDone"), active: true },
    { key: "3", label: t("replySkip"), active: false },
  ];

  return (
    <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-mk-line bg-mk-line md:grid-cols-2">
      <Step n="01" title={t("step1Title")} body={t("step1Body")}>
        <ul className={cn(PANEL, "divide-y divide-mk-line")}>
          {sources.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.86rem]">
              <span className="font-medium">{s.name}</span>
              {s.connected ? (
                <span className="flex items-center gap-1.5 text-[0.78rem] text-mk-soft">
                  <Check aria-hidden className="size-3.5 text-mk-accent-ink" strokeWidth={2.4} />
                  {t("stepConnected")}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[0.78rem] text-mk-muted">
                  <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-mk-accent" />
                  {t("stepConnecting")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Step>

      <Step n="02" title={t("step2Title")} body={t("step2Body")}>
        <div className={PANEL}>
          <ul className="divide-y divide-mk-line">
            {reviews.map((r) => (
              <li key={r.text} className="flex items-start gap-3 px-4 py-2.5">
                <span className="pt-1"><Stars count={r.stars} /></span>
                <span className="min-w-0 text-[0.84rem] leading-snug text-mk-soft">&ldquo;{r.text}&rdquo;</span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 border-t border-mk-line bg-mk-raised px-4 py-2.5 text-[0.84rem] font-semibold [border-radius:0_0_11px_11px]">
            <span aria-hidden className="size-2 rounded-full bg-mk-accent" />
            {t("pipelineDashboardStat")}
          </p>
        </div>
      </Step>

      <Step n="03" title={t("step3Title")} body={t("step3Body")}>
        <div className={cn(PANEL, "bg-[#efeae2] p-3.5 text-[#111b21]")}>
          <div className="max-w-[340px] rounded-[4px_14px_14px_14px] bg-white px-3.5 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            <p className="text-[0.86rem] font-semibold leading-snug">{t("feedCard2Title")}</p>
            <p className="mt-1 text-[0.82rem] leading-[1.45] text-[#3b4a54]">{t("feedCard2Body")}</p>
            <p className="mt-0.5 text-right text-[0.62rem] text-[#667781]">09:24</p>
          </div>
        </div>
      </Step>

      <Step n="04" title={t("step4Title")} body={t("step4Body")}>
        <ul className={cn(PANEL, "flex flex-col gap-2 p-3.5 min-[480px]:flex-row min-[480px]:flex-wrap")}>
          {replies.map((r) => (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-3 text-[0.84rem]",
                r.active ? "border-mk-ink bg-mk-ink text-mk-paper" : "border-mk-line bg-mk-raised text-mk-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md font-mk-mono text-[0.74rem] font-medium",
                  r.active ? "bg-mk-accent text-[#17140f]" : "bg-mk-sunken text-mk-ink",
                )}
              >
                {r.key}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
      </Step>
    </ol>
  );
}
