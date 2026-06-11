"use client";
import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { SeverityBadge, ConfidenceBar } from "./ui/SignalBadges";
import type { Cluster } from "@/lib/types";

interface IntentSnapshotModalProps {
  cluster: Cluster | null;
  open: boolean;
  onClose: () => void;
}

interface Snapshot {
  problem_statement: string;
  recommended_solution: string;
  acceptance_criteria: string[];
  success_metrics: string[];
  effort_estimate: string;
}

interface SnapshotState {
  clusterId: string;
  snapshot: Snapshot | null;
  failed: boolean;
}

export function IntentSnapshotModal({ cluster, open, onClose }: IntentSnapshotModalProps) {
  const [snapshotState, setSnapshotState] = useState<SnapshotState | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const clusterId = cluster?.id;

  useEffect(() => {
    if (!open || !clusterId) return;
    let cancelled = false;

    fetch("/api/intent-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSnapshotState({ clusterId, snapshot: d.snapshot, failed: false });
      })
      .catch(() => {
        if (!cancelled) setSnapshotState({ clusterId, snapshot: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [open, clusterId]);

  const shareToSlack = async () => {
    if (!cluster) return;
    setSharing("slack");
    await fetch("/api/distribute/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId: cluster.id }),
    });
    setSharing(null);
  };

  const shareToWhatsApp = async () => {
    if (!cluster) return;
    setSharing("whatsapp");
    await fetch("/api/distribute/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId: cluster.id }),
    });
    setSharing(null);
  };

  const shareToEmail = async () => {
    if (!cluster) return;
    setSharing("email");
    await fetch("/api/distribute/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterIds: [cluster.id] }),
    });
    setSharing(null);
  };

  const exportMarkdown = () => {
    if (!cluster || !snapshot) return;
    const md = `# ${cluster.title}\n\n**Severity:** ${cluster.severity_label} (${cluster.severity}/100)\n**Confidence:** ${Math.round(cluster.confidence * 100)}%\n**Evidence:** ${cluster.evidence_count} signals\n\n## Problem Statement\n${snapshot.problem_statement}\n\n## Business Case\n${cluster.business_case}\n\n## Recommended Solution\n${snapshot.recommended_solution}\n\n## Acceptance Criteria\n${snapshot.acceptance_criteria.map((c) => `- ${c}`).join("\n")}\n\n## Success Metrics\n${snapshot.success_metrics.map((m) => `- ${m}`).join("\n")}\n\n## Effort Estimate\n${snapshot.effort_estimate}\n\n## Customer Quote\n> "${cluster.customer_quote}"\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cluster.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
  };

  const copyMarkdown = () => {
    if (!cluster || !snapshot) return;
    const md = `# ${cluster.title}\n\n${snapshot.problem_statement}\n\nAction: ${snapshot.recommended_solution}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!cluster) return null;
  const currentSnapshotState = snapshotState?.clusterId === clusterId ? snapshotState : null;
  const snapshot = currentSnapshotState?.snapshot ?? null;
  const failed = currentSnapshotState?.failed ?? false;
  const loading = open && !snapshot && !failed;

  return (
    <Modal open={open} onClose={onClose} maxWidth="760px">
      <div style={{ padding: 36 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "var(--accent-violet)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Intent Snapshot</span>
              <SeverityBadge severity={cluster.severity_label} />
            </div>
            <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.3rem", margin: 0 }}>{cluster.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.4rem", padding: "0 0 0 16px" }}>×</button>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Confidence</div>
            <ConfidenceBar value={cluster.confidence} className="" />
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Evidence</div>
            <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}>{cluster.evidence_count} signals</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Sources</div>
            <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}>
              {Object.entries(cluster.source_breakdown ?? {})
                .filter(([, v]) => (v as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
                .join(" · ") || "No source breakdown"}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(70,230,166,0.2)", borderTopColor: "var(--accent-green)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Generating intent snapshot with Claude...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : snapshot ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Problem Statement */}
            <div>
              <h4 style={{ color: "var(--accent-green)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Problem Statement</h4>
              <p style={{ color: "white", lineHeight: 1.6, margin: 0, fontSize: "0.95rem" }}>{snapshot.problem_statement}</p>
            </div>

            {/* Recommended Solution */}
            <div style={{ padding: 20, borderRadius: 12, background: "rgba(70,230,166,0.06)", border: "1px solid rgba(70,230,166,0.15)" }}>
              <h4 style={{ color: "var(--accent-green)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Recommended Solution</h4>
              <p style={{ color: "white", lineHeight: 1.6, margin: 0, fontSize: "0.95rem" }}>{snapshot.recommended_solution}</p>
            </div>

            {/* Two columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(110,168,255,0.06)", border: "1px solid rgba(110,168,255,0.15)" }}>
                <h4 style={{ color: "var(--accent-blue)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Acceptance Criteria</h4>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {snapshot.acceptance_criteria.map((c, i) => (
                    <li key={i} style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{c}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <h4 style={{ color: "var(--accent-violet)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Success Metrics</h4>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {snapshot.success_metrics.map((m, i) => (
                    <li key={i} style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Effort + Quote */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, padding: "16px 20px", borderRadius: 12, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.2)" }}>
                <div style={{ color: "var(--warning)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>Effort Estimate</div>
                <div style={{ color: "white", fontWeight: 600 }}>{snapshot.effort_estimate}</div>
              </div>
              {cluster.customer_quote && (
                <div style={{ flex: 2, minWidth: 200, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>Customer Voice</div>
                  <blockquote style={{ margin: 0, color: "white", fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.5, borderLeft: "3px solid var(--accent-green)", paddingLeft: 12 }}>
                    &quot;{cluster.customer_quote}&quot;
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        ) : failed ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Failed to generate snapshot. Try again.</div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>No snapshot available.</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button className="btn-ghost" onClick={shareToSlack} disabled={sharing === "slack"} style={{ opacity: sharing === "slack" ? 0.5 : 1 }}>
            {sharing === "slack" ? "Sending..." : "⚡ Share to Slack"}
          </button>
          <button className="btn-ghost" onClick={shareToWhatsApp} disabled={sharing === "whatsapp"} style={{ borderColor: "rgba(70,230,166,0.3)", opacity: sharing === "whatsapp" ? 0.5 : 1 }}>
            {sharing === "whatsapp" ? "Sending..." : "💬 WhatsApp Alert"}
          </button>
          <button className="btn-ghost" onClick={shareToEmail} disabled={sharing === "email"} style={{ borderColor: "rgba(110,168,255,0.3)", color: "var(--accent-blue)", opacity: sharing === "email" ? 0.5 : 1 }}>
            {sharing === "email" ? "Sending..." : "✉️ Email Brief"}
          </button>
          <button className="btn-ghost" onClick={exportMarkdown} style={{ borderColor: "rgba(167,139,250,0.3)", color: "var(--accent-violet)" }}>
            ↓ Export as Markdown
          </button>
          <button className="btn-ghost" onClick={copyMarkdown} style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--muted)" }}>
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
