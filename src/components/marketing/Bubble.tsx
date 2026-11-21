import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE = {
  /** Observer speaking (incoming). */
  observer: "rounded-bl-[6px] bg-mk-raised text-mk-ink",
  /** The owner replying (outgoing). */
  owner: "rounded-br-[6px] bg-mk-ink text-mk-paper",
  /** A customer comment: the raw noise Observer reads. */
  customer: "rounded-bl-[6px] border border-mk-line bg-mk-raised text-mk-soft",
} as const;

interface BubbleProps {
  tone?: keyof typeof TONE;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** The page's recurring shape: a chat bubble with one tight "tail" corner. */
export default function Bubble({ tone = "observer", children, className, style }: BubbleProps) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-[20px] px-4 py-3 text-[0.9rem] leading-[1.45]",
        tone !== "customer" && "shadow-[0_1px_1px_rgba(15,21,18,0.1)]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Centered system chip, like a chat's date separator. */
export function ChatChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mx-auto w-fit rounded-full bg-mk-raised px-3 py-1 text-center font-mk-mono text-[0.66rem] text-mk-muted shadow-[0_1px_1px_rgba(15,21,18,0.08)]", className)}>
      {children}
    </p>
  );
}

/** Three bouncing dots: "… is typing". */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("mk-dots inline-flex items-center gap-1", className)}>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

export interface ReplyKey {
  key: string;
  label: string;
}

/**
 * The 1 / 2 / 3 quick replies. `pressed` marks the chosen key; `pressedClassName`
 * lets the hero delay that look until its story reaches the reply.
 */
export function ReplyKeys({ keys, pressed, pressedClassName, className }: { keys: ReplyKey[]; pressed?: string; pressedClassName?: string; className?: string }) {
  return (
    <ul className={cn("flex gap-1.5 sm:gap-2", className)}>
      {keys.map((k) => {
        const on = k.key === pressed;
        return (
          <li
            key={k.key}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.8rem] font-medium min-[400px]:pl-1.5 sm:text-[0.84rem]",
              on ? cn("border-mk-ink bg-mk-ink text-mk-paper", pressedClassName) : "border-mk-line bg-mk-raised text-mk-soft",
            )}
          >
            <span className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,currentColor_14%,transparent)] font-mk-mono text-[0.74rem] min-[400px]:flex">
              {k.key}
            </span>
            {k.label}
          </li>
        );
      })}
    </ul>
  );
}
