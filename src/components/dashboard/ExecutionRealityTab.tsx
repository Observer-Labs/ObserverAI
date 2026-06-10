"use client";
import { useState, useEffect } from "react";
import type { Cluster, SprintItem } from "@/lib/types";

// Fallback mock sprint data, shown when Jira is not connected
const MOCK_SPRINT_ITEMS: SprintItem[] = [
  { id: "1", title: "Performance optimization for dashboard", category: "Infrastructure", priority: "P1" },
  { id: "2", title: "Redesign settings page", category: "UX", priority: "P2" },
  { id: "3", title: "Add CSV export to reports", category: "Features", priority: "P2" },
  { id: "4", title: "Fix authentication edge cases", category: "Bugs", priority: "P1" },
  { id: "5", title: "Improve onboarding flow", category: "Growth", priority: "P3" },
];

interface ExecutionRealityTabProps {
  clusters: Cluster[];
  onOpenSnapshot: (cluster: Cluster) => void;
}

export function ExecutionRealityTab({ clusters, onOpenSnapshot }: ExecutionRealityTabProps) {
  const [sprintItems, setSprintItems] = useState<SprintItem[]>(MOCK_SPRINT_ITEMS);
  const [jiraLive, setJiraLive] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(true);

  useEffect(() => {
    const fetchSprint = async () => {
      try {
        const res = await fetch("/api/ingest/jira?type=sprint");
        if (!res.ok) { setJiraLoading(false); return; }
        const data = await res.json();
        if (data.sprintItems && data.sprintItems.length > 0) {
          setSprintItems(data.sprintItems);
          setJiraLive(true);
        }
      } catch {
        // Silently fall back to mock data
      } finally {
        setJiraLoading(false);
      }
    };
    fetchSprint();
  }, []);

  const getAlignmentScore = (cluster: Cluster) => {
    const clusterWords = cluster.title.toLowerCase().split(" ");
    const sprintWords = sprintItems.flatMap((s) => s.title.toLowerCase().split(" "));
    const overlap = clusterWords.filter((w) => w.length > 4 && sprintWords.includes(w));
    return Math.min(100, overlap.length * 20);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Customer Demand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-green)" }} />
            <h3 style={{ color: "white", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>Customer Demand</h3>
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>What customers are asking for</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clusters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: "0.875rem" }}>No signals analyzed yet</div>
            ) : clusters.slice(0, 8).map((cluster) => {
              const alignment = getAlignmentScore(cluster);
              return (
                <div
                  key={cluster.id}
                  className="obs-card"
                  style={{ padding: 16, cursor: "pointer" }}
                  onClick={() => onOpenSnapshot(cluster)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ color: "white", fontSize: "0.875rem", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{cluster.title}</span>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.7rem", color: cluster.severity >= 70 ? "var(--danger)" : cluster.severity >= 40 ? "var(--warning)" : "var(--accent-green)", background: cluster.severity >= 70 ? "rgba(255,92,122,0.15)" : cluster.severity >= 40 ? "rgba(255,209,102,0.15)" : "rgba(70,230,166,0.12)", padding: "2px 8px", borderRadius: 9999, fontWeight: 600 }}>
                        {cluster.severity}/100
                      </span>
                    </div>
                  </div>

                  {/* Gap visualization */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Sprint alignment</span>
                      <span style={{ color: alignment < 30 ? "var(--danger)" : alignment < 60 ? "var(--warning)" : "var(--accent-green)", fontSize: "0.7rem", fontWeight: 600 }}>{alignment}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${alignment}%`, borderRadius: 3, background: alignment < 30 ? "var(--danger)" : alignment < 60 ? "var(--warning)" : "var(--accent-green)", transition: "width 0.6s ease" }} />
                    </div>
                  </div>

                  <p style={{ color: "var(--muted)", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>
                    {cluster.evidence_count} signals · {cluster.source_breakdown.slack} Slack · {cluster.source_breakdown.email} Email
                    {cluster.source_breakdown.zendesk > 0 && ` · ${cluster.source_breakdown.zendesk} Zendesk`}
                    {cluster.source_breakdown.github > 0 && ` · ${cluster.source_breakdown.github} GitHub`}
                    {cluster.source_breakdown.jira > 0 && ` · ${cluster.source_breakdown.jira} Jira`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Sprint */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-blue)" }} />
            <h3 style={{ color: "white", fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>Current Sprint</h3>
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>What the team is building</span>
            {/* Live / Connect badge */}
            {jiraLoading ? (
              <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--muted)" }}>Loading…</span>
            ) : jiraLive ? (
              <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--accent-green)", background: "rgba(70,230,166,0.1)", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(70,230,166,0.2)", fontWeight: 600 }}>📋 Live from Jira ✓</span>
            ) : (
              <a href="/settings/integrations" style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--accent-blue)", textDecoration: "none", whiteSpace: "nowrap" }}>Connect Jira →</a>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sprintItems.map((item) => {
              const hasDemand = clusters.some((c) => {
                const cWords = c.title.toLowerCase().split(" ");
                const iWords = item.title.toLowerCase().split(" ");
                return cWords.some((w) => w.length > 4 && iWords.includes(w));
              });
              return (
                <div key={item.id} className="obs-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ color: "white", fontSize: "0.875rem", fontWeight: 500, flex: 1 }}>{item.title}</span>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {item.priority && (
                        <span style={{ fontSize: "0.7rem", color: "var(--accent-blue)", background: "rgba(110,168,255,0.1)", padding: "2px 8px", borderRadius: 9999 }}>{item.priority}</span>
                      )}
                      {item.category && (
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 9999 }}>{item.category}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasDemand ? "var(--accent-green)" : "var(--danger)", flexShrink: 0 }} />
                    <span style={{ color: hasDemand ? "var(--accent-green)" : "var(--danger)", fontSize: "0.75rem" }}>
                      {hasDemand ? "Customer demand validated" : "No customer signal found"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Misalignment warning */}
          {clusters.length > 0 && (
            <div style={{ marginTop: 20, padding: 20, borderRadius: 12, background: "rgba(255,92,122,0.06)", border: "1px solid rgba(255,92,122,0.2)" }}>
              <h4 style={{ color: "var(--danger)", fontWeight: 600, fontSize: "0.875rem", marginBottom: 8 }}>⚠️ Execution Gap</h4>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5, margin: 0 }}>
                {clusters.filter((c) => getAlignmentScore(c) < 30).length} high-severity customer demands have no sprint coverage. Consider prioritizing: <strong style={{ color: "white" }}>{clusters[0]?.title}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
