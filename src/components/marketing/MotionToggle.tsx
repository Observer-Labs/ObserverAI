"use client";
import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT = "mk:motion";
const root = () => document.querySelector<HTMLElement>(".mk");

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
const isPaused = () => root()?.dataset.paused === "true";

/**
 * Pause / resume every looping animation on the marketing page. The state lives
 * on the `.mk` root as `data-paused` (CSS stops all animations under it), so
 * several copies of this button stay in sync.
 */
export default function MotionToggle({ label, className }: { label: string; className?: string }) {
  const paused = useSyncExternalStore(subscribe, isPaused, () => false);
  const Icon = paused ? Play : Pause;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={paused}
      onClick={() => {
        const el = root();
        if (!el) return;
        if (paused) delete el.dataset.paused;
        else el.dataset.paused = "true";
        window.dispatchEvent(new Event(EVENT));
      }}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-mk-line bg-mk-raised/80 text-mk-muted transition-colors duration-200 mkh:border-mk-strong mkh:text-mk-ink motion-reduce:hidden",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
    </button>
  );
}
