"use client";
// Animated lucide icons in the beui idiom. Wrap any lucide icon with a calm
// hover preset; with trigger="parent" the variant is driven by an enclosing
// motion component using whileHover="hover" (e.g. a nav row), so the icon
// reacts when the whole row is hovered. Reduced-motion renders static.

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type IconPreset = "pop" | "swing" | "spin" | "slide" | "pulse";

const PRESET_VARIANTS: Record<IconPreset, Variants> = {
  /** Tiny scale-up — the default, safe everywhere. */
  pop: { hover: { scale: 1.12, transition: SPRING_SWAP } },
  /** Bell-style wiggle for alerts/notifications. */
  swing: {
    hover: {
      rotate: [0, -12, 10, -6, 0],
      transition: { duration: 0.5, ease: EASE_OUT },
    },
  },
  /** Partial turn for gears/refresh affordances. */
  spin: { hover: { rotate: 40, transition: SPRING_SWAP } },
  /** Slide along x for exit/forward arrows. */
  slide: { hover: { x: 2, transition: SPRING_SWAP } },
  /** Single heartbeat for live/activity indicators. */
  pulse: {
    hover: {
      scale: [1, 1.14, 1],
      transition: { duration: 0.45, ease: EASE_IN_OUT },
    },
  },
};

export interface AnimatedIconProps {
  icon: LucideIcon;
  preset?: IconPreset;
  /** "self": animates on its own hover. "parent": driven by an enclosing
   * motion component's whileHover="hover" via variant propagation. */
  trigger?: "self" | "parent";
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedIcon({
  icon: Icon,
  preset = "pop",
  trigger = "self",
  size = 15,
  strokeWidth = 1.8,
  className,
}: AnimatedIconProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span className={cn("inline-flex", className)}>
        <Icon size={size} strokeWidth={strokeWidth} />
      </span>
    );
  }

  return (
    <motion.span
      variants={PRESET_VARIANTS[preset]}
      whileHover={trigger === "self" ? "hover" : undefined}
      className={cn("inline-flex", className)}
    >
      <Icon size={size} strokeWidth={strokeWidth} />
    </motion.span>
  );
}
