import { useTranslations } from "next-intl";
import { ArrowDown, Check, CheckCheck, Star } from "lucide-react";
import type { ReactNode } from "react";
import Bubble, { ReplyKeys } from "@/components/marketing/Bubble";
import { cn } from "@/lib/utils";

function Stars({ count }: { count: number }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3", n <= count ? "fill-mk-ink text-mk-ink" : "fill-mk-line text-mk-line")} />
      ))}
    </span>
  );
}

function Step({ n, title, body, flip, children }: { n: string; title: string; body: string; flip?: boolean; children: ReactNode }) {
  return (
    <li data-step className="grid grid-cols-1 items-center gap-x-10 gap-y-6 md:grid-cols-2">
      <div className={cn(flip && "md:order-2")}>
        <span className="inline-flex h-8 items-center rounded-full bg-mk-ink px-3 font-mk-mono text-[0.76rem] font-medium text-mk-paper">{n}</span>
        <h3 className="mt-4 font-mk-display text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold leading-[1.05] tracking-[-0.025em]">{title}</h3>
        <p className="mt-3 max-w-[40ch] text-[1.02rem] leading-[1.6] text-mk-soft">{body}</p>
      </div>
      <div className={cn("flex justify-start md:justify-center", flip && "md:order-1")}>{children}</div>
    </li>
  );
}

/** Four steps told as one conversation on the chat wallpaper; each step shows the piece of interface it produces. */
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
    { key: "1", label: t("replyDetails") },
    { key: "2", label: t("replyDone") },
    { key: "3", label: t("replySkip") },
  ];

  return (
    <ol className="mk-wall flex flex-col gap-14 rounded-[32px] px-5 py-10 sm:px-10 sm:py-14 md:gap-16 md:px-14 md:py-16">
      <Step n="01" title={t("step1Title")} body={t("step1Body")}>
        <Bubble className="w-full max-w-[430px] text-[0.96rem] p-2">
          <ul className="divide-y divide-mk-line">
            {sources.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 px-2.5 py-2.5">
                <span className="font-medium">{s.name}</span>
                {s.connected ? (
                  <span className="flex items-center gap-1.5 text-[0.8rem] text-mk-soft">
                    <Check aria-hidden className="size-3.5 text-mk-accent-ink" strokeWidth={2.6} />
                    {t("stepConnected")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-[0.8rem] text-mk-muted">
                    <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-mk-accent" />
                    {t("stepConnecting")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Bubble>
      </Step>

      <Step n="02" title={t("step2Title")} body={t("step2Body")} flip>
        <div className="flex w-full max-w-[430px] text-[0.96rem] flex-col gap-2">
          {reviews.map((r, i) => (
            <Bubble key={r.text} tone="customer" className={cn("w-fit max-w-[88%] py-2.5", i === 1 && "ml-8", i === 2 && "ml-3")}>
              <Stars count={r.stars} />
              <p className="mt-1">&ldquo;{r.text}&rdquo;</p>
            </Bubble>
          ))}
          <ArrowDown aria-hidden className="ml-6 mt-1 size-4 text-mk-muted" />
          <p className="flex w-fit items-center gap-2 rounded-full bg-mk-accent px-3.5 py-2 text-[0.86rem] font-semibold text-[#0f1512]">
            <span aria-hidden className="size-2 rounded-full bg-[#0f1512]" />
            {t("pipelineDashboardStat")}
          </p>
        </div>
      </Step>

      <Step n="03" title={t("step3Title")} body={t("step3Body")}>
        <Bubble className="w-full max-w-[430px] text-[0.96rem]">
          <p className="text-[1.02rem] font-semibold leading-snug tracking-[-0.01em]">{t("feedCard2Title")}</p>
          <p className="mt-1 text-mk-soft">{t("feedCard2Body")}</p>
          <p className="mt-2 text-[0.8rem] text-mk-muted">{t("demoReplyHint")}</p>
          <p className="mt-0.5 text-right font-mk-mono text-[0.62rem] text-mk-muted">09:24</p>
        </Bubble>
      </Step>

      <Step n="04" title={t("step4Title")} body={t("step4Body")} flip>
        <div className="flex w-full max-w-[430px] text-[0.96rem] flex-col gap-2.5">
          <ReplyKeys keys={replies} className="flex-wrap" />
          <Bubble tone="owner" className="ml-auto flex items-end gap-2.5 px-3.5 py-2">
            <span className="text-[1.05rem] font-semibold leading-none">2</span>
            <span className="flex items-center gap-1 font-mk-mono text-[0.62rem] text-mk-paper/75">
              09:26 <CheckCheck aria-hidden className="size-3.5 text-mk-accent" />
            </span>
          </Bubble>
          <Bubble className="w-fit max-w-[88%]">{t("demoAck")}</Bubble>
        </div>
      </Step>
    </ol>
  );
}
