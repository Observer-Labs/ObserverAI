"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeverityBadge, ConfidenceBar, SourcePill } from "@/components/ui/Badge";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Welcome banner */}
      <div className="obs-card" style={{ padding: 36, textAlign: "center", background: "linear-gradient(135deg, rgba(70,230,166,0.05), rgba(110,168,255,0.05))" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>👋</div>
        <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.5rem", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          Welcome to Observer
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 32px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          Connect your first signal source to start detecting Intent Gaps, the gaps between what customers want and what you&apos;re building.
        </p>

        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
          {steps.map((step, i) => (
            <div key={step.n} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: step.done ? "var(--accent-green)" : i === 0 ? "rgba(70,230,166,0.15)" : "rgba(255,255,255,0.06)",
                  border: `2px solid ${step.done ? "var(--accent-green)" : i === 0 ? "rgba(70,230,166,0.4)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: step.done ? "#0b0c10" : i === 0 ? "var(--accent-green)" : "var(--muted)",
                  fontWeight: 700, fontSize: "0.85rem",
                }}>
                  {step.done ? "✓" : step.n}
                </div>
                <span style={{ color: i === 0 ? "white" : "var(--muted)", fontSize: "0.75rem", fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap" }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 80, height: 1, background: "rgba(255,255,255,0.08)", margin: "0 8px", marginBottom: 28 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-primary" onClick={() => router.push("/connect")} style={{ fontSize: "0.9rem", padding: "10px 24px" }}>
            → Connect first source
          </button>
          <button className="btn-secondary" onClick={onRunAnalysis} disabled={analyzing} style={{ fontSize: "0.9rem", padding: "10px 24px" }}>
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Quickstart cards */}
      <div>
        <p style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Quickstart, pick your first source</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {quickstarts.map((qs) => (
            <button
              key={qs.name}
              onClick={() => router.push(qs.href)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${qs.color}25`,
                borderRadius: 12,
                padding: "18px 20px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, background 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${qs.color}60`; (e.currentTarget as HTMLElement).style.background = `${qs.color}08`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${qs.color}25`; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${qs.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                {qs.icon}
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>{qs.name}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{qs.desc}</div>
              </div>
              <div style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.8rem" }}>→</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={() => router.push("/settings/integrations")} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>
          ⚙️ All Integrations
        </button>
        <button className="btn-secondary" onClick={() => router.push("/connect")} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>
          🔌 Connect Wizard
        </button>
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="obs-card" style={{ width: "100%", maxWidth: 440, padding: 28, position: "relative" }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
        >
          ×
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: "var(--accent-green)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
            📡 Distribute Brief
          </div>
          <h3 style={{ color: "white", fontWeight: 700, fontSize: "1.05rem", margin: 0, lineHeight: 1.3 }}>
            {cluster.title}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "8px 0 0" }}>
            Select channels to distribute this insight brief to your team.
          </p>
        </div>

        {!done ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {channelConfig.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => toggle(ch.key)}
                  style={{
                    background: channels[ch.key] ? `${ch.color}10` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${channels[ch.key] ? `${ch.color}40` : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10,
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: channels[ch.key] ? ch.color : "rgba(255,255,255,0.1)",
                    border: `1.5px solid ${channels[ch.key] ? ch.color : "rgba(255,255,255,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.15s",
                  }}>
                    {channels[ch.key] && <span style={{ color: "#0b0c10", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "1.1rem" }}>{ch.icon}</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>{ch.label}</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{ch.hint}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSend}
                disabled={sending || !Object.values(channels).some(Boolean)}
                style={{ flex: 2 }}
              >
                {sending ? "Sending..." : "Send Brief →"}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {channelConfig.map((ch) => {
                const res = results[ch.key];
                if (!channels[ch.key] || res === null) return null;
                return (
                  <div key={ch.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: res === "sent" ? "rgba(70,230,166,0.08)" : "rgba(255,92,122,0.08)", border: `1px solid ${res === "sent" ? "rgba(70,230,166,0.25)" : "rgba(255,92,122,0.25)"}` }}>
                    <span style={{ fontSize: "1.1rem" }}>{ch.icon}</span>
                    <span style={{ color: "white", fontWeight: 500, fontSize: "0.875rem", flex: 1 }}>{ch.label}</span>
                    <span style={{ color: res === "sent" ? "var(--accent-green)" : "var(--danger)", fontSize: "0.8rem", fontWeight: 600 }}>
                      {res === "sent" ? "✓ Sent" : "✗ Failed"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button className="btn-primary" onClick={onClose} style={{ width: "100%" }}>
              Done
            </button>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        <OnboardingState onRunAnalysis={onRunAnalysis} analyzing={analyzing} />
        {/* Right side: empty state */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ color: "white", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>Intent Gaps</h3>
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>0 detected</span>
          </div>
          <div style={{ textAlign: "center", padding: "48px 24px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</div>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* Left: Today's Headline + Slack Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Headline Card */}
          {topCluster ? (
            <div className="obs-card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ color: "var(--accent-green)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Today&apos;s Headline</span>
                <SeverityBadge severity={topCluster.severity_label} />
              </div>

              <h2 style={{ color: "white", fontSize: "1.3rem", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>
                {topCluster.title}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                {topCluster.business_case}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Confidence</div>
                  <ConfidenceBar value={topCluster.confidence} />
                </div>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Evidence</div>
                  <div style={{ color: "white", fontWeight: 600, fontSize: "1.1rem" }}>{topCluster.evidence_count}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>signals</div>
                </div>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Revenue Risk</div>
                  <div style={{ color: "var(--danger)", fontWeight: 600, fontSize: "1.1rem" }}>
                    {topCluster.severity >= 70 ? "High" : topCluster.severity >= 40 ? "Medium" : "Low"}
                  </div>
                </div>
              </div>

              {topCluster.projected_impact && (
                <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>💰</span>
                  <div>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>Projected Impact</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{topCluster.projected_impact}</div>
                  </div>
                </div>
              )}

              {topCluster.customer_quote && (
                <blockquote style={{ margin: "0 0 24px", borderLeft: "3px solid var(--accent-green)", paddingLeft: 16, color: "var(--muted)", fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  &ldquo;{topCluster.customer_quote}&rdquo;
                </blockquote>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={() => onOpenSnapshot(topCluster)}>
                  Intent Snapshot
                </button>
                <button className="btn-secondary" onClick={() => setDistributeCluster(topCluster)}>
                  📡 Distribute Brief
                </button>
              </div>
            </div>
          ) : (
            <div className="obs-card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📡</div>
              <h3 style={{ color: "white", marginBottom: 12 }}>No signals yet</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 24, lineHeight: 1.6 }}>
                Connect your Slack, Email, or WhatsApp to start ingesting signals,<br />then run analysis to detect Intent Gaps.
              </p>
              <button className="btn-primary" onClick={onRunAnalysis} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Run Analysis"}
              </button>
            </div>
          )}

          {/* Brief Preview Card */}
          {topCluster && (
            <div className="obs-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>Brief Preview</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>→ Slack / Email / WhatsApp</span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setDistributeCluster(topCluster)}
                  style={{ fontSize: "0.72rem", padding: "4px 12px" }}
                >
                  📡 Send
                </button>
              </div>
              <div className="slack-preview" style={{ padding: "16px 20px", borderRadius: "0 8px 8px 0" }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#46e6a6", fontWeight: 700 }}>Observer</span>
                  <span style={{ color: "#666", fontSize: "0.7rem", marginLeft: 8 }}>Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div style={{ color: "#e0e0e0", lineHeight: 1.6, fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {topCluster.severity >= 70 ? "🔴" : topCluster.severity >= 40 ? "🟡" : "🟢"} Intent Gap · {topCluster.severity_label.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{topCluster.title}</div>
                  <div style={{ color: "#9aa3b2", marginBottom: 10 }}>{topCluster.business_case}</div>
                  <div style={{ color: "#9aa3b2", marginBottom: 12, fontSize: "0.75rem" }}>
                    Evidence: {topCluster.evidence_count} signals · Confidence: {Math.round(topCluster.confidence * 100)}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="chip-action" onClick={() => onOpenSnapshot(topCluster)}>Intent Snapshot</button>
                  <button className="chip-action">Evidence</button>
                  <button className="chip-action">What closes the gap fastest?</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Intent Gaps list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ color: "white", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>Intent Gaps</h3>
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{clusters.length} detected</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clusters.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: "0.875rem" }}>
                Run analysis to detect gaps
              </div>
            )}
            {clusters.map((cluster, i) => (
              <div
                key={cluster.id}
                className="obs-card"
                style={{ padding: 16, cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => onOpenSnapshot(cluster)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(70,230,166,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(70,230,166,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-green)", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "white", fontWeight: 500, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cluster.title}</span>
                      <SeverityBadge severity={cluster.severity_label} className="flex-shrink-0" />
                    </div>
                    <ConfidenceBar value={cluster.confidence} />
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
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
                    <button
                      className="btn-secondary"
                      style={{ marginTop: 10, fontSize: "0.7rem", padding: "3px 10px", opacity: 0.7 }}
                      onClick={(e) => { e.stopPropagation(); setDistributeCluster(cluster); }}
                    >
                      📡 Distribute
                    </button>
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
