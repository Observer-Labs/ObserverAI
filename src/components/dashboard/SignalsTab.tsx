"use client";
import { useState, useEffect, useCallback } from "react";
import { SourcePill } from "@/components/ui/Badge";
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
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            className={`pill-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
            style={{ fontSize: "0.8rem" }}
          >
            {f === "all" ? "All Sources" : f === "appstore" ? "App Store" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Pull buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {ALL_SOURCES.map((src) => (
          <button
            key={src.key}
            className="btn-secondary"
            onClick={() => ingest(src.key)}
            disabled={ingesting === src.key}
            style={{ fontSize: "0.75rem", padding: "5px 12px" }}
          >
            {ingesting === src.key ? `Pulling ${src.label}…` : `${src.icon} Pull ${src.label}`}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {statSources.filter((s) => s.value > 0 || s.label === "Total").map((stat) => (
          <div key={stat.label} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: stat.color, fontWeight: 700, fontSize: "1.1rem" }}>{stat.value}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.68rem" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Signals feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>Loading signals...</div>
      ) : filteredSignals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📭</div>
          <p style={{ color: "var(--muted)" }}>No signals yet. Pull from your connected sources above.</p>
          <a href="/settings/integrations" style={{ color: "var(--accent-blue)", fontSize: "0.875rem" }}>
            → Set up integrations
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSignals.map((signal) => (
            <div
              key={signal.id}
              className="obs-card"
              style={{ padding: "16px 20px", opacity: signal.reviewed ? 0.5 : 1, transition: "opacity 0.2s" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <SourcePill source={signal.source} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--accent-green)", fontSize: "0.75rem", fontWeight: 500 }}>#{signal.channel}</span>
                      {signal.sender && (
                        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>· {signal.sender}</span>
                      )}
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: "0.7rem", flexShrink: 0 }}>
                      {new Date(signal.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ color: "white", fontSize: "0.875rem", lineHeight: 1.5, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {signal.content}
                  </p>
                  {signal.tags && signal.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {signal.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: "0.7rem", color: "var(--accent-blue)", background: "rgba(110,168,255,0.1)", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(110,168,255,0.2)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!signal.reviewed && (
                  <button
                    className="btn-ghost"
                    onClick={() => markReviewed(signal.id)}
                    style={{ flexShrink: 0, fontSize: "0.75rem", padding: "4px 12px" }}
                  >
                    Mark reviewed
                  </button>
                )}
                {signal.reviewed && (
                  <span style={{ color: "var(--accent-green)", fontSize: "0.75rem", flexShrink: 0 }}>✓ Reviewed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
