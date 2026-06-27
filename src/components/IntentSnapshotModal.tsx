"use client";
import { useState, useEffect } from "react";
import { Copy, Download, Loader2, Mail, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "./ui/Modal";
import { SeverityBadge } from "./ui/SignalBadges";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
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
  const t = useTranslations("intentSnapshot");
  const locale = useLocale() as Locale;
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
      body: JSON.stringify({ clusterId, locale }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Snapshot request failed");
        return body;
      })
      .then((d) => {
        if (!cancelled) setSnapshotState({ clusterId, snapshot: d.snapshot, failed: false });
      })
      .catch(() => {
        if (!cancelled) setSnapshotState({ clusterId, snapshot: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [open, clusterId, locale]);

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
    const md = `# ${cluster.title}\n\n**${t("priority")}:** ${cluster.severity_label}\n**${t("evidence")}:** ${t("customerSignals", { n: cluster.evidence_count })}\n\n## ${t("problemStatement")}\n${snapshot.problem_statement}\n\n## ${t("businessCase")}\n${cluster.business_case}\n\n## ${t("recommendedSolution")}\n${snapshot.recommended_solution}\n\n## ${t("acceptanceCriteria")}\n${snapshot.acceptance_criteria.map((c) => `- ${c}`).join("\n")}\n\n## ${t("successMetrics")}\n${snapshot.success_metrics.map((m) => `- ${m}`).join("\n")}\n\n## ${t("effortEstimate")}\n${snapshot.effort_estimate}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cluster.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
  };

  const copyMarkdown = () => {
    if (!cluster || !snapshot) return;
    const md = `# ${cluster.title}\n\n${snapshot.problem_statement}\n\n${t("action")}: ${snapshot.recommended_solution}`;
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
      <div className="p-6 md:p-9">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("title")}</span>
              <SeverityBadge severity={cluster.severity_label} />
            </div>
            <h2 className="text-[1.3rem] font-bold text-foreground">{cluster.title}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>×</Button>
        </div>

        {/* Meta row */}
        <div className="mb-6 flex flex-wrap gap-6 border-y border-border py-4">
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">{t("evidence")}</div>
            <div className="text-[0.9rem] font-semibold text-foreground">
              {t("customerSignals", { n: cluster.evidence_count })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">{t("sources")}</div>
            <div className="text-[0.9rem] font-semibold text-foreground">
              {Object.entries(cluster.source_breakdown ?? {})
                .filter(([, v]) => (v as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
                .join(" · ") || t("noSources")}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-[60px] text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-[var(--accent-green)]" />
            <p className="text-[0.875rem] text-muted-foreground">{t("generating")}</p>
          </div>
        ) : snapshot ? (
          <div className="flex flex-col gap-6">
            {/* Problem Statement */}
            <div>
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("problemStatement")}</h4>
              <p className="text-[0.95rem] leading-[1.6] text-foreground">{snapshot.problem_statement}</p>
            </div>

            {/* Recommended Solution */}
            <div className="rounded-[12px] border border-border bg-muted/50 p-5">
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("recommendedSolution")}</h4>
              <p className="text-[0.95rem] leading-[1.6] text-foreground">{snapshot.recommended_solution}</p>
            </div>

            {/* Two columns */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-border bg-muted/40 p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("acceptanceCriteria")}</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.acceptance_criteria.map((c, i) => (
                    <li key={i} className="text-[0.8rem] leading-[1.5] text-foreground">{c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[12px] border border-border bg-muted/40 p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("successMetrics")}</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.success_metrics.map((m, i) => (
                    <li key={i} className="text-[0.8rem] leading-[1.5] text-foreground">{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Effort + Quote */}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1 rounded-[12px] border border-border bg-muted/40 px-5 py-4">
                <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-primary">{t("effortEstimate")}</div>
                <div className="font-semibold text-foreground">{snapshot.effort_estimate}</div>
              </div>
              {cluster.customer_quote && (
                <div className="min-w-[200px] flex-[2] rounded-[12px] border border-border bg-muted/40 px-5 py-4">
                  <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("customerVoice")}</div>
                  <blockquote className="border-l-[3px] border-primary pl-3 text-[0.875rem] italic leading-[1.5] text-foreground">
                    &quot;{cluster.customer_quote}&quot;
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        ) : failed ? (
          <div className="py-10 text-center text-muted-foreground">{t("failed")}</div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">{t("empty")}</div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-2.5 border-t border-border pt-6">
          <Button variant="outline" onClick={shareToWhatsApp} disabled={sharing === "whatsapp"}>
            <MessageCircle data-icon="inline-start" />
            {sharing === "whatsapp" ? t("sending") : t("whatsappAlert")}
          </Button>
          <Button variant="outline" onClick={shareToEmail} disabled={sharing === "email"}>
            <Mail data-icon="inline-start" />
            {sharing === "email" ? t("sending") : t("emailBrief")}
          </Button>
          <Button variant="outline" onClick={exportMarkdown}>
            <Download data-icon="inline-start" />
            {t("exportMarkdown")}
          </Button>
          <Button variant="outline" onClick={copyMarkdown}>
            <Copy data-icon="inline-start" />
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
