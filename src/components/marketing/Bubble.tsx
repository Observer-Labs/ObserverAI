import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Two skins. `wa` is WhatsApp's own dark theme (incoming #1f2c34, outgoing #005c4b)
// and is used only inside the phone, where the page depicts the real app. Everywhere
// else a message keeps the bubble shape but sits in the page's warm surfaces.
const SKIN = {
  page: { observer: "bg-[#262320] text-mk-ink", owner: "bg-[#3a352f] text-mk-ink" },
  wa: { observer: "bg-[#202c33] text-[#e9edef]", owner: "bg-[#005c4b] text-[#e9edef]" },
} as const;

interface BubbleProps {
  tone?: "observer" | "owner";
  /** WhatsApp's own colours (phone only). */
  wa?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A message bubble: incoming (Observer) or outgoing (the owner). */
export default function Bubble({ tone = "observer", wa, children, className, style }: BubbleProps) {
  return (
    <div
      style={style}
      className={cn(
        wa
          ? // WhatsApp metrics: 14.2/19 type, tight padding, a tail on the sender's top corner.
            "relative rounded-[9px] px-[9px] pb-[7px] pt-[6px] text-[0.89rem] leading-[1.34] shadow-[0_1px_0.5px_rgba(11,20,26,0.5)] before:absolute before:top-0 before:h-[12px] before:w-[8px] before:bg-inherit before:content-[''] after:clear-both after:block after:content-['']"
          : "rounded-[14px] px-3 py-2 text-[0.9rem] leading-[1.42] shadow-[0_1px_0.5px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,244,230,0.05)]",
        wa
          ? tone === "owner"
            ? "rounded-tr-none before:-right-[7px] before:[clip-path:polygon(0_0,100%_0,0_100%)]"
            : "rounded-tl-none before:-left-[7px] before:[clip-path:polygon(0_0,100%_0,100%_100%)]"
          : tone === "owner"
            ? "rounded-tr-[4px]"
            : "rounded-tl-[4px]",
        SKIN[wa ? "wa" : "page"][tone],
        className,
      )}
    >
      {children}
    </div>
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
