"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

type Level = "critical" | "high" | "medium";

/** Severity marker: one accent hue, three weights. No traffic-light colours. */
function LevelDot({ level }: { level: Level }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        level === "critical" && "bg-mk-accent",
        level === "high" && "border-[1.5px] border-mk-accent",
        level === "medium" && "bg-mk-line",
      )}
    />
  );
}

const TAG = "inline-flex items-center gap-1.5 whitespace-nowrap font-mk-mono text-[0.62rem] font-medium tracking-[0.06em]";

/**
 * Hero product illustration: the weekly signal list and the WhatsApp brief it
 * produces. Server-rendered in its final state; when motion is allowed, the
 * `mk-pre` parts start hidden (CSS) and a single GSAP timeline (loaded lazily) plays the story
 * once: signals arrive, the brief is sent, the owner replies, the signal closes.
 */
export default function HeroDemo() {
  const t = useTranslations("landing");
  const root = useRef<HTMLElement>(null);

  const rows: { source: string; time: string; title: string; body: string; level: Level; label: string }[] = [
    { source: "Google Reviews", time: t("feedTime1"), title: t("feedCard1Title"), body: t("feedCard1Body"), level: "critical", label: t("feedSevCritical") },
    { source: "Yemeksepeti", time: t("feedTime2"), title: t("feedCard2Title"), body: t("feedCard2Body"), level: "high", label: t("feedSevHigh") },
    { source: t("sourcePos"), time: t("feedTime5"), title: t("feedCard5Title"), body: t("feedCard5Body"), level: "medium", label: t("feedSevMedium") },
  ];

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    // GSAP is fetched after hydration so it never competes with first paint.
    import("gsap")
      .then(({ gsap }) => {
        if (cancelled) return;
        // Slow network: the CSS failsafe has already started showing the finished
        // state. Keep it; never blank content the visitor is already reading.
        const first = el.querySelector(".mk-pre");
        if (first && getComputedStyle(first).opacity !== "0") {
          el.dataset.static = "true";
          return;
        }
        // Hands control to the timeline (switches off the CSS failsafe reveal).
        el.dataset.playing = "true";
        ctx = gsap.context(() => {
          const show = { opacity: 1, y: 0, scale: 1 };
          const tl = gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out", duration: 0.5 } });
          tl.fromTo("[data-row]", { opacity: 0, y: 14 }, { ...show, stagger: 0.12 })
            .fromTo("[data-bar]", { opacity: 1, scaleY: 0 }, { scaleY: 1, duration: 0.4 }, "-=0.15")
            .fromTo("[data-chat]", { opacity: 0, y: 28 }, { ...show, duration: 0.65 }, "-=0.1")
            .fromTo("[data-msg]", { opacity: 0, y: 10, scale: 0.97 }, { ...show, duration: 0.45 }, "-=0.2")
            .fromTo("[data-reply]", { opacity: 0, y: 8, scale: 0.9 }, { ...show, duration: 0.35, ease: "back.out(1.6)" }, "+=1.1")
            .fromTo("[data-ack]", { opacity: 0, y: 8 }, { ...show, duration: 0.4 }, "+=0.55")
            .to("[data-open]", { opacity: 0, duration: 0.25 }, "<")
            .fromTo("[data-done]", { opacity: 0, y: 4 }, { ...show, duration: 0.35 }, ">-0.05");
        }, el);
      })
      .catch(() => {
        // Animation code failed to load: fall back to the finished, static state.
        el.dataset.static = "true";
      });

    return () => {
      cancelled = true;
      ctx?.revert();
      delete el.dataset.playing;
    };
  }, []);

  return (
    <figure ref={root} aria-label={t("demoLabel")} className="mx-auto w-full max-w-[540px] lg:mx-0 lg:ml-auto">
      {/* ── Signal list ── */}
      <div className="rounded-2xl border border-mk-line bg-mk-raised pb-14 shadow-[0_30px_60px_-36px_rgba(23,20,15,0.28)] sm:w-[90%]">
        <div className="flex items-center gap-2.5 px-5 py-3.5">
          <span aria-hidden className="flex">
            <LogoMark size={18} />
          </span>
          <span className="text-[0.86rem] font-semibold">{t("demoBoardTitle")}</span>
          <span className="ml-auto font-mk-mono text-[0.66rem] text-mk-muted">{t("demoBoardMeta")}</span>
        </div>
        <ul>
          {rows.map((r, i) => (
            <li key={r.level} data-row className="mk-pre relative flex items-start gap-3 border-t border-mk-line px-5 py-3.5">
              {i === 0 && <span data-bar aria-hidden className="mk-pre absolute inset-y-0 left-0 w-[2px] origin-top bg-mk-accent" />}
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-mk-mono text-[0.64rem] text-mk-muted">
                  {r.source} · {r.time}
                </p>
                <p className="text-[0.9rem] font-semibold leading-snug tracking-[-0.005em]">{r.title}</p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-mk-muted">{r.body}</p>
              </div>
              {i === 0 ? (
                <span className="grid shrink-0 justify-items-end pt-0.5">
                  <span data-open aria-hidden className={cn(TAG, "mk-pre-inv col-start-1 row-start-1 text-mk-ink")}>
                    <LevelDot level={r.level} />
                    {r.label}
                  </span>
                  <span data-done className={cn(TAG, "mk-pre col-start-1 row-start-1 text-mk-ink")}>
                    <Check aria-hidden className="size-3 text-mk-accent-ink" strokeWidth={2.6} />
                    {t("feedSevResolved")}
                  </span>
                </span>
              ) : (
                <span className={cn(TAG, "shrink-0 pt-0.5 text-mk-soft")}>
                  <LevelDot level={r.level} />
                  {r.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── WhatsApp brief ── */}
      <div
        data-chat
        className="mk-pre relative -mt-10 ml-auto w-[92%] overflow-hidden rounded-2xl border border-mk-line bg-[#efeae2] shadow-[0_30px_60px_-30px_rgba(23,20,15,0.35)] sm:w-[74%]"
      >
        <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-mk-raised px-4 py-2.5">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-mk-sunken">
            <LogoMark size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-[0.84rem] font-semibold">Observer</span>
            <span className="block text-[0.68rem] text-mk-muted">{t("waBusinessLabel")}</span>
          </span>
          <span className="ml-auto font-mk-mono text-[0.62rem] text-mk-muted">WhatsApp</span>
        </div>
        <div className="flex flex-col gap-2 px-3.5 py-3.5 text-[#111b21]">
          <div data-msg className="mk-pre max-w-[92%] origin-bottom-left rounded-[4px_14px_14px_14px] bg-white px-3.5 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            <p className="text-[0.86rem] font-semibold leading-snug">{t("feedCard1Title")}</p>
            <p className="mt-1 text-[0.82rem] leading-[1.45] text-[#3b4a54]">{t("feedCard1Body")}</p>
            <p className="mt-2 text-[0.82rem] leading-[1.45]">
              <span className="font-semibold">{t("feedCard3Title")}:</span> {t("feedCard3Body")}
            </p>
            <p className="mt-2 text-[0.76rem] leading-[1.45] text-[#54656f]">{t("demoReplyHint")}</p>
            <p className="mt-0.5 text-right text-[0.62rem] text-[#5b6b74]">09:24</p>
          </div>
          <div data-reply className="mk-pre ml-auto flex origin-bottom-right items-end gap-2 rounded-[14px_4px_14px_14px] bg-[#d9fdd3] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            <span className="text-[0.9rem] font-medium">2</span>
            <span className="flex items-center gap-1 text-[0.62rem] text-[#3f5059]">
              09:26 <CheckCheck aria-hidden className="size-3.5 text-[#027eb5]" />
            </span>
          </div>
          <div data-ack className="mk-pre max-w-[92%] rounded-[4px_14px_14px_14px] bg-white px-3.5 py-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            <p className="text-[0.82rem] leading-[1.45]">{t("demoAck")}</p>
          </div>
        </div>
      </div>

      <figcaption className="mt-4 text-right font-mk-mono text-[0.66rem] text-mk-muted">{t("demoCaption")}</figcaption>
    </figure>
  );
}
