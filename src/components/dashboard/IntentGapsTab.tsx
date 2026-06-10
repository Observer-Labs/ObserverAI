"use client";
import { useState } from "react";
import { SeverityBadge, ConfidenceBar, SourcePill } from "@/components/ui/Badge";
import type { Cluster } from "@/lib/types";

interface IntentGapsTabProps {
  clusters: Cluster[];
  onOpenSnapshot: (cluster: Cluster) => void;
}

export function IntentGapsTab({ clusters, onOpenSnapshot }: IntentGapsTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [distributing, setDistributing] = useState<string | null>(null);

  const filtered = filterSeverity === "all" ? clusters : clusters.filter((c) => c.severity_label === filterSeverity);

  const distribute = async (cluster: Cluster, channel: "slack" | "whatsapp" | "email") => {
    setDistributing(`${cluster.id}-${channel}`);
    await fetch(`/api/distribute/${channel}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterId: cluster.id }),
    });
    setDistributing(null);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "high", "medium", "low"].map((sev) => (
            <button
              key={sev}
              className={`pill-tab ${filterSeverity === sev ? "active" : ""}`}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
          {filtered.length} gap{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Gap Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔍</div>
            <p style={{ color: "var(--muted)" }}>No intent gaps detected yet. Run analysis to find gaps.</p>
          </div>
        ) : filtered.map((cluster) => (
          <div key={cluster.id} className="obs-card" style={{ overflow: "hidden" }}>
            {/* Card Header */}
            <div
              style={{ padding: "20px 24px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16 }}
              onClick={() => setExpanded(expanded === cluster.id ? null : cluster.id)}
            >
              {/* Severity indicator */}
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: cluster.severity >= 70 ? "var(--danger)" : cluster.severity >= 40 ? "var(--warning)" : "var(--accent-green)", flexShrink: 0 }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <SeverityBadge severity={cluster.severity_label} />
                      <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Severity {cluster.severity}/100</span>
                    </div>
                    <h3 style={{ color: "white", fontWeight: 600, fontSize: "1rem", margin: 0, lineHeight: 1.4 }}>{cluster.title}</h3>
                  </div>
                  <div style={{ flexShrink: 0, color: "var(--muted)", fontSize: "1.2rem" }}>
                    {expanded === cluster.id ? "↑" : "↓"}
                  </div>
                </div>

                <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 14px" }}>
                  {cluster.business_case}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <ConfidenceBar value={cluster.confidence} className="w-32" />
                  <div style={{ display: "flex", gap: 6 }}>
                    {cluster.source_breakdown.slack > 0 && <SourcePill source="slack" count={cluster.source_breakdown.slack} />}
                    {cluster.source_breakdown.email > 0 && <SourcePill source="email" count={cluster.source_breakdown.email} />}
                    {cluster.source_breakdown.whatsapp > 0 && <SourcePill source="whatsapp" count={cluster.source_breakdown.whatsapp} />}
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{cluster.evidence_count} signals</span>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {expanded === cluster.id && (
              <div style={{ padding: "0 24px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20, animation: "slideUp 0.2s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  {/* Recommended action */}
                  <div style={{ padding: 16, borderRadius: 12, background: "rgba(70,230,166,0.06)", border: "1px solid rgba(70,230,166,0.15)" }}>
                    <div style={{ color: "var(--accent-green)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Recommended Action</div>
                    <p style={{ color: "white", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>{cluster.recommended_action}</p>
                  </div>

                  {/* Customer Quote */}
                  {cluster.customer_quote && (
                    <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Customer Voice</div>
                      <blockquote style={{ margin: 0, borderLeft: "3px solid var(--accent-green)", paddingLeft: 12, color: "var(--muted)", fontStyle: "italic", fontSize: "0.8rem", lineHeight: 1.6 }}>
                        &quot;{cluster.customer_quote}&quot;
                      </blockquote>
                    </div>
                  )}
                </div>

                {/* Source breakdown */}
                <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flex: 1, minWidth: 120 }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: 4 }}>⚡ Slack</div>
                    <div style={{ color: "white", fontWeight: 600 }}>{cluster.source_breakdown.slack} signals</div>
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flex: 1, minWidth: 120 }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: 4 }}>✉️ Email</div>
                    <div style={{ color: "white", fontWeight: 600 }}>{cluster.source_breakdown.email} signals</div>
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flex: 1, minWidth: 120 }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: 4 }}>💬 WhatsApp</div>
                    <div style={{ color: "white", fontWeight: 600 }}>{cluster.source_breakdown.whatsapp} signals</div>
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flex: 1, minWidth: 120 }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem", marginBottom: 4 }}>📊 Confidence</div>
                    <div style={{ color: "white", fontWeight: 600 }}>{Math.round(cluster.confidence * 100)}%</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={() => onOpenSnapshot(cluster)}>
                    Generate Spec
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => distribute(cluster, "slack")}
                    disabled={distributing === `${cluster.id}-slack`}
                  >
                    {distributing === `${cluster.id}-slack` ? "Sending..." : "⚡ Slack"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => distribute(cluster, "whatsapp")}
                    disabled={distributing === `${cluster.id}-whatsapp`}
                  >
                    {distributing === `${cluster.id}-whatsapp` ? "Sending..." : "💬 WhatsApp"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => distribute(cluster, "email")}
                    disabled={distributing === `${cluster.id}-email`}
                  >
                    {distributing === `${cluster.id}-email` ? "Sending..." : "✉️ Email"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
