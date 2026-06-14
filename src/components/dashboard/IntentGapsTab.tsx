"use client";
import { useState } from "react";
import { SeverityBadge, ConfidenceBar, SourcePill } from "@/components/ui/SignalBadges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "high", "medium", "low"].map((sev) => (
            <button
              key={sev}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-[7px] border px-3.5 py-1.5 text-[0.875rem] font-medium transition-all duration-[0.12s]",
                filterSeverity === sev
                  ? "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.1)] text-foreground"
                  : "border-transparent bg-transparent text-[var(--muted-light)] hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground"
              )}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-[0.75rem] text-muted-foreground">
          {filtered.length} gap{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Gap Cards */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-[3rem]">🔍</div>
            <p className="text-muted-foreground">No intent gaps detected yet. Run analysis to find gaps.</p>
          </div>
        ) : filtered.map((cluster) => (
          <div key={cluster.id} className="overflow-hidden rounded-[14px] border bg-card shadow-sm">
            {/* Card Header */}
            <div
              className="flex cursor-pointer items-start gap-4 px-6 py-5"
              onClick={() => setExpanded(expanded === cluster.id ? null : cluster.id)}
            >
              {/* Severity indicator */}
              <div
                className={cn(
                  "w-1 shrink-0 self-stretch rounded-[2px]",
                  cluster.severity >= 70 ? "bg-destructive" : cluster.severity >= 40 ? "bg-[var(--warning)]" : "bg-[var(--accent-green)]"
                )}
              />

              <div className="flex-1">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <SeverityBadge severity={cluster.severity_label} />
                      <span className="text-[0.7rem] text-muted-foreground">Severity {cluster.severity}/100</span>
                    </div>
                    <h3 className="text-[1rem] font-semibold leading-[1.4] text-white">{cluster.title}</h3>
                  </div>
                  <div className="shrink-0 text-[1.2rem] text-muted-foreground">
                    {expanded === cluster.id ? "↑" : "↓"}
                  </div>
                </div>

                <p className="mb-3.5 text-[0.875rem] leading-[1.5] text-muted-foreground">
                  {cluster.business_case}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <ConfidenceBar value={cluster.confidence} className="w-32" />
                  <div className="flex gap-1.5">
                    {cluster.source_breakdown.slack > 0 && <SourcePill source="slack" count={cluster.source_breakdown.slack} />}
                    {cluster.source_breakdown.email > 0 && <SourcePill source="email" count={cluster.source_breakdown.email} />}
                    {cluster.source_breakdown.whatsapp > 0 && <SourcePill source="whatsapp" count={cluster.source_breakdown.whatsapp} />}
                  </div>
                  <span className="text-[0.75rem] text-muted-foreground">{cluster.evidence_count} signals</span>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {expanded === cluster.id && (
              <div className="animate-[slideUp_0.2s_ease] border-t border-[rgba(255,255,255,0.08)] px-6 pb-6 pt-5">
                <div className="mb-5 grid grid-cols-2 gap-5">
                  {/* Recommended action */}
                  <div className="rounded-[12px] border border-[rgba(70,230,166,0.15)] bg-[rgba(70,230,166,0.06)] p-4">
                    <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-green)]">Recommended Action</div>
                    <p className="text-[0.875rem] leading-[1.5] text-white">{cluster.recommended_action}</p>
                  </div>

                  {/* Customer Quote */}
                  {cluster.customer_quote && (
                    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Customer Voice</div>
                      <blockquote className="border-l-[3px] border-l-[var(--accent-green)] pl-3 text-[0.8rem] italic leading-[1.6] text-muted-foreground">
                        &quot;{cluster.customer_quote}&quot;
                      </blockquote>
                    </div>
                  )}
                </div>

                {/* Source breakdown */}
                <div className="mb-5 flex flex-wrap gap-4">
                  <div className="min-w-[120px] flex-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                    <div className="mb-1 text-[0.7rem] text-muted-foreground">⚡ Slack</div>
                    <div className="font-semibold text-white">{cluster.source_breakdown.slack} signals</div>
                  </div>
                  <div className="min-w-[120px] flex-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                    <div className="mb-1 text-[0.7rem] text-muted-foreground">✉️ Email</div>
                    <div className="font-semibold text-white">{cluster.source_breakdown.email} signals</div>
                  </div>
                  <div className="min-w-[120px] flex-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                    <div className="mb-1 text-[0.7rem] text-muted-foreground">💬 WhatsApp</div>
                    <div className="font-semibold text-white">{cluster.source_breakdown.whatsapp} signals</div>
                  </div>
                  <div className="min-w-[120px] flex-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                    <div className="mb-1 text-[0.7rem] text-muted-foreground">📊 Confidence</div>
                    <div className="font-semibold text-white">{Math.round(cluster.confidence * 100)}%</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={() => onOpenSnapshot(cluster)}>
                    Generate Spec
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => distribute(cluster, "slack")}
                    disabled={distributing === `${cluster.id}-slack`}
                  >
                    {distributing === `${cluster.id}-slack` ? "Sending..." : "⚡ Slack"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => distribute(cluster, "whatsapp")}
                    disabled={distributing === `${cluster.id}-whatsapp`}
                  >
                    {distributing === `${cluster.id}-whatsapp` ? "Sending..." : "💬 WhatsApp"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => distribute(cluster, "email")}
                    disabled={distributing === `${cluster.id}-email`}
                  >
                    {distributing === `${cluster.id}-email` ? "Sending..." : "✉️ Email"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
