"use client";
import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Feeds the pointer position to every `.mk-tile` inside as --mx / --my, so the
 * tiles' CSS spotlight and edge glow follow the cursor (also across neighbours).
 * Touch pointers are ignored; the CSS only shows the effect for fine pointers.
 */
export default function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.querySelectorAll<HTMLElement>(".mk-tile").forEach((tile) => {
        const r = tile.getBoundingClientRect();
        tile.style.setProperty("--mx", `${clientX - r.left}px`);
        tile.style.setProperty("--my", `${clientY - r.top}px`);
      });
    });
  };

  return (
    <div ref={ref} onPointerMove={onPointerMove} className={className}>
      {children}
    </div>
  );
}
