"use client";
import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before the first target starts. */
  delay?: number;
  /** When set, descendants matching this selector rise in one after another. */
  stagger?: string;
}

/**
 * Two small jobs, both with IntersectionObserver and no animation library:
 * 1. Fade content up the first time it is about to scroll into view (`.mk-reveal`).
 *    Content already on screen at mount, reduced-motion visitors and no-JS renders
 *    are left untouched, so nothing is ever hidden without a way to come back.
 * 2. Keep `data-inview` in step with visibility, so looping scenes inside
 *    (`.mk-loop`) only run while their section is actually on screen.
 */
export default function Reveal({ children, className, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const presence = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.dataset.inview = "true";
      else delete el.dataset.inview;
    });
    presence.observe(el);

    let targets: HTMLElement[] = [];
    let entrance: IntersectionObserver | undefined;
    if (el.getBoundingClientRect().top >= window.innerHeight * 1.05) {
      targets = stagger ? Array.from(el.querySelectorAll<HTMLElement>(stagger)) : [el];
      targets.forEach((target, i) => {
        target.classList.add("mk-reveal");
        target.style.transitionDelay = `${delay + i * 0.06}s`;
      });
      entrance = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          targets.forEach((target) => target.classList.add("mk-reveal-in"));
          entrance?.disconnect();
        },
        // start just before the block enters, so fast scrolling never meets an empty screen
        { rootMargin: "0px 0px 12% 0px" },
      );
      entrance.observe(el);
    }

    return () => {
      presence.disconnect();
      entrance?.disconnect();
      delete el.dataset.inview;
      targets.forEach((target) => {
        target.classList.remove("mk-reveal", "mk-reveal-in");
        target.style.transitionDelay = "";
      });
    };
  }, [delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
