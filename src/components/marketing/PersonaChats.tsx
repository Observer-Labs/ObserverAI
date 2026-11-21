"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { Coffee, Store, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import Bubble from "@/components/marketing/Bubble";
import { cn } from "@/lib/utils";

export interface Persona {
  id: "cafe" | "restaurant" | "retail";
  name: string;
  /** Shorter tab label for narrow screens. */
  short?: string;
  sources: string[];
  alert: string;
}

const ICON: Record<Persona["id"], LucideIcon> = { cafe: Coffee, restaurant: UtensilsCrossed, retail: Store };

interface PersonaChatsProps {
  personas: Persona[];
  /** Accessible name of the tab list. */
  label: string;
  /** Small label above the example message. */
  caption: string;
  /** "Reply 1 / 2 / 3" line shown inside the message. */
  hint: string;
  /** Label above the sources of the selected business type. */
  sourcesLabel: string;
  /** Small note under the sources (what is coming next). */
  note: string;
}

/** "Who it is for" as one staged scene: pick a business type, read the WhatsApp alert it would get. */
export default function PersonaChats({ personas, label, caption, hint, sourcesLabel, note }: PersonaChatsProps) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + personas.length) % personas.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mk-surface overflow-hidden rounded-[24px]">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="grid grid-cols-3 border-b border-mk-line">
        {personas.map((p, i) => {
          const Icon = ICON[p.id];
          const selected = i === active;
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`persona-tab-${p.id}`}
              aria-label={p.name}
              aria-selected={selected}
              aria-controls={`persona-panel-${p.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center gap-2 border-r border-mk-line px-2 py-4 text-center text-[0.86rem] font-medium leading-tight transition-colors duration-200 last:border-r-0 sm:flex-row sm:gap-3 sm:py-5 sm:text-[1rem]",
                selected ? "bg-white/[0.035] text-mk-ink" : "text-mk-muted mkh:bg-white/[0.02] mkh:text-mk-soft",
              )}
            >
              <Icon aria-hidden className={cn("size-[18px] shrink-0 transition-colors duration-200", selected && "text-mk-accent-ink")} strokeWidth={1.8} />
              {p.short ? (
                <>
                  <span className="sm:hidden">{p.short}</span>
                  <span className="hidden sm:inline">{p.name}</span>
                </>
              ) : (
                p.name
              )}
              <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-[2px] origin-center bg-mk-accent transition-transform duration-300", selected ? "scale-x-100" : "scale-x-0")} />
            </button>
          );
        })}
      </div>

      {personas.map((p, i) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`persona-panel-${p.id}`}
          aria-labelledby={`persona-tab-${p.id}`}
          tabIndex={0}
          hidden={i !== active}
          className="grid grid-cols-1 items-center gap-x-12 gap-y-7 px-5 py-7 sm:px-9 sm:py-9 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          <div>
            <p className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{p.name}</p>
            <p className="mt-5 font-mk-mono text-[0.75rem] uppercase tracking-[0.1em] text-mk-muted">{sourcesLabel}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.sources.map((s) => (
                <li key={s} className="rounded-full border border-mk-strong px-3 py-1 text-[0.86rem] text-mk-soft">
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.86rem] text-mk-muted">{note}</p>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 font-mk-mono text-[0.75rem] uppercase tracking-[0.1em] text-mk-muted">
              <span aria-hidden className="flex">
                <LogoMark size={14} />
              </span>
              {caption}
            </p>
            <Bubble className="mk-pop max-w-[560px] origin-top-left rounded-[20px] rounded-tl-[5px] px-5 py-4 text-[1.04rem] leading-[1.5] sm:px-6 sm:py-5 sm:text-[1.14rem]">
              {p.alert}
              <span className="mt-3 block text-[0.86rem] text-mk-muted">{hint}</span>
              <span className="mt-0.5 block text-right text-[0.72rem] text-mk-muted">09:24</span>
            </Bubble>
          </div>
        </div>
      ))}
    </div>
  );
}
