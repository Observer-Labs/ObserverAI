"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeverityBadge, ConfidenceBar, SourcePill } from "@/components/ui/SignalBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Cluster } from "@/lib/types";

interface OverviewTabProps {
  clusters: Cluster[];
  onOpenSnapshot: (cluster: Cluster) => void;
  onRunAnalysis: () => void;
  analyzing: boolean;
  hasIntegrations: boolean;
}

// ─── Onboarding empty state ───────────────────────────────────────────────────

function OnboardingState({ onRunAnalysis, analyzing }: { onRunAnalysis: () => void; analyzing: boolean }) {
  const router = useRouter();
  const steps = [
    { n: 1, label: "Connect sources", done: false },
    { n: 2, label: "Run analysis", done: false },
    { n: 3, label: "Get insights", done: false },
  ];

  const quickstarts = [
    { icon: "⚡", name: "Slack", color: "#e879f9", desc: "Team conversations & signals", href: "/connect" },
    { icon: "🎫", name: "Zendesk", color: "#f79a00", desc: "Support tickets", href: "/settings/integrations" },
    { icon: "🐙", name: "GitHub", color: "#c9d1d9", desc: "Issues & feature requests", href: "/settings/integrations" },
    { icon: "📋", name: "Jira", color: "#2684ff", desc: "Sprint & backlog signals", href: "/settings/integrations" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="rounded-[14px] border bg-[linear-gradient(135deg,rgba(70,230,166,0.05),rgba(110,168,255,0.05))] p-9 text-center shadow-sm">
        <div className="mb-4 text-[2.5rem]">👋</div>
        <h2 className="mb-2 text-[1.5rem] font-bold tracking-[-0.01em] text-white">
          Welcome to Observer
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-[0.9rem] leading-[1.6] text-muted-foreground">
          Connect your first signal source to start detecting Intent Gaps, the gaps between what customers want and what you&apos;re building.
        </p>

        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center gap-0">
          {steps.map((step, i) => (
            <div key={step.n} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-[0.85rem] font-bold",
                    step.done
                      ? "border-[var(--accent-green)] bg-[var(--accent-green)] text-[#0b0c10]"
                      : i === 0
                        ? "border-[rgba(70,230,166,0.4)] bg-[rgba(70,230,166,0.15)] text-[var(--accent-green)]"
                        : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-muted-foreground"
                  )}
                >
                  {step.done ? "✓" : step.n}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-[0.75rem]",
                    i === 0 ? "font-semibold text-white" : "font-normal text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-2 mb-7 h-px w-20 bg-[rgba(255,255,255,0.08)]" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={() => router.push("/connect")} className="h-auto px-6 py-2.5 text-[0.9rem]">
            → Connect first source
          </Button>
          <Button variant="outline" onClick={onRunAnalysis} disabled={analyzing} className="h-auto px-6 py-2.5 text-[0.9rem]">
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </div>

      {/* Quickstart cards */}
      <div>
        <p className="mb-4 text-[0.75rem] uppercase tracking-[0.1em] text-muted-foreground">Quickstart, pick your first source</p>
        <div className="grid grid-cols-2 gap-3">
          {quickstarts.map((qs) => (
            <button
              key={qs.name}
              onClick={() => router.push(qs.href)}
              className="flex cursor-pointer items-center gap-3.5 rounded-[12px] border bg-[rgba(255,255,255,0.03)] px-5 py-[18px] text-left transition-[border-color,background] duration-200"
              style={{ borderColor: `${qs.color}25` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${qs.color}60`; (e.currentTarget as HTMLElement).style.background = `${qs.color}08`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${qs.color}25`; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[1.3rem]"
                style={{ background: `${qs.color}15` }}
              >
                {qs.icon}
              </div>
              <div>
                <div className="mb-[3px] text-[0.9rem] font-semibold text-white">{qs.name}</div>
                <div className="text-[0.78rem] text-muted-foreground">{qs.desc}</div>
              </div>
              <div className="ml-auto text-[0.8rem] text-muted-foreground">→</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => router.push("/settings/integrations")} className="h-auto px-[18px] py-2 text-[0.8rem]">
          ⚙️ All Integrations
        </Button>
        <Button variant="outline" onClick={() => router.push("/connect")} className="h-auto px-[18px] py-2 text-[0.8rem]">
          🔌 Connect Wizard
        </Button>
      </div>
    </div>
  );
}

// ─── Distribute Modal ─────────────────────────────────────────────────────────

interface DistributeModalProps {
  cluster: Cluster;
  onClose: () => void;
}

function DistributeModal({ cluster, onClose }: DistributeModalProps) {
  const [channels, setChannels] = useState({ slack: true, email: true, whatsapp: false });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, "sent" | "error" | null>>({});
  const [done, setDone] = useState(false);

  const toggle = (ch: keyof typeof channels) =>
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const handleSend = async () => {
    setSending(true);
    const newResults: Record<string, "sent" | "error" | null> = {};

    const tasks: Promise<void>[] = [];

    if (channels.slack) {
      tasks.push(
        fetch("/api/distribute/slack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clusterId: cluster.id }),
        })
          .then((r) => { newResults.slack = r.ok ? "sent" : "error"; })
          .catch(() => { newResults.slack = "error"; })
      );
    }
    if (channels.email) {
      tasks.push(
        fetch("/api/distribute/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clusterIds: [cluster.id] }),
        })
          .then((r) => { newResults.email = r.ok ? "sent" : "error"; })
          .catch(() => { newResults.email = "error"; })
      );
    }
    if (channels.whatsapp) {
      tasks.push(
        fetch("/api/distribute/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clusterId: cluster.id }),
        })
          .then((r) => { newResults.whatsapp = r.ok ? "sent" : "error"; })
          .catch(() => { newResults.whatsapp = "error"; })
      );
    }

    await Promise.allSettled(tasks);
    setResults(newResults);
    setSending(false);
    setDone(true);
  };

  const channelConfig = [
    { key: "slack" as const, icon: "⚡", label: "Slack", color: "#e879f9", hint: "Channel brief" },
    { key: "email" as const, icon: "✉️", label: "Email", color: "#6ea8ff", hint: "Digest report" },
    { key: "whatsapp" as const, icon: "💬", label: "WhatsApp", color: "#46e6a6", hint: "Critical alert" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-6 backdrop-blur-[4px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[440px] rounded-[14px] border bg-card p-7 shadow-sm">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer border-0 bg-transparent text-[1.2rem] leading-none text-muted-foreground"
        >
          ×
        </button>

        <div className="mb-6">
          <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--accent-green)]">
            📡 Distribute Brief
          </div>
          <h3 className="text-[1.05rem] font-bold leading-[1.3] text-white">
            {cluster.title}
          </h3>
          <p className="mt-2 text-[0.8rem] text-muted-foreground">
            Select channels to distribute this insight brief to your team.
          </p>
        </div>

        {!done ? (
          <>
            <div className="mb-6 flex flex-col gap-2.5">
              {channelConfig.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => toggle(ch.key)}
                  className="flex cursor-pointer items-center gap-3.5 rounded-[10px] border px-[18px] py-3.5 transition-all duration-150"
                  style={{
                    background: channels[ch.key] ? `${ch.color}10` : "rgba(255,255,255,0.03)",
                    borderColor: channels[ch.key] ? `${ch.color}40` : "rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-all duration-150"
                    style={{
                      background: channels[ch.key] ? ch.color : "rgba(255,255,255,0.1)",
                      borderColor: channels[ch.key] ? ch.color : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {channels[ch.key] && <span className="text-[0.7rem] font-bold text-[#0b0c10]">✓</span>}
                  </div>
                  <span className="text-[1.1rem]">{ch.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-[0.875rem] font-semibold text-white">{ch.label}</div>
                    <div className="text-[0.72rem] text-muted-foreground">{ch.hint}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2.5">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !Object.values(channels).some(Boolean)}
                className="flex-[2]"
              >
                {sending ? "Sending..." : "Send Brief →"}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <div className="mb-6 flex flex-col gap-2.5">
              {channelConfig.map((ch) => {
                const res = results[ch.key];
                if (!channels[ch.key] || res === null) return null;
                return (
                  <div
                    key={ch.key}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] border px-4 py-3",
                      res === "sent"
                        ? "border-[rgba(70,230,166,0.25)] bg-[rgba(70,230,166,0.08)]"
                        : "border-[rgba(255,92,122,0.25)] bg-[rgba(255,92,122,0.08)]"
                    )}
                  >
                    <span className="text-[1.1rem]">{ch.icon}</span>
                    <span className="flex-1 text-[0.875rem] font-medium text-white">{ch.label}</span>
                    <span
                      className={cn(
                        "text-[0.8rem] font-semibold",
                        res === "sent" ? "text-[var(--accent-green)]" : "text-destructive"
                      )}
                    >
                      {res === "sent" ? "✓ Sent" : "✗ Failed"}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main OverviewTab ─────────────────────────────────────────────────────────

export function OverviewTab({ clusters, onOpenSnapshot, onRunAnalysis, analyzing, hasIntegrations }: OverviewTabProps) {
  const topCluster = clusters[0] ?? null;
  const [distributeCluster, setDistributeCluster] = useState<Cluster | null>(null);

  // If no integrations and no clusters, show onboarding
  if (!hasIntegrations) {
    return (
      <div className="grid grid-cols-[1fr_380px] items-start gap-6">
        <OnboardingState onRunAnalysis={onRunAnalysis} analyzing={analyzing} />
        {/* Right side: empty state */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[0.95rem] font-semibold text-white">Intent Gaps</h3>
            <span className="text-[0.75rem] text-muted-foreground">0 detected</span>
          </div>
          <div className="rounded-[12px] border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center">
            <div className="mb-3 text-[2rem]">🔍</div>
            <div className="text-[0.875rem] leading-[1.6] text-muted-foreground">
              Gaps appear here after you<br />connect sources and run analysis.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {distributeCluster && (
        <DistributeModal cluster={distributeCluster} onClose={() => setDistributeCluster(null)} />
      )}

      <div className="grid grid-cols-[1fr_380px] items-start gap-6">
        {/* Left: Today's Headline + Slack Preview */}
        <div className="flex flex-col gap-5">
          {/* Headline Card */}
          {topCluster ? (
            <div className="rounded-[14px] border bg-card p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--accent-green)]">Today&apos;s Headline</span>
                <SeverityBadge severity={topCluster.severity_label} />
              </div>

              <h2 className="mb-3 text-[1.3rem] font-bold leading-[1.3] text-white">
                {topCluster.title}
              </h2>
              <p className="mb-6 text-[0.9rem] leading-[1.6] text-muted-foreground">
                {topCluster.business_case}
              </p>

              <div className="mb-6 grid grid-cols-3 gap-4 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
                <div>
                  <div className="mb-1.5 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Confidence</div>
                  <ConfidenceBar value={topCluster.confidence} />
                </div>
                <div>
                  <div className="mb-1.5 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Evidence</div>
                  <div className="text-[1.1rem] font-semibold text-white">{topCluster.evidence_count}</div>
                  <div className="text-[0.75rem] text-muted-foreground">signals</div>
                </div>
                <div>
                  <div className="mb-1.5 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Revenue Risk</div>
                  <div className="text-[1.1rem] font-semibold text-destructive">
                    {topCluster.severity >= 70 ? "High" : topCluster.severity >= 40 ? "Medium" : "Low"}
                  </div>
                </div>
              </div>

              {topCluster.projected_impact && (
                <div className="mb-6 flex items-start gap-2.5 rounded-[10px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.06)] px-4 py-3">
                  <span className="mt-px shrink-0 text-[1.1rem]">💰</span>
                  <div>
                    <div className="mb-[3px] font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#f59e0b]">Projected Impact</div>
                    <div className="text-[0.88rem] font-semibold leading-[1.4] text-[#fff]">{topCluster.projected_impact}</div>
                  </div>
                </div>
              )}

              {topCluster.customer_quote && (
                <blockquote className="mb-6 border-l-[3px] border-l-[var(--accent-green)] pl-4 text-[0.875rem] italic leading-[1.6] text-muted-foreground">
                  &ldquo;{topCluster.customer_quote}&rdquo;
                </blockquote>
              )}

              <div className="flex gap-2.5">
                <Button onClick={() => onOpenSnapshot(topCluster)}>
                  Intent Snapshot
                </Button>
                <Button variant="outline" onClick={() => setDistributeCluster(topCluster)}>
                  📡 Distribute Brief
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] border bg-card p-12 text-center shadow-sm">
              <div className="mb-4 text-[3rem]">📡</div>
              <h3 className="mb-3 text-white">No signals yet</h3>
              <p className="mb-6 text-[0.875rem] leading-[1.6] text-muted-foreground">
                Connect your Slack, Email, or WhatsApp to start ingesting signals,<br />then run analysis to detect Intent Gaps.
              </p>
              <Button onClick={onRunAnalysis} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Run Analysis"}
              </Button>
            </div>
          )}

          {/* Brief Preview Card */}
          {topCluster && (
            <div className="rounded-[14px] border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] font-semibold text-white">Brief Preview</span>
                  <span className="text-[0.75rem] text-muted-foreground">→ Slack / Email / WhatsApp</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDistributeCluster(topCluster)}
                  className="h-auto px-3 py-1 text-[0.72rem]"
                >
                  📡 Send
                </Button>
              </div>
              <div className="rounded-l-none rounded-r-[8px] border-l-[3px] border-l-[var(--accent)] bg-[#1a1d21] px-5 py-4 font-mono text-[0.75rem]">
                <div className="mb-2">
                  <span className="font-bold text-[#46e6a6]">Observer</span>
                  <span className="ml-2 text-[0.7rem] text-[#666]">Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="text-[0.8rem] leading-[1.6] text-[#e0e0e0]">
                  <div className="mb-1 font-bold">
                    {topCluster.severity >= 70 ? "🔴" : topCluster.severity >= 40 ? "🟡" : "🟢"} Intent Gap · {topCluster.severity_label.toUpperCase()}
                  </div>
                  <div className="mb-1.5 font-semibold">{topCluster.title}</div>
                  <div className="mb-2.5 text-[#9aa3b2]">{topCluster.business_case}</div>
                  <div className="mb-3 text-[0.75rem] text-[#9aa3b2]">
                    Evidence: {topCluster.evidence_count} signals · Confidence: {Math.round(topCluster.confidence * 100)}%
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" asChild className="cursor-pointer gap-1 border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.1)] px-2.5 py-[3px] text-[0.73rem] font-medium text-[var(--accent)] transition-all hover:bg-[rgba(249,115,22,0.18)]">
                    <button onClick={() => onOpenSnapshot(topCluster)}>Intent Snapshot</button>
                  </Badge>
                  <Badge variant="outline" asChild className="cursor-pointer gap-1 border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.1)] px-2.5 py-[3px] text-[0.73rem] font-medium text-[var(--accent)] transition-all hover:bg-[rgba(249,115,22,0.18)]">
                    <button>Evidence</button>
                  </Badge>
                  <Badge variant="outline" asChild className="cursor-pointer gap-1 border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.1)] px-2.5 py-[3px] text-[0.73rem] font-medium text-[var(--accent)] transition-all hover:bg-[rgba(249,115,22,0.18)]">
                    <button>What closes the gap fastest?</button>
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Intent Gaps list */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[0.95rem] font-semibold text-white">Intent Gaps</h3>
            <span className="text-[0.75rem] text-muted-foreground">{clusters.length} detected</span>
          </div>
          <div className="flex flex-col gap-3">
            {clusters.length === 0 && (
              <div className="py-8 text-center text-[0.875rem] text-muted-foreground">
                Run analysis to detect gaps
              </div>
            )}
            {clusters.map((cluster, i) => (
              <div
                key={cluster.id}
                className="cursor-pointer rounded-[14px] border bg-card p-4 shadow-sm transition-[border-color] duration-200"
                onClick={() => onOpenSnapshot(cluster)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(70,230,166,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(70,230,166,0.1)] text-[0.8rem] font-bold text-[var(--accent-green)]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[0.875rem] font-medium text-white">{cluster.title}</span>
                      <SeverityBadge severity={cluster.severity_label} className="flex-shrink-0" />
                    </div>
                    <ConfidenceBar value={cluster.confidence} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cluster.source_breakdown.slack > 0 && <SourcePill source="slack" count={cluster.source_breakdown.slack} />}
                      {cluster.source_breakdown.email > 0 && <SourcePill source="email" count={cluster.source_breakdown.email} />}
                      {cluster.source_breakdown.whatsapp > 0 && <SourcePill source="whatsapp" count={cluster.source_breakdown.whatsapp} />}
                      {cluster.source_breakdown.zendesk > 0 && <SourcePill source="zendesk" count={cluster.source_breakdown.zendesk} />}
                      {cluster.source_breakdown.intercom > 0 && <SourcePill source="intercom" count={cluster.source_breakdown.intercom} />}
                      {cluster.source_breakdown.jira > 0 && <SourcePill source="jira" count={cluster.source_breakdown.jira} />}
                      {cluster.source_breakdown.appstore > 0 && <SourcePill source="appstore" count={cluster.source_breakdown.appstore} />}
                      {cluster.source_breakdown.github > 0 && <SourcePill source="github" count={cluster.source_breakdown.github} />}
                      {cluster.source_breakdown.reddit > 0 && <SourcePill source="reddit" count={cluster.source_breakdown.reddit} />}
                      {cluster.source_breakdown.shopify > 0 && <SourcePill source="shopify" count={cluster.source_breakdown.shopify} />}
                      {cluster.source_breakdown.trustpilot > 0 && <SourcePill source="trustpilot" count={cluster.source_breakdown.trustpilot} />}
                      {cluster.source_breakdown.googleplay > 0 && <SourcePill source="googleplay" count={cluster.source_breakdown.googleplay} />}
                      {cluster.source_breakdown.googleanalytics > 0 && <SourcePill source="googleanalytics" count={cluster.source_breakdown.googleanalytics} />}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2.5 h-auto px-2.5 py-[3px] text-[0.7rem] opacity-70"
                      onClick={(e) => { e.stopPropagation(); setDistributeCluster(cluster); }}
                    >
                      📡 Distribute
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
