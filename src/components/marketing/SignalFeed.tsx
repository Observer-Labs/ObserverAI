"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

interface FeedCard {
  icon: string;
  source: string;
  time: string;
  title: string;
  body: string;
  severity?: { label: string; className: string };
  variant?: "default" | "whatsapp" | "insight";
}

const SEV = {
  critical: "bg-red-50 text-red-600 border-red-200",
  high: "bg-amber-50 text-amber-600 border-amber-200",
  medium: "bg-sky-50 text-sky-600 border-sky-200",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

function useFeedCards(): FeedCard[] {
  const t = useTranslations("landing");
  return [
    {
      icon: "⭐", source: "Google Reviews",
      time: t("feedTime1"), title: t("feedCard1Title"), body: t("feedCard1Body"),
      severity: { label: t("feedSevCritical"), className: SEV.critical },
    },
    {
      icon: "🛵", source: "Yemeksepeti",
      time: t("feedTime2"), title: t("feedCard2Title"), body: t("feedCard2Body"),
      severity: { label: t("feedSevHigh"), className: SEV.high },
    },
    {
      icon: "🧠", source: "Observer AI",
      time: t("feedTime3"), title: t("feedCard3Title"), body: t("feedCard3Body"),
      variant: "insight",
    },
    {
      icon: "✓✓", source: "WhatsApp",
      time: t("feedTime4"), title: t("feedCard4Title"), body: t("feedCard4Body"),
      variant: "whatsapp",
    },
    {
      icon: "💳", source: "POS / Payments",
      time: t("feedTime5"), title: t("feedCard5Title"), body: t("feedCard5Body"),
      severity: { label: t("feedSevMedium"), className: SEV.medium },
    },
    {
      icon: "✅", source: "Observer",
      time: t("feedTime6"), title: t("feedCard6Title"), body: t("feedCard6Body"),
      severity: { label: t("feedSevResolved"), className: SEV.resolved },
    },
  ];
}

function Card({ card }: { card: FeedCard }) {
  const isWa = card.variant === "whatsapp";
  const isInsight = card.variant === "insight";
  return (
    <div
      data-card
      className={cn(
        "rounded-2xl border p-5 shadow-[0_2px_16px_rgba(16,24,40,0.06)]",
        isWa ? "border-[#005c4b] bg-[#0b141a] text-[#e9edef]" : "border-border bg-card",
        isInsight && "border-primary/20 bg-gradient-to-br from-card to-[#fff7f0]",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-[0.95rem]",
            isWa ? "bg-[#005c4b] text-[#9fd9bf]" : "bg-muted",
          )}
        >
          {card.icon}
        </span>
        <span className={cn("text-[0.75rem] font-semibold", isWa ? "text-[#9fd9bf]" : "text-muted-foreground")}>
          {card.source}
        </span>
        <span className={cn("ml-auto text-[0.7rem]", isWa ? "text-[#8696a0]" : "text-muted-foreground/70")}>
          {card.time}
        </span>
      </div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <span className="text-[0.92rem] font-bold leading-snug tracking-[-0.01em]">{card.title}</span>
        {card.severity && (
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.6rem] font-bold", card.severity.className)}>
            {card.severity.label}
          </span>
        )}
      </div>
      <p className={cn("text-[0.82rem] leading-relaxed", isWa ? "text-[#8696a0]" : "text-muted-foreground")}>
        {card.body}
      </p>
    </div>
  );
}

/**
 * Beside-style hero feed: signal cards scroll upward in an endless loop,
 * faded at both ends. Static stack when the user prefers reduced motion.
 */
export default function SignalFeed() {
  const wrap = useRef<HTMLDivElement>(null);
  const cards = useFeedCards();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-card]", { y: 36, opacity: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" });
      gsap.to("[data-track]", { yPercent: -50, duration: 32, ease: "none", repeat: -1, delay: 0.9 });
    },
    { scope: wrap },
  );

  return (
    <div
      ref={wrap}
      aria-hidden
      className="relative h-[540px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] md:h-[600px]"
    >
      <div data-track className="flex flex-col pr-1">
        {[0, 1].map((set) => (
          <div key={set} className="flex flex-col gap-4 pb-4" aria-hidden={set === 1}>
            {cards.map((card) => (
              <Card key={`${set}-${card.title}`} card={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
