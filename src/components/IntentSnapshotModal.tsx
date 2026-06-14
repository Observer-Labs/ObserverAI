"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "./ui/Modal";
import { SeverityBadge, ConfidenceBar } from "./ui/SignalBadges";
import { Button } from "@/components/ui/button";
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
      <div className="p-9">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-violet)]">Intent Snapshot</span>
              <SeverityBadge severity={cluster.severity_label} />
            </div>
            <h2 className="text-[1.3rem] font-bold text-white">{cluster.title}</h2>
          </div>
          <button onClick={onClose} className="cursor-pointer border-0 bg-transparent pl-4 text-[1.4rem] text-muted-foreground">×</button>
        </div>

        {/* Meta row */}
        <div className="mb-6 flex flex-wrap gap-6 border-y border-[rgba(255,255,255,0.08)] py-4">
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Confidence</div>
            <ConfidenceBar value={cluster.confidence} className="" />
          </div>
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Evidence</div>
            <div className="text-[0.9rem] font-semibold text-white">{cluster.evidence_count} signals</div>
          </div>
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Sources</div>
            <div className="text-[0.9rem] font-semibold text-white">
              {Object.entries(cluster.source_breakdown ?? {})
                .filter(([, v]) => (v as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
                .join(" · ") || "No source breakdown"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-[60px] text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-[var(--accent-green)]" />
            <p className="text-[0.875rem] text-muted-foreground">Generating intent snapshot with Claude...</p>
          </div>
        ) : snapshot ? (
          <div className="flex flex-col gap-6">
            {/* Problem Statement */}
            <div>
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-green)]">Problem Statement</h4>
              <p className="text-[0.95rem] leading-[1.6] text-white">{snapshot.problem_statement}</p>
            </div>

            {/* Recommended Solution */}
            <div className="rounded-[12px] border border-[rgba(70,230,166,0.15)] bg-[rgba(70,230,166,0.06)] p-5">
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-green)]">Recommended Solution</h4>
              <p className="text-[0.95rem] leading-[1.6] text-white">{snapshot.recommended_solution}</p>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[12px] border border-[rgba(110,168,255,0.15)] bg-[rgba(110,168,255,0.06)] p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-blue)]">Acceptance Criteria</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.acceptance_criteria.map((c, i) => (
                    <li key={i} className="text-[0.8rem] leading-[1.5] text-muted-foreground">{c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[12px] border border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.06)] p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-violet)]">Success Metrics</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.success_metrics.map((m, i) => (
                    <li key={i} className="text-[0.8rem] leading-[1.5] text-muted-foreground">{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Effort + Quote */}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1 rounded-[12px] border border-[rgba(255,209,102,0.2)] bg-[rgba(255,209,102,0.06)] px-5 py-4">
                <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">Effort Estimate</div>
                <div className="font-semibold text-white">{snapshot.effort_estimate}</div>
              </div>
              {cluster.customer_quote && (
                <div className="min-w-[200px] flex-[2] rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-4">
                  <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Customer Voice</div>
                  <blockquote className="border-l-[3px] border-l-[var(--accent-green)] pl-3 text-[0.875rem] italic leading-[1.5] text-white">
                    &quot;{cluster.customer_quote}&quot;
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        ) : failed ? (
          <div className="py-10 text-center text-muted-foreground">Failed to generate snapshot. Try again.</div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">No snapshot available.</div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-2.5 border-t border-[rgba(255,255,255,0.08)] pt-6">
          <Button variant="ghost" onClick={shareToSlack} disabled={sharing === "slack"} className="border">
            {sharing === "slack" ? "Sending..." : "⚡ Share to Slack"}
          </Button>
          <Button variant="ghost" onClick={shareToWhatsApp} disabled={sharing === "whatsapp"} className="border border-[rgba(70,230,166,0.3)]">
            {sharing === "whatsapp" ? "Sending..." : "💬 WhatsApp Alert"}
          </Button>
          <Button variant="ghost" onClick={shareToEmail} disabled={sharing === "email"} className="border border-[rgba(110,168,255,0.3)] text-[var(--accent-blue)]">
            {sharing === "email" ? "Sending..." : "✉️ Email Brief"}
          </Button>
          <Button variant="ghost" onClick={exportMarkdown} className="border border-[rgba(167,139,250,0.3)] text-[var(--accent-violet)]">
            ↓ Export as Markdown
          </Button>
          <Button variant="ghost" onClick={copyMarkdown} className="border border-[rgba(255,255,255,0.15)] text-muted-foreground">
            {copied ? "✓ Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
