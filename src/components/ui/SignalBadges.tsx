"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity, SignalSource } from "@/lib/types";

interface BadgeProps {
  severity: Severity | string;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: BadgeProps) {
  const variantClass =
    severity === "high"
      ? "border-[color-mix(in_oklch,var(--amber)_30%,transparent)] bg-[color-mix(in_oklch,var(--amber)_12%,transparent)] text-[oklch(0.55_0.14_70)]"
      : severity === "medium"
        ? "border-[color-mix(in_oklch,var(--sky)_30%,transparent)] bg-[color-mix(in_oklch,var(--sky)_12%,transparent)] text-[oklch(0.48_0.12_230)]"
        : "border-border bg-muted text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-[4px] px-2 py-[2px] text-[0.67rem] font-bold uppercase tracking-[0.06em]",
        variantClass,
        className
      )}
    >
      {severity}
    </Badge>
  );
}

interface ConfidenceBarProps {
  value: number; // 0-1
  className?: string;
}

export function ConfidenceBar({ value, className = "" }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "#46e6a6" : value >= 0.4 ? "#ffd166" : "#ff5c7a";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-[rgba(255,255,255,0.07)]">
        <div
          className="h-full rounded-[2px] [transition:width_0.8s_cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="min-w-8 text-[0.75rem] text-muted-foreground">{pct}%</span>
    </div>
  );
}

interface SourcePillProps {
  source: SignalSource;
  count?: number;
}

const sourceConfig: Record<SignalSource, { label: string; color: string; text: string; icon: string }> = {
  slack:           { label: "Slack",            color: "#4A154B", text: "#e879f9", icon: "⚡" },
  email:           { label: "Email",            color: "#1a3a5c", text: "#6ea8ff", icon: "✉️" },
  whatsapp:        { label: "WhatsApp",         color: "#0a3d23", text: "#46e6a6", icon: "💬" },
  zendesk:         { label: "Zendesk",          color: "#2d1f00", text: "#f79a00", icon: "🎫" },
  intercom:        { label: "Intercom",         color: "#0d2137", text: "#4dabf7", icon: "💼" },
  jira:            { label: "Jira",             color: "#0a1e3d", text: "#2684ff", icon: "📋" },
  appstore:        { label: "App Store",        color: "#1c1030", text: "#a78bfa", icon: "⭐" },
  googleplay:      { label: "Google Play",      color: "#0a2d1a", text: "#34d399", icon: "🎮" },
  googleanalytics: { label: "Google Analytics", color: "#1a1a2d", text: "#818cf8", icon: "📊" },
  github:          { label: "GitHub",           color: "#161b22", text: "#c9d1d9", icon: "🐙" },
  reddit:          { label: "Reddit",           color: "#2d1200", text: "#ff4500", icon: "👾" },
  shopify:         { label: "Shopify",          color: "#1a2e1a", text: "#96bf48", icon: "🛍️" },
  trustpilot:      { label: "Trustpilot",       color: "#002f2f", text: "#00b67a", icon: "⭐" },
};

export function SourcePill({ source, count }: SourcePillProps) {
  const cfg = sourceConfig[source] ?? { label: source, color: "#1a1a1a", text: "#9aa3b2", icon: "•" };
  return (
    <Badge
      variant="outline"
      className="gap-1 rounded-full px-[9px] py-[2px] text-[0.7rem] font-medium"
      style={{ background: `${cfg.color}cc`, color: cfg.text, border: `1px solid ${cfg.text}33` }}
    >
      {cfg.icon} {cfg.label}{count !== undefined ? ` (${count})` : ""}
    </Badge>
  );
}
