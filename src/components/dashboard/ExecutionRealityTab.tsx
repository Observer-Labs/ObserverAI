"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
      <div className="grid grid-cols-2 gap-6">
        {/* Customer Demand */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-[var(--accent-green)]" />
            <h3 className="text-[0.95rem] font-semibold text-white">Customer Demand</h3>
            <span className="text-[0.75rem] text-muted-foreground">What customers are asking for</span>
          </div>
          <div className="flex flex-col gap-3">
            {clusters.length === 0 ? (
              <div className="py-8 text-center text-[0.875rem] text-muted-foreground">No signals analyzed yet</div>
            ) : clusters.slice(0, 8).map((cluster) => {
              const alignment = getAlignmentScore(cluster);
              return (
                <div
                  key={cluster.id}
                  className="cursor-pointer rounded-[14px] border bg-card p-4 shadow-sm"
                  onClick={() => onOpenSnapshot(cluster)}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="mr-2 flex-1 truncate text-[0.875rem] font-medium text-white">{cluster.title}</span>
                    <div className="flex shrink-0 gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
                          cluster.severity >= 70
                            ? "bg-[rgba(255,92,122,0.15)] text-destructive"
                            : cluster.severity >= 40
                              ? "bg-[rgba(255,209,102,0.15)] text-[var(--warning)]"
                              : "bg-[rgba(70,230,166,0.12)] text-[var(--accent-green)]"
                        )}
                      >
                        {cluster.severity}/100
                      </span>
                    </div>
                  </div>

                  {/* Gap visualization */}
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between">
                      <span className="text-[0.7rem] text-muted-foreground">Sprint alignment</span>
                      <span
                        className={cn(
                          "text-[0.7rem] font-semibold",
                          alignment < 30 ? "text-destructive" : alignment < 60 ? "text-[var(--warning)]" : "text-[var(--accent-green)]"
                        )}
                      >
                        {alignment}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-[rgba(255,255,255,0.08)]">
                      <div
                        className={cn(
                          "h-full rounded-[3px] [transition:width_0.6s_ease]",
                          alignment < 30 ? "bg-destructive" : alignment < 60 ? "bg-[var(--warning)]" : "bg-[var(--accent-green)]"
                        )}
                        style={{ width: `${alignment}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[0.75rem] leading-[1.5] text-muted-foreground">
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
          <div className="mb-4 flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-[var(--accent-blue)]" />
            <h3 className="text-[0.95rem] font-semibold text-white">Current Sprint</h3>
            <span className="text-[0.75rem] text-muted-foreground">What the team is building</span>
            {/* Live / Connect badge */}
            {jiraLoading ? (
              <span className="ml-auto text-[0.68rem] text-muted-foreground">Loading…</span>
            ) : jiraLive ? (
              <span className="ml-auto rounded-full border border-[rgba(70,230,166,0.2)] bg-[rgba(70,230,166,0.1)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--accent-green)]">📋 Live from Jira ✓</span>
            ) : (
              <a href="/settings/integrations" className="ml-auto whitespace-nowrap text-[0.68rem] text-[var(--accent-blue)] no-underline">Connect Jira →</a>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {sprintItems.map((item) => {
              const hasDemand = clusters.some((c) => {
                const cWords = c.title.toLowerCase().split(" ");
                const iWords = item.title.toLowerCase().split(" ");
                return cWords.some((w) => w.length > 4 && iWords.includes(w));
              });
              return (
                <div key={item.id} className="rounded-[14px] border bg-card p-4 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="flex-1 text-[0.875rem] font-medium text-white">{item.title}</span>
                    <div className="flex shrink-0 gap-1.5">
                      {item.priority && (
                        <span className="rounded-full bg-[rgba(110,168,255,0.1)] px-2 py-0.5 text-[0.7rem] text-[var(--accent-blue)]">{item.priority}</span>
                      )}
                      {item.category && (
                        <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[0.7rem] text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("size-2 shrink-0 rounded-full", hasDemand ? "bg-[var(--accent-green)]" : "bg-destructive")} />
                    <span className={cn("text-[0.75rem]", hasDemand ? "text-[var(--accent-green)]" : "text-destructive")}>
                      {hasDemand ? "Customer demand validated" : "No customer signal found"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Misalignment warning */}
          {clusters.length > 0 && (
            <div className="mt-5 rounded-[12px] border border-[rgba(255,92,122,0.2)] bg-[rgba(255,92,122,0.06)] p-5">
              <h4 className="mb-2 text-[0.875rem] font-semibold text-destructive">⚠️ Execution Gap</h4>
              <p className="text-[0.8rem] leading-[1.5] text-muted-foreground">
                {clusters.filter((c) => getAlignmentScore(c) < 30).length} high-severity customer demands have no sprint coverage. Consider prioritizing: <strong className="text-white">{clusters[0]?.title}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
