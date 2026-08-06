"use client";
// App entrance primitive in the beui.dev idiom: subtle fade + rise on mount,
// stagger via `index`, disabled entirely under prefers-reduced-motion.
// Use for card grids and panels — operational UI, so keep it calm.

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/ease";

export interface FadeInProps {
  children: ReactNode;
  /** Position in a staggered group; each step adds `stagger` seconds. */
  index?: number;
  stagger?: number;
  duration?: number;
  /** Initial rise distance in px. */
  distance?: number;
  className?: string;
}

export function FadeIn({
  children,
  index = 0,
  stagger = 0.05,
  duration = 0.35,
  distance = 8,
  className,
}: FadeInProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay: index * stagger, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
