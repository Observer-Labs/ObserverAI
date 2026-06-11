"use client";
import { useState, useEffect, useCallback } from "react";
import { SourcePill } from "@/components/ui/SignalBadges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/types";

const ALL_SOURCES = [
  { key: "slack",    label: "Slack",        icon: "⚡" },
  { key: "email",    label: "Email",         icon: "✉️" },
  { key: "zendesk",  label: "Zendesk",       icon: "🎫" },
  { key: "intercom", label: "Intercom",      icon: "💼" },
  { key: "jira",     label: "Jira",          icon: "📋" },
  { key: "appstore", label: "App Store",     icon: "⭐" },
  { key: "github",   label: "GitHub",        icon: "🐙" },
  { key: "reddit",   label: "Reddit",        icon: "👾" },
];

const FILTER_TABS = ["all", "slack", "email", "zendesk", "intercom", "jira", "appstore", "github", "reddit"];

export function SignalsTab() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [ingesting, setIngesting] = useState<string | null>(null);

  const fetchSignals = useCallback(async (source?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (source && source !== "all") params.set("source", source);
    const res = await fetch(`/api/signals?${params}`);
    const data = await res.json();
    setSignals(data.signals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchSignals(filter);
    }, 0);
    return () => window.clearTimeout(id);
  }, [filter, fetchSignals]);

  const markReviewed = async (signalId: string) => {
    await fetch("/api/signals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId }),
    });
    setSignals((current) => current.map((s) => s.id === signalId ? { ...s, reviewed: true } : s));
  };

  const ingest = async (source: string) => {
    setIngesting(source);
    await fetch(`/api/ingest/${source}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setIngesting(null);
    fetchSignals(filter);
  };

  const filteredSignals = filter === "all" ? signals : signals.filter((s) => s.source === filter);

  const statSources = [
    { label: "Total",     value: signals.length,                                             color: "white" },
    { label: "Slack",     value: signals.filter((s) => s.source === "slack").length,         color: "#e879f9" },
    { label: "Email",     value: signals.filter((s) => s.source === "email").length,         color: "#6ea8ff" },
    { label: "WhatsApp",  value: signals.filter((s) => s.source === "whatsapp").length,      color: "#46e6a6" },
    { label: "Zendesk",   value: signals.filter((s) => s.source === "zendesk").length,       color: "#f79a00" },
    { label: "Intercom",  value: signals.filter((s) => s.source === "intercom").length,      color: "#4dabf7" },
    { label: "Jira",      value: signals.filter((s) => s.source === "jira").length,          color: "#2684ff" },
    { label: "App Store", value: signals.filter((s) => s.source === "appstore").length,      color: "#a78bfa" },
    { label: "GitHub",    value: signals.filter((s) => s.source === "github").length,        color: "#c9d1d9" },
    { label: "Reddit",    value: signals.filter((s) => s.source === "reddit").length,        color: "#ff4500" },
    { label: "Reviewed",  value: signals.filter((s) => s.reviewed).length,                  color: "var(--muted)" },
  ];

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-[7px] border px-3.5 py-1.5 text-[0.8rem] font-medium transition-all duration-[0.12s]",
              filter === f
                ? "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.1)] text-foreground"
                : "border-transparent bg-transparent text-[var(--muted-light)] hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
            )}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All Sources" : f === "appstore" ? "App Store" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Pull buttons */}
      <div className="mb-5 flex flex-wrap gap-2">
        {ALL_SOURCES.map((src) => (
          <Button
            key={src.key}
            variant="outline"
            onClick={() => ingest(src.key)}
            disabled={ingesting === src.key}
            className="h-auto px-3 py-[5px] text-[0.75rem]"
          >
            {ingesting === src.key ? `Pulling ${src.label}…` : `${src.icon} Pull ${src.label}`}
          </Button>
        ))}
      </div>

      {/* Stats row */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        {statSources.filter((s) => s.value > 0 || s.label === "Total").map((stat) => (
          <div key={stat.label} className="rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2">
            <div className="text-[1.1rem] font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[0.68rem] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Signals feed */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading signals...</div>
      ) : filteredSignals.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-[2.5rem]">📭</div>
          <p className="text-muted-foreground">No signals yet. Pull from your connected sources above.</p>
          <a href="/settings/integrations" className="text-[0.875rem] text-[var(--accent-blue)]">
            → Set up integrations
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredSignals.map((signal) => (
            <div
              key={signal.id}
              className={cn(
                "rounded-[14px] border bg-card px-5 py-4 shadow-sm transition-opacity duration-200",
                signal.reviewed && "opacity-50"
              )}
            >
              <div className="flex items-start gap-4">
                <SourcePill source={signal.source} />

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.75rem] font-medium text-[var(--accent-green)]">#{signal.channel}</span>
                      {signal.sender && (
                        <span className="text-[0.75rem] text-muted-foreground">· {signal.sender}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                      {new Date(signal.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-[0.875rem] leading-[1.5] text-white">
                    {signal.content}
                  </p>
                  {signal.tags && signal.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {signal.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-[rgba(110,168,255,0.2)] bg-[rgba(110,168,255,0.1)] px-2 py-0.5 text-[0.7rem] text-[var(--accent-blue)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!signal.reviewed && (
                  <Button
                    variant="ghost"
                    onClick={() => markReviewed(signal.id)}
                    className="h-auto shrink-0 px-3 py-1 text-[0.75rem]"
                  >
                    Mark reviewed
                  </Button>
                )}
                {signal.reviewed && (
                  <span className="shrink-0 text-[0.75rem] text-[var(--accent-green)]">✓ Reviewed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
