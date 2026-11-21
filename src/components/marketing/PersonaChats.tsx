"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { Coffee, Store, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Bubble, { ChatChip } from "@/components/marketing/Bubble";
import { cn } from "@/lib/utils";

export interface Persona {
  id: "cafe" | "restaurant" | "retail";
  name: string;
  sources: string[];
  alert: string;
}

const ICON: Record<Persona["id"], LucideIcon> = { cafe: Coffee, restaurant: UtensilsCrossed, retail: Store };

interface PersonaChatsProps {
  personas: Persona[];
  /** Accessible name of the tab list. */
  label: string;
  /** Caption under the example message. */
  caption: string;
  /** "Reply 1 / 2 / 3" line shown inside the message. */
  hint: string;
}

/**
 * "Who it is for" as a chat app: pick a business type on the left, read the
 * WhatsApp alert that kind of business would get on the right.
 */
export default function PersonaChats({ personas, label, caption, hint }: PersonaChatsProps) {
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
    <div className="grid grid-cols-1 overflow-hidden rounded-[28px] border border-mk-line md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      {/* Chat list */}
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="grid grid-cols-3 border-b border-mk-line bg-mk-raised md:flex md:flex-col md:border-b-0 md:border-r">
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
                "group relative flex cursor-pointer flex-col items-center gap-2 px-2 py-4 text-center transition-colors duration-200 md:flex-row md:gap-4 md:px-6 md:py-5 md:text-left",
                "md:border-b md:border-mk-line md:last:border-b-0",
                selected ? "bg-mk-sunken" : "mkh:bg-mk-sunken/60",
              )}
            >
              {/* selection marker: bottom bar on phones, left bar on desktop */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[3px] origin-left bg-mk-accent transition-transform duration-300 md:inset-x-auto md:inset-y-0 md:left-0 md:h-auto md:w-[3px] md:origin-top",
                  selected ? "scale-100" : "scale-x-0 md:scale-x-100 md:scale-y-0",
                )}
              />
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  selected ? "bg-mk-ink text-mk-paper" : "bg-mk-sunken text-mk-ink group-mkh:bg-mk-raised",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-semibold leading-tight tracking-[-0.01em] md:text-[1.12rem]">{p.name}</span>
                <span className="mt-1 hidden truncate text-[0.84rem] text-mk-muted md:block">{p.alert}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Conversation */}
      <div className="mk-wall flex min-h-[300px] flex-col justify-center px-4 py-6 sm:px-8 sm:py-8">
        {personas.map((p, i) => (
          <div key={p.id} role="tabpanel" id={`persona-panel-${p.id}`} aria-labelledby={`persona-tab-${p.id}`} tabIndex={0} hidden={i !== active} className="flex flex-col gap-3">
            <ChatChip>{p.sources.join(" · ")}</ChatChip>
            <Bubble className="mk-pop max-w-[520px] origin-bottom-left px-5 py-4 text-[1.02rem] leading-[1.55]">
              {p.alert}
              <span className="mt-2.5 block text-[0.82rem] text-mk-muted">{hint}</span>
              <span className="mt-0.5 block text-right font-mk-mono text-[0.62rem] text-mk-muted">09:24</span>
            </Bubble>
            <p className="font-mk-mono text-[0.66rem] uppercase tracking-[0.08em] text-mk-muted">{caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
