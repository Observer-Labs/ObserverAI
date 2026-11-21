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
 * Fades content up the first time it scrolls into view (IntersectionObserver +
 * the `.mk-reveal` CSS transition, no animation library). Content that is
 * already on screen at mount, reduced-motion users and no-JS renders are left
 * untouched, so nothing is ever hidden without a way to come back.
 */
export default function Reveal({ children, className, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const targets = stagger ? Array.from(el.querySelectorAll<HTMLElement>(stagger)) : [el];
    targets.forEach((target, i) => {
      target.classList.add("mk-reveal");
      target.style.transitionDelay = `${delay + i * 0.09}s`;
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        targets.forEach((target) => target.classList.add("mk-reveal-in"));
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
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
