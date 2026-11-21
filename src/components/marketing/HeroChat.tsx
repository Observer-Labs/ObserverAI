import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import Bubble, { ChatChip, ReplyKeys, TypingDots } from "@/components/marketing/Bubble";

/**
 * Hero product illustration: the WhatsApp conversation Observer has with the
 * owner. Rendered in its finished state; the story (typing, brief, the owner
 * taps 2, Observer confirms) is pure CSS animation, so it needs no script and
 * simply does not run for reduced-motion visitors.
 */
export default function HeroChat() {
  const t = useTranslations("landing");

  const keys = [
    { key: "1", label: t("replyDetails") },
    { key: "2", label: t("replyDone") },
    { key: "3", label: t("replySkip") },
  ];

  return (
    <figure aria-label={t("demoLabel")} className="mx-auto w-full max-w-[460px] lg:mx-0 lg:ml-auto">
      <div className="mk-wall overflow-hidden rounded-[28px] border border-mk-line shadow-[0_40px_80px_-48px_rgba(15,21,18,0.45)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-mk-line bg-mk-raised px-4 py-3">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-mk-sunken">
            <LogoMark size={20} />
          </span>
          <span className="leading-tight">
            <span className="block text-[0.92rem] font-semibold">Observer</span>
            <span className="block text-[0.72rem] text-mk-muted">{t("waBusinessLabel")}</span>
          </span>
          <span className="ml-auto font-mk-mono text-[0.66rem] text-mk-muted">WhatsApp</span>
        </div>

        {/* Thread */}
        <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-3.5 sm:px-5">
          <ChatChip>{t("chatToday")}</ChatChip>

          <div className="relative">
            <Bubble className="mk-typing-life absolute left-0 top-0 px-4 py-3.5 text-mk-muted">
              <TypingDots />
            </Bubble>
            <Bubble className="mk-pop max-w-[92%] origin-bottom-left" style={{ animationDelay: "1.45s" }}>
              <p className="text-[1.02rem] font-semibold leading-snug tracking-[-0.01em]">{t("feedCard1Title")}</p>
              <p className="mt-1 text-mk-soft">{t("feedCard1Body")}</p>
              <p className="mt-2.5 border-l-2 border-mk-accent pl-2.5">
                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-mk-accent-ink">{t("feedCard3Title")}</span>
                {t("feedCard3Body")}
              </p>
              <p className="mt-2.5 text-[0.8rem] text-mk-muted">{t("demoReplyHint")}</p>
              <p className="mt-0.5 text-right font-mk-mono text-[0.62rem] text-mk-muted">09:24</p>
            </Bubble>
          </div>

          <Bubble tone="owner" className="mk-pop ml-auto flex origin-bottom-right items-end gap-2.5 px-3.5 py-2" style={{ animationDelay: "2.95s" }}>
            <span className="text-[1.05rem] font-semibold leading-none">2</span>
            <span className="flex items-center gap-1 font-mk-mono text-[0.62rem] text-mk-paper/75">
              09:26 <CheckCheck aria-hidden className="size-3.5 text-mk-accent" />
            </span>
          </Bubble>

          <Bubble className="mk-pop w-fit max-w-[92%] origin-bottom-left" style={{ animationDelay: "3.7s" }}>
            {t("demoAck")}
          </Bubble>
        </div>

        {/* Quick replies */}
        <ReplyKeys keys={keys} pressed="2" pressedClassName="mk-key-late" className="justify-between border-t border-mk-line bg-mk-raised px-3.5 py-3 sm:px-5" />
      </div>
      <figcaption className="mt-3 text-right font-mk-mono text-[0.66rem] text-mk-muted">{t("demoCaption")}</figcaption>
    </figure>
  );
}
