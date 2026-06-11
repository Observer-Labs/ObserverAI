"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Cluster } from "@/lib/types";
import { ConfidenceBar, SeverityBadge } from "@/components/ui/SignalBadges";
import { Modal } from "@/components/ui/Modal";
import { LogoMark } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Demo clusters ─────────────────────────────────────────────────────────────

const TOTEFOLK_CLUSTERS: Cluster[] = [
  {
    id: "tf-1", workspace_id: "demo",
    title: "No restock alerts, sold-out buyers are leaving and never returning",
    severity: 85, severity_label: "high", confidence: 0.89, evidence_count: 38,
    source_breakdown: { email: 18, zendesk: 12, intercom: 8, reddit: 0, appstore: 0, googleplay: 0, googleanalytics: 0, slack: 0, whatsapp: 0, jira: 0, github: 0,
    shopify: 0, trustpilot: 0,
  },
    business_case: "Limited-edition model creates demand spikes, but sold-out pages have no capture mechanism. A waitlist flow could recover 30-40% of sold-out demand.",
    recommended_action: "Implement back-in-stock email notifications on all sold-out product pages. Add a 'Notify me' CTA as a one-field form. 2-day engineering effort.",
    customer_quote: "The Tokyo bag I wanted was sold out. No way to be notified. I moved on and bought from another brand.",
    status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "tf-2", workspace_id: "demo",
    title: "Shipping timeline expectations are killing first-time conversion",
    severity: 76, severity_label: "high", confidence: 0.83, evidence_count: 29,
    source_breakdown: { zendesk: 14, email: 9, intercom: 6, reddit: 0, appstore: 0, googleplay: 0, googleanalytics: 0, slack: 0, whatsapp: 0, jira: 0, github: 0,
    shopify: 0, trustpilot: 0,
  },
    business_case: "Customers accustomed to 2-day shipping abandon at the '5-7 business day' disclosure. This is a positioning problem, not a logistics one.",
    recommended_action: "Rewrite shipping copy to lead with narrative framing. Add an estimated arrival date in the cart. A/B test narrative vs. current wording.",
    customer_quote: "Week-long shipping for a $180 bag? That's not premium, that's just slow.",
    status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "tf-3", workspace_id: "demo",
    title: "Product story isn't converting skeptics, premium price needs visual proof",
    severity: 64, severity_label: "high", confidence: 0.76, evidence_count: 22,
    source_breakdown: { reddit: 11, email: 7, intercom: 4, zendesk: 0, appstore: 0, googleplay: 0, googleanalytics: 0, slack: 0, whatsapp: 0, jira: 0, github: 0,
    shopify: 0, trustpilot: 0,
  },
    business_case: "Brand advocates love the concept; first-time visitors don't convert. A 60-second artisan video could improve conversion 2x.",
    recommended_action: "Add a short artisan process video (60s) to each product page above the fold. Film the maker, materials, and cultural context.",
    customer_quote: "The story sounds cool but at $200 I need to see more than photos to trust it.",
    status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "tf-4", workspace_id: "demo",
    title: "No-return policy is generating active negative word-of-mouth on Reddit",
    severity: 57, severity_label: "medium", confidence: 0.71, evidence_count: 17,
    source_breakdown: { reddit: 10, email: 5, zendesk: 2, appstore: 0, googleplay: 0, googleanalytics: 0, slack: 0, whatsapp: 0, intercom: 0, jira: 0, github: 0,
    shopify: 0, trustpilot: 0,
  },
    business_case: "4 posts in r/femalefashionadvice warn against purchasing. This is active negative word-of-mouth in a high-trust community. Store credit would largely neutralize this.",
    recommended_action: "Introduce store credit as a return option for unworn items within 14 days. Communicate this prominently in footer and checkout.",
    customer_quote: "Bag arrived and the strap was too short for me. No returns accepted. Lost $180. Avoid.",
    status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "tf-5", workspace_id: "demo",
    title: "Mobile checkout abandonment is 40% higher than desktop",
    severity: 43, severity_label: "medium", confidence: 0.64, evidence_count: 11,
    source_breakdown: { intercom: 6, email: 3, zendesk: 2, reddit: 0, appstore: 0, googleplay: 0, googleanalytics: 0, slack: 0, whatsapp: 0, jira: 0, github: 0,
    shopify: 0, trustpilot: 0,
  },
    business_case: "67% of site traffic is mobile but only 38% of completed purchases. Enabling Apple Pay as primary mobile CTA could significantly close this gap.",
    recommended_action: "Make Apple Pay and Google Pay the primary CTA on mobile checkout. Reduce the address form to essential fields only.",
    customer_quote: "Tried to buy on my phone but the checkout form was a nightmare. Gave up and went to desktop.",
    status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

// ── Pre-seeded AI snapshots ───────────────────────────────────────────────────

const SNAPSHOTS: Record<string, { problem_statement: string; recommended_solution: string; acceptance_criteria: string[]; success_metrics: string[]; effort_estimate: string }> = {
  "tf-1": {
    problem_statement: "Customers who want to purchase limited-edition bags encounter sold-out product pages with no mechanism to be notified of restocks, resulting in permanent loss of high-intent buyers who represent peak demand.",
    recommended_solution: "Build a back-in-stock notification system with a simple one-field email capture form on sold-out product pages. Trigger automated emails within 1 hour of inventory replenishment. Integrate with the existing email provider.",
    acceptance_criteria: [
      "Back-in-stock form visible on all sold-out product pages",
      "Email capture rate of >15% of sold-out page visitors",
      "Notification email sent within 1h of stock update",
      "Unsubscribe mechanism present in all notification emails",
      "Form does not appear on in-stock products",
    ],
    success_metrics: [
      "Sold-out page conversion from 0% → 12%+ via waitlist",
      "Notification email open rate >40%",
      "Revenue recovered from notified customers",
      "Reduction in 'when will this restock?' support tickets by 60%",
    ],
    effort_estimate: "2-3 days (backend queue + email template + frontend CTA)",
  },
  "tf-2": {
    problem_statement: "First-time customers with expectations set by Amazon and fast-fashion brands abandon carts when they encounter the '5-7 business day' shipping disclosure, perceiving slow delivery as a quality deficiency rather than a craft-production feature.",
    recommended_solution: "Reframe the shipping timeline as a brand value signal through narrative copy. Show exact estimated delivery dates in cart. Add a 'Why does it take this long?' tooltip explaining the artisanal process. No logistics changes required.",
    acceptance_criteria: [
      "New narrative shipping copy live on product pages and checkout",
      "Estimated delivery date calculated and shown in cart",
      "Tooltip explaining artisanal process on shipping row",
      "A/B test variant created for narrative vs. current wording",
      "Mobile layout preserves readability of new copy",
    ],
    success_metrics: [
      "Checkout completion rate for first-time visitors +8%",
      "Cart abandonment rate at shipping disclosure step reduced by 20%",
      "NPS score for shipping experience improves from negative to neutral",
      "A/B test statistical significance reached within 30 days",
    ],
    effort_estimate: "1 day (copy changes + date calculation logic)",
  },
  "tf-3": {
    problem_statement: "The written product narrative resonates with existing fans but fails to convert price-skeptical new visitors who need visual evidence of craft quality to justify the $150-250 price point. Mid-funnel drop-off at the product page is the core conversion failure.",
    recommended_solution: "Create a short-form (60s) artisan process video for each collection showcasing raw materials, maker hands, and cultural context. Feature prominently above the fold on product pages. Optimize for silent autoplay on mobile.",
    acceptance_criteria: [
      "Video produced for at least 2 collections within 30 days",
      "Video featured above fold on all product pages in that collection",
      "Video loads within 2s on mobile (compressed + CDN)",
      "Silent autoplay with captions on mobile",
      "Fallback static image if video fails to load",
    ],
    success_metrics: [
      "Product page conversion rate improves by 30-50%",
      "Video engagement: >50% of visitors watch more than 30 seconds",
      "AOV for customers who watched video vs. did not",
      "Reduction in 'is this really handmade?' support questions",
    ],
    effort_estimate: "3-5 days production + 1 day integration",
  },
  "tf-4": {
    problem_statement: "The no-return policy surprises customers post-purchase, generating public Reddit posts in high-trust fashion communities that actively warn others against buying. This creates measurable top-of-funnel acquisition damage from peer recommendations.",
    recommended_solution: "Introduce store credit as a 14-day return option for unworn items, update all pre-purchase policy language, add a policy summary to order confirmation emails, and proactively respond to existing negative Reddit threads with the updated policy.",
    acceptance_criteria: [
      "Store credit return flow live and functional",
      "Policy updated in footer, checkout, and FAQ",
      "Order confirmation email updated with return policy summary",
      "Reddit threads responded to within 24h of launch",
      "Return portal accessible from customer account dashboard",
    ],
    success_metrics: [
      "Reduction in negative Reddit mentions (monitor via Observer)",
      "Post-purchase support ticket volume drops by 40%",
      "Repeat purchase rate from customers who used store credit",
      "Trust score improvement in new customer surveys",
    ],
    effort_estimate: "2-3 days (return flow + policy copy updates)",
  },
  "tf-5": {
    problem_statement: "Mobile visitors represent 67% of site traffic but complete purchases at less than half the rate of desktop visitors. The multi-field address form is the primary abandonment point on iOS, preventing conversion of the majority traffic segment.",
    recommended_solution: "Elevate Apple Pay and Google Pay to primary checkout CTAs on mobile screens, implement address autofill, reduce required form fields from 8 to 5, and add a direct Buy button on product detail pages for returning customers.",
    acceptance_criteria: [
      "Apple Pay and Google Pay shown as primary CTAs on mobile checkout",
      "Address autofill enabled via browser API",
      "Required checkout fields reduced to 5 (name, email, address, city, postcode)",
      "Direct Buy button on PDPs for mobile users",
      "Checkout flow completes in under 3 taps for returning customers",
    ],
    success_metrics: [
      "Mobile checkout completion rate from 38% → 55%+",
      "Time-to-complete checkout on mobile reduced by 40%",
      "Apple Pay adoption rate among mobile users",
      "Mobile revenue as % of total revenue increases",
    ],
    effort_estimate: "2-4 days (Stripe payment elements integration)",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ApprovalState = "pending" | "approved" | "rejected";
type BriefTab = "assessment" | "evidence" | "business" | "disposition";

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityLabel(s: number): "critical" | "high" | "medium" | "low" {
  if (s >= 80) return "critical";
  if (s >= 60) return "high";
  if (s >= 35) return "medium";
  return "low";
}

function severityColor(sev: "critical" | "high" | "medium" | "low"): string {
  switch (sev) {
    case "critical": return "#ef4444";
    case "high":     return "#f97316";
    case "medium":   return "#f59e0b";
    default:         return "rgba(255,255,255,0.28)";
  }
}

function urgencyLabel(s: number): string {
  if (s >= 80) return "This sprint";
  if (s >= 60) return "Next sprint";
  if (s >= 35) return "Backlog";
  return "Icebox";
}

function sourceChips(cluster: Cluster): Array<{ name: string; count: number }> {
  return Object.entries(cluster.source_breakdown ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

// ── AI Insight Banner ─────────────────────────────────────────────────────────

function AIInsightBanner({ clusters, onClose }: { clusters: Cluster[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const insights = clusters.slice(0, 3).map((c) => {
    const sev = severityLabel(c.severity);
    const emoji = sev === "critical" ? "🔴" : sev === "high" ? "🟠" : "🟡";
    return { headline: `${emoji} ${sev.charAt(0).toUpperCase() + sev.slice(1)} priority signal detected`, detail: c.title, confidence: Math.round(c.confidence * 100), sev };
  });
  if (insights.length === 0) return null;
  const current = insights[idx];
  return (
    <div className="ai-insight-banner">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(249,115,22,0.22)] bg-[rgba(249,115,22,0.1)] text-[1.1rem]">🧠</div>
        <div className="min-w-0 flex-1">
          <div className="mb-[5px] flex items-center gap-2">
            <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">AI INSIGHT {idx + 1}/{insights.length}</span>
            <span className="rounded-[4px] border border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.1)] px-[7px] py-0.5 text-[0.62rem] font-semibold text-primary">{current.confidence}% confidence</span>
          </div>
          <p className="mb-[3px] text-[0.92rem] font-semibold leading-[1.4] text-white">{current.headline}</p>
          <p className="line-clamp-2 text-[0.81rem] leading-[1.55] text-[var(--muted-light)]">{current.detail}</p>
          {insights.length > 1 && (
            <div className="mt-2.5 flex gap-1">
              {insights.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={cn("h-[5px] cursor-pointer rounded-[3px] p-0 transition-all duration-200", i === idx ? "w-[18px] bg-primary" : "w-[5px] bg-white/[0.16]")} />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {idx < insights.length - 1 && (
            <button onClick={() => setIdx((i) => i + 1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border bg-white/[0.06] text-base text-white">›</button>
          )}
          <button onClick={onClose} className="cursor-pointer rounded-[5px] px-1.5 py-1 text-[0.9rem] leading-none text-[var(--muted-dim)]">✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Stepper ──────────────────────────────────────────────────────────

function PipelineStepper() {
  const steps = [
    { key: "ingest",  label: "Ingest",  count: 117 },
    { key: "cluster", label: "Cluster", count: 5 },
    { key: "decide",  label: "Decide",  count: 5 },
    { key: "spec",    label: "Spec",    count: 1 },
    { key: "measure", label: "Measure", count: 1 },
  ];
  return (
    <div className="flex items-center gap-0 rounded-xl border bg-card px-[18px] py-2.5">
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className={`pipeline-step ${i <= 1 ? "ps-active" : "ps-pending"}`}>
            <span className={`step-badge ${i <= 1 ? "active" : "pending"}`}>{i < 1 ? "✓" : i + 1}</span>
            {step.label}
            {step.count > 0 && <span className="font-mono text-[0.7rem] text-muted-foreground">×{step.count}</span>}
          </div>
          {i < steps.length - 1 && <div className="h-px min-w-3 max-w-9 flex-1 bg-linear-to-r from-border to-transparent" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Status Strip ──────────────────────────────────────────────────────────────

function StatusStrip() {
  const items = [
    { label: "sources wired", value: 4, color: "#f1f1f5" },
    { label: "signals", value: 117, color: "#f1f1f5" },
    { label: "clusters", value: 5, color: "#f1f1f5" },
    { label: "critical", value: 1, color: "#f87171" },
    { label: "avg confidence", value: "79%", color: "#f1f1f5" },
  ];
  return (
    <div className="mb-4 flex h-[38px] items-center gap-0 overflow-hidden rounded-[10px] border bg-card px-4">
      <div className="flex shrink-0 items-center gap-1.5 pr-4">
        <div className="h-1.5 w-1.5 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-[#22c55e]" />
        <span className="text-[0.7rem] font-semibold tracking-[0.02em] text-[var(--muted-light)]">Live</span>
      </div>
      <div className="mr-4 h-4 w-px shrink-0 bg-border" />
      <div className="flex flex-1 items-center gap-0">
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div className="mx-3 h-3.5 w-px shrink-0 bg-border" />}
            <div className="flex shrink-0 items-baseline gap-[5px]">
              <span className="font-mono text-[0.82rem] font-bold tracking-[-0.02em]" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[0.7rem] tracking-[-0.01em] text-muted-foreground">{item.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-[5px] pl-4">
        <div className="mr-1 h-3.5 w-px bg-border" />
        <span className="font-mono text-[0.7rem] text-[var(--muted-dim)]">Last run: 2m ago</span>
      </div>
    </div>
  );
}

// ── Source Breakdown Chart ────────────────────────────────────────────────────

function SourceBreakdownChart({ cluster }: { cluster: Cluster }) {
  const chips = sourceChips(cluster);
  const max = Math.max(...chips.map((c) => c.count), 1);
  const colors: Record<string, string> = { email: "#6ea8ff", zendesk: "#f79a00", intercom: "#4dabf7", reddit: "#ff4500", slack: "#e879f9", appstore: "#a78bfa", github: "#c9d1d9", whatsapp: "#46e6a6", jira: "#2684ff" };
  return (
    <div className="flex flex-col gap-2">
      {chips.map(({ name, count }) => {
        const color = colors[name] ?? "#9aa3b2";
        return (
          <div key={name}>
            <div className="mb-1 flex justify-between">
              <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.06em]" style={{ color }}>{name}</span>
              <span className="font-mono text-[0.68rem] text-muted-foreground">{count}</span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-[3px] bg-white/[0.06]">
              <div className="h-full rounded-[3px] opacity-70 transition-[width] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ width: `${Math.round((count / max) * 100)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Intent Snapshot Modal ─────────────────────────────────────────────────────

function IntentSnapshotModal({ cluster, open, onClose }: { cluster: Cluster | null; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const [shareState, setShareState] = useState<Record<string, "idle" | "sending" | "done">>({});
  const [copied, setCopied] = useState(false);
  const [jiraTicket, setJiraTicket] = useState<string | null>(null);
  const clusterId = cluster?.id;

  useEffect(() => {
    if (!open || !clusterId) return;
    const resetTimer = setTimeout(() => {
      setShown(false);
      setLoading(true);
      setShareState({});
      setJiraTicket(null);
    }, 0);
    const revealTimer = setTimeout(() => { setLoading(false); setShown(true); }, 1400);
    return () => {
      clearTimeout(resetTimer);
      clearTimeout(revealTimer);
    };
  }, [open, clusterId]);

  if (!cluster) return null;
  const snapshot = SNAPSHOTS[cluster.id];
  const sev = severityLabel(cluster.severity);
  const confPct = Math.round(cluster.confidence * 100);

  function simulateShare(key: string) {
    setShareState((s) => ({ ...s, [key]: "sending" }));
    setTimeout(() => setShareState((s) => ({ ...s, [key]: "done" })), 1200);
  }

  function createJira() {
    simulateShare("jira");
    setTimeout(() => setJiraTicket("TF-" + Math.floor(40 + Math.random() * 20)), 1200);
  }

  const exportMd = () => {
    if (!snapshot) return;
    const md = `# ${cluster.title}\n\n**Severity:** ${sev} (${cluster.severity}/100)\n**Confidence:** ${confPct}%\n**Evidence:** ${cluster.evidence_count} signals\n\n## Problem Statement\n${snapshot.problem_statement}\n\n## Business Case\n${cluster.business_case}\n\n## Recommended Solution\n${snapshot.recommended_solution}\n\n## Acceptance Criteria\n${snapshot.acceptance_criteria.map((c) => `- ${c}`).join("\n")}\n\n## Success Metrics\n${snapshot.success_metrics.map((m) => `- ${m}`).join("\n")}\n\n## Effort Estimate\n${snapshot.effort_estimate}\n\n## Customer Quote\n> "${cluster.customer_quote}"\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${cluster.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
  };

  const copyMd = () => {
    if (!snapshot) return;
    navigator.clipboard.writeText(`# ${cluster.title}\n\n${snapshot.problem_statement}\n\nAction: ${snapshot.recommended_solution}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharebtn = (key: string, label: string, className?: string) => {
    const state = shareState[key] ?? "idle";
    return (
      <Button variant="ghost" onClick={() => simulateShare(key)} disabled={state !== "idle"} className={cn("h-auto rounded-[7px] border px-3.5 py-[7px] text-[0.82rem] font-medium text-muted-foreground", state === "sending" ? "disabled:opacity-50" : "disabled:opacity-100", className)}>
        {state === "sending" ? "Sending…" : state === "done" ? `✓ Sent` : label}
      </Button>
    );
  };

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
          <button onClick={onClose} className="cursor-pointer pl-4 text-[1.4rem] text-muted-foreground">×</button>
        </div>

        {/* Meta row */}
        <div className="mb-6 flex flex-wrap gap-6 border-y border-white/[0.08] py-4">
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Confidence</div>
            <ConfidenceBar value={cluster.confidence} />
          </div>
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Evidence</div>
            <div className="text-[0.9rem] font-semibold text-white">{cluster.evidence_count} signals</div>
          </div>
          <div>
            <div className="mb-1 text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">Sources</div>
            <div className="text-[0.9rem] font-semibold text-white">
              {sourceChips(cluster).map(({ name, count }) => `${name} ${count}`).join(" · ")}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-[60px] text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[var(--accent-green)]" />
            <p className="text-[0.875rem] text-muted-foreground">Generating intent snapshot with Claude…</p>
          </div>
        ) : shown && snapshot ? (
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-green)]">Problem Statement</h4>
              <p className="text-[0.95rem] leading-[1.6] text-white">{snapshot.problem_statement}</p>
            </div>
            <div className="rounded-xl border border-[rgba(70,230,166,0.15)] bg-[rgba(70,230,166,0.06)] p-5">
              <h4 className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-green)]">Recommended Solution</h4>
              <p className="text-[0.95rem] leading-[1.6] text-white">{snapshot.recommended_solution}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[rgba(110,168,255,0.15)] bg-[rgba(110,168,255,0.06)] p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-blue)]">Acceptance Criteria</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.acceptance_criteria.map((c, i) => <li key={i} className="text-[0.8rem] leading-[1.5] text-muted-foreground">{c}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.06)] p-5">
                <h4 className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-violet)]">Success Metrics</h4>
                <ul className="flex flex-col gap-1.5 pl-4">
                  {snapshot.success_metrics.map((m, i) => <li key={i} className="text-[0.8rem] leading-[1.5] text-muted-foreground">{m}</li>)}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1 rounded-xl border border-[rgba(255,209,102,0.2)] bg-[rgba(255,209,102,0.06)] px-5 py-4">
                <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">Effort Estimate</div>
                <div className="font-semibold text-white">{snapshot.effort_estimate}</div>
              </div>
              {cluster.customer_quote && (
                <div className="min-w-[200px] flex-[2] rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
                  <div className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Customer Voice</div>
                  <blockquote className="border-l-[3px] pl-3 text-[0.875rem] italic leading-[1.5] text-white [border-left-color:var(--accent-green)]">
                    &ldquo;{cluster.customer_quote}&rdquo;
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-2.5 border-t border-white/[0.08] pt-6">
          {sharebtn("slack", "⚡ Share to Slack")}

          {/* WhatsApp alert, prominent */}
          <Button variant="ghost" onClick={() => simulateShare("whatsapp")} disabled={shareState["whatsapp"] !== "idle" && shareState["whatsapp"] !== undefined} className={cn("h-auto rounded-[7px] border border-[rgba(70,230,166,0.35)] px-3.5 py-[7px] text-[0.82rem] font-medium text-[#46e6a6]", shareState["whatsapp"] === "sending" ? "disabled:opacity-50" : "disabled:opacity-100")}>
            {shareState["whatsapp"] === "sending" ? "Sending…" : shareState["whatsapp"] === "done" ? "✓ Alert Sent" : "💬 WhatsApp Alert"}
          </Button>

          {sharebtn("email", "✉️ Email Brief", "border-[rgba(110,168,255,0.3)] text-[var(--accent-blue)]")}

          {/* Jira */}
          <Button variant="ghost" onClick={createJira} disabled={shareState["jira"] !== "idle" && shareState["jira"] !== undefined} className={cn("h-auto rounded-[7px] border border-[rgba(38,132,255,0.3)] px-3.5 py-[7px] text-[0.82rem] font-medium text-[#2684ff]", shareState["jira"] === "sending" ? "disabled:opacity-50" : "disabled:opacity-100")}>
            {shareState["jira"] === "sending" ? "Creating…" : jiraTicket ? `✓ ${jiraTicket} Created` : "📋 Create Jira Ticket"}
          </Button>

          <Button variant="ghost" onClick={exportMd} className="h-auto rounded-[7px] border border-[rgba(167,139,250,0.3)] px-3.5 py-[7px] text-[0.82rem] font-medium text-[var(--accent-violet)]">↓ Export PRD</Button>
          <Button variant="ghost" onClick={copyMd} className="h-auto rounded-[7px] border border-white/[0.15] px-3.5 py-[7px] text-[0.82rem] font-medium text-muted-foreground">{copied ? "✓ Copied!" : "Copy"}</Button>
        </div>

        {/* WhatsApp alert preview */}
        {shareState["whatsapp"] === "done" && (
          <div className="mt-4 rounded-[10px] border border-[rgba(70,230,166,0.2)] bg-[rgba(70,230,166,0.06)] px-[18px] py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[0.8rem]">💬</span>
              <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#46e6a6]">WhatsApp Alert Sent · +1 555 0147</span>
              <span className="ml-auto font-mono text-[0.65rem] text-[var(--muted-dim)]">just now</span>
            </div>
            <div className="rounded-lg bg-black/30 px-3.5 py-2.5 text-[0.75rem] leading-[1.6] text-[var(--muted-light)] [font-family:monospace]">
              <span className="font-bold text-[#46e6a6]">*Observer Alert*</span>{"\n"}<br />
              ⚠️ {severityLabel(cluster.severity).toUpperCase()} · Score {cluster.severity}/100<br />
              {cluster.title}<br /><br />
              📊 {cluster.evidence_count} signals · {Math.round(cluster.confidence * 100)}% confidence<br />
              ✅ Action: {cluster.recommended_action.slice(0, 80)}…
            </div>
          </div>
        )}

        {jiraTicket && (
          <div className="mt-3 flex items-center gap-2.5 rounded-[10px] border border-[rgba(38,132,255,0.2)] bg-[rgba(38,132,255,0.06)] px-4 py-3">
            <span className="text-[0.9rem]">📋</span>
            <div>
              <div className="text-[0.78rem] font-bold text-[#2684ff]">Jira ticket created: <span className="font-mono">{jiraTicket}</span></div>
              <div className="mt-0.5 text-[0.7rem] text-muted-foreground">Assigned to Product · Sprint 14 · Priority: {severityLabel(cluster.severity)}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────────

function SignalCard({ cluster, selected, onClick, staggerIndex, approval }: {
  cluster: Cluster; selected: boolean; onClick: () => void; staggerIndex: number; approval: ApprovalState;
}) {
  const sev = severityLabel(cluster.severity);
  const color = severityColor(sev);
  const chips = sourceChips(cluster);
  const confPct = Math.round(cluster.confidence * 100);
  return (
    <div className={cn(`signal-card sev-${sev} ${selected ? "selected" : ""} stagger-${Math.min(staggerIndex + 1, 8)}`, "relative cursor-pointer pt-4 pr-[18px] pb-3.5 pl-5")} onClick={onClick}>
      {approval !== "pending" && (
        <div className={cn("absolute top-3 right-3.5 rounded-[5px] border px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em]", approval === "approved" ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.12)] text-[#4ade80]" : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] text-[#f87171]")}>
          {approval === "approved" ? "✓ Approved" : "✕ Rejected"}
        </div>
      )}
      <h3 className={cn("mb-2.5 text-[0.96rem] font-bold leading-[1.45] tracking-[-0.018em] text-white", approval !== "pending" ? "pr-[90px]" : "pr-0")}>
        {cluster.title}
      </h3>
      {chips.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {chips.map(({ name, count }) => (
            <span key={name} className="rounded-[4px] border border-white/[0.08] bg-white/[0.04] px-[7px] py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              {name}<span className="ml-1 font-normal opacity-40">{count}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`badge badge-${sev}`}>{sev}</span>
        <span className="font-mono text-[0.67rem] text-muted-foreground">
          <span className="font-semibold text-white/[0.72]">{cluster.evidence_count}</span> sig
        </span>
        <span className="font-mono text-[0.67rem] text-muted-foreground">
          <span className="font-bold" style={{ color }}>{confPct}%</span>
        </span>
        <span className="ml-auto font-mono text-[0.65rem] text-[var(--muted-dim)]">{urgencyLabel(cluster.severity)}</span>
      </div>
      <div className="mt-[11px] h-0.5 overflow-hidden rounded-[1px] bg-white/[0.05]">
        <div className="h-full rounded-[1px] opacity-50" style={{ width: `${confPct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Brief Section ─────────────────────────────────────────────────────────────

function BriefSection({ number, label, accentColor, children }: { number: string; label: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mx-[18px] h-px bg-border" />
      <div className="px-[18px] py-3.5">
        <div className="mb-2.5 flex items-center gap-[7px]">
          <div className="h-3 w-0.5 shrink-0 rounded-[1px]" style={{ background: accentColor || "rgba(255,255,255,0.14)" }} />
          <span className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{number} · {label}</span>
        </div>
        {children}
      </div>
    </>
  );
}

// ── Distribute Popover ────────────────────────────────────────────────────────

const DIST_CHANNELS = [
  { key: "slack",    label: "Slack",    icon: "⚡", desc: "Post to #product-alerts" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬", desc: "Alert mobile recipients", accent: "#46e6a6" },
  { key: "email",    label: "Email",    icon: "✉️", desc: "Send brief to team inbox" },
];

const WA_RECIPIENTS = [
  { id: "r1", name: "Alex Thompson",  role: "Head of Product",     phone: "+1 555 0147", avatar: "AT" },
  { id: "r2", name: "Sarah Chen",     role: "Co-Founder & CEO",    phone: "+1 555 0291", avatar: "SC" },
  { id: "r3", name: "Marcus Reid",    role: "VP Engineering",      phone: "+1 555 0384", avatar: "MR" },
  { id: "r4", name: "Priya Nair",     role: "Head of Growth",      phone: "+1 555 0462", avatar: "PN" },
  { id: "r5", name: "Jamie Okafor",   role: "Customer Experience", phone: "+1 555 0538", avatar: "JO" },
];

function DistributePopover({ onClose, cluster }: { onClose: () => void; cluster: Cluster }) {
  const [sel, setSel] = useState<string[]>(["whatsapp"]);
  const [step, setStep] = useState<"channels" | "recipients">("channels");
  const [waRecipients, setWaRecipients] = useState<string[]>(["r1", "r2"]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  void cluster;

  function handleNext() {
    if (!sel.length || sending) return;
    if (sel.includes("whatsapp")) {
      setStep("recipients");
    } else {
      doSend();
    }
  }

  function doSend() {
    setSending(true);
    setTimeout(() => { setSending(false); setDone(true); }, 1200);
    setTimeout(() => { setDone(false); onClose(); }, 2800);
  }

  const selectedNames = WA_RECIPIENTS.filter((r) => waRecipients.includes(r.id)).map((r) => r.name.split(" ")[0]);

  return (
    <div ref={ref} className="absolute bottom-[calc(100%_+_8px)] left-0 right-0 z-[100] rounded-xl border border-[rgba(249,115,22,0.25)] bg-card p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {done ? (
        <div className="py-3 text-center">
          <div className="mb-1.5 text-[1.4rem]">✓</div>
          <div className="text-[0.84rem] font-bold text-[#4ade80]">Brief distributed</div>
          <div className="mt-[3px] text-[0.72rem] text-muted-foreground">
            {sel.includes("whatsapp") && waRecipients.length > 0
              ? `WhatsApp → ${selectedNames.join(", ")}`
              : `Sent via ${sel.join(", ")}`}
          </div>
        </div>
      ) : step === "recipients" ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => setStep("channels")} className="cursor-pointer px-0.5 text-[0.8rem] text-muted-foreground">←</button>
            <div className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#46e6a6]">WhatsApp Recipients</div>
          </div>
          <div className="mb-3.5 flex flex-col gap-[5px]">
            {WA_RECIPIENTS.map((r) => {
              const active = waRecipients.includes(r.id);
              return (
                <button key={r.id} onClick={() => setWaRecipients((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-[120ms]", active ? "border-[#46e6a655] bg-[#46e6a611]" : "border-white/[0.08] bg-white/[0.02]")}>
                  <div className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[0.6rem] font-bold tracking-[0.02em]", active ? "border-[#46e6a6] bg-[#46e6a622] text-[#46e6a6]" : "border-white/[0.12] bg-white/[0.06] text-muted-foreground")}>
                    {r.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[0.8rem] font-semibold", active ? "text-[#46e6a6]" : "text-white")}>{r.name}</div>
                    <div className="truncate text-[0.67rem] text-muted-foreground">{r.role} · {r.phone}</div>
                  </div>
                  <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]", active ? "border-[#46e6a6] bg-[#46e6a6]" : "border-white/20 bg-transparent")}>
                    {active && <span className="text-[0.55rem] font-black text-black">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={doSend} disabled={waRecipients.length === 0} className={cn("w-full rounded-lg px-3.5 py-[9px] text-[0.82rem] font-bold", waRecipients.length > 0 ? "cursor-pointer bg-[#46e6a6] text-black" : "cursor-default bg-white/[0.05] text-[var(--muted-dim)]", sending ? "opacity-70" : "opacity-100")}>
            {sending ? "Sending…" : `Send to ${waRecipients.length} recipient${waRecipients.length !== 1 ? "s" : ""}`}
          </button>
        </>
      ) : (
        <>
          <div className="mb-3 font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-dim)]">Distribute Brief</div>
          <div className="mb-3.5 flex flex-col gap-1.5">
            {DIST_CHANNELS.map(({ key, label, icon, desc, accent }) => {
              const active = sel.includes(key);
              return (
                <button key={key} onClick={() => setSel((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key])} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-[120ms]" style={{ borderColor: active ? (accent ? `${accent}55` : "rgba(249,115,22,0.35)") : "rgba(255,255,255,0.08)", background: active ? (accent ? `${accent}11` : "rgba(249,115,22,0.07)") : "rgba(255,255,255,0.02)" }}>
                  <span className="text-[0.95rem]">{icon}</span>
                  <div className="flex-1">
                    <div className="text-[0.8rem] font-semibold" style={{ color: active ? (accent ?? "var(--accent)") : "#fff" }}>{label}</div>
                    <div className="text-[0.67rem] text-muted-foreground">{desc}</div>
                  </div>
                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]" style={{ borderColor: active ? (accent ?? "var(--accent)") : "rgba(255,255,255,0.2)", background: active ? (accent ?? "var(--accent)") : "transparent" }}>
                    {active && <span className="text-[0.55rem] font-black text-black">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={handleNext} disabled={sel.length === 0} className={cn("w-full rounded-lg px-3.5 py-[9px] text-[0.82rem] font-semibold", sel.length > 0 ? "cursor-pointer bg-primary text-white" : "cursor-default bg-white/[0.05] text-[var(--muted-dim)]")}>
            {sel.includes("whatsapp") ? `Next: Choose Recipients →` : `Send Brief (${sel.length})`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Execution Brief ───────────────────────────────────────────────────────────

function ExecutionBrief({ cluster, approval, onApprove, onReject, onViewFull }: {
  cluster: Cluster | null; approval: ApprovalState; onApprove: () => void; onReject: () => void; onViewFull: () => void;
}) {
  const [activeTab, setActiveTab] = useState<BriefTab>("assessment");
  const [showDistribute, setShowDistribute] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveTab("assessment");
      setShowDistribute(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [cluster?.id]);

  if (!cluster) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[14px] border bg-card p-8">
        <p className="max-w-[160px] text-center font-mono text-[0.78rem] leading-[1.65] text-[var(--muted-dim)]">Select a signal<br />to open its brief</p>
      </div>
    );
  }

  const sev = severityLabel(cluster.severity);
  const color = severityColor(sev);
  const chips = sourceChips(cluster);
  const confPct = Math.round(cluster.confidence * 100);
  const briefId = cluster.id.slice(-4).toUpperCase();
  const TABS: { key: BriefTab; label: string }[] = [
    { key: "assessment", label: "Action" },
    { key: "evidence",   label: "Evidence" },
    { key: "business",   label: "Business" },
    { key: "disposition", label: "Decide" },
  ];

  return (
    <div className="overflow-hidden rounded-[14px] border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-[18px] py-2.5">
        <div className="flex items-center gap-[7px]">
          <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--muted-dim)]">Intel Brief</span>
          <span className="font-mono text-[0.62rem] text-white/[0.18]">#{briefId}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {approval !== "pending" && (
            <span className={cn("rounded-[4px] border px-[7px] py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.06em]", approval === "approved" ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.12)] text-[#4ade80]" : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] text-[#f87171]")}>
              {approval === "approved" ? "✓ approved" : "✕ rejected"}
            </span>
          )}
          <span className={`badge badge-${sev}`}>{sev}</span>
          <div className="h-[5px] w-[5px] animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-[#22c55e]" />
        </div>
      </div>

      {/* Score + title */}
      <div className="px-[18px] pt-[18px]">
        <div className="mb-2.5 flex items-end gap-[7px]">
          <span className="font-mono text-[2.6rem] font-black leading-[0.9] tracking-[-0.05em]" style={{ color }}>{cluster.severity}</span>
          <span className="pb-[3px] text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">/ 100</span>
        </div>
        <h4 className="mb-3.5 text-[0.9rem] font-bold leading-[1.5] tracking-[-0.015em] text-white">{cluster.title}</h4>
      </div>

      {/* Tab strip */}
      <div className="flex border-b px-[18px]">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("-mb-px cursor-pointer border-b-2 px-3 py-2 text-[0.7rem] font-semibold tracking-[0.02em] transition-all duration-[120ms]", activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Action */}
      {activeTab === "assessment" && (
        <>
          <BriefSection number="01" label="Assessment" accentColor={color}>
            <p className="mb-3 text-[0.82rem] leading-[1.7] text-[var(--muted-light)]">{cluster.recommended_action}</p>
            <div className="flex items-center justify-between rounded-lg border border-[rgba(249,115,22,0.12)] bg-[rgba(249,115,22,0.05)] px-3.5 py-2.5">
              <span className="font-mono text-[0.68rem] font-bold uppercase text-primary">Urgency</span>
              <span className="text-[0.82rem] font-bold" style={{ color }}>{urgencyLabel(cluster.severity)}</span>
            </div>
          </BriefSection>

          {/* ── Distribute CTA ── */}
          <div className="px-[18px] pb-[18px]">
            <div className="rounded-[10px] border border-[rgba(70,230,166,0.18)] bg-[linear-gradient(135deg,rgba(70,230,166,0.07)_0%,rgba(70,230,166,0.03)_100%)] px-4 py-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <div className="mb-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#46e6a6]">Share Brief</div>
                  <div className="text-[0.7rem] text-muted-foreground">Alert your team via WhatsApp, Slack or Email</div>
                </div>
                <div className="flex gap-[5px]">
                  <span className="text-base">💬</span>
                  <span className="text-base">⚡</span>
                  <span className="text-base">✉️</span>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowDistribute((v) => !v)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] px-4 py-[11px] text-[0.85rem] font-bold tracking-[0.01em] text-[#46e6a6] transition-all duration-150 hover:border-[rgba(70,230,166,0.6)] hover:bg-[rgba(70,230,166,0.2)]",
                    showDistribute ? "border-[rgba(70,230,166,0.6)] bg-[rgba(70,230,166,0.2)]" : "border-[rgba(70,230,166,0.35)] bg-[rgba(70,230,166,0.12)]"
                  )}
                >
                  <span className="text-base">↗</span>
                  {showDistribute ? "Close" : "Distribute Brief"}
                  <span className="ml-auto text-[0.7rem] opacity-70">{showDistribute ? "▲" : "▼"}</span>
                </button>
                {showDistribute && <DistributePopover cluster={cluster} onClose={() => setShowDistribute(false)} />}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab: Evidence */}
      {activeTab === "evidence" && (
        <div className="px-[18px] py-4">
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
              <div className="mb-1 text-[0.6rem] uppercase tracking-[0.08em] text-[var(--muted-dim)]">Evidence</div>
              <div className="font-mono text-[1.6rem] font-extrabold tracking-[-0.04em] text-white">{cluster.evidence_count}</div>
              <div className="mt-0.5 text-[0.65rem] text-muted-foreground">customer signals</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
              <div className="mb-1 text-[0.6rem] uppercase tracking-[0.08em] text-[var(--muted-dim)]">Confidence</div>
              <div className="font-mono text-[1.6rem] font-extrabold tracking-[-0.04em]" style={{ color }}>{confPct}%</div>
              <div className="mt-0.5 text-[0.65rem] text-muted-foreground">AI confidence</div>
            </div>
          </div>
          {chips.length > 0 && (
            <>
              <div className="mb-2.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Source breakdown</div>
              <SourceBreakdownChart cluster={cluster} />
            </>
          )}
          <div className="mt-3.5">
            <div className="mb-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">Confidence</div>
            <ConfidenceBar value={cluster.confidence} />
          </div>
        </div>
      )}

      {/* Tab: Business */}
      {activeTab === "business" && (
        <div className="px-[18px] py-4">
          {cluster.customer_quote && (
            <blockquote className="mb-3.5 rounded-r-lg border-l-2 bg-white/[0.03] px-4 py-3 text-[0.82rem] italic leading-[1.65] text-[var(--muted-light)]" style={{ borderLeftColor: color }}>
              &ldquo;{cluster.customer_quote}&rdquo;
            </blockquote>
          )}
          <p className="text-[0.82rem] leading-[1.7] text-[var(--muted-light)]">{cluster.business_case}</p>
        </div>
      )}

      {/* Tab: Decide */}
      {activeTab === "disposition" && (
        <div className="px-[18px] py-4">
          <p className="mb-3 text-[0.72rem] leading-[1.55] text-muted-foreground">Approve to add to sprint backlog. Reject to dismiss. Distribute to notify your team.</p>
          <div className="mb-2.5 flex gap-2">
            <button className={`btn-approve ${approval === "approved" ? "approved" : ""}`} onClick={onApprove}>
              ✓ {approval === "approved" ? "Approved" : "Approve"}
            </button>
            <button className={`btn-reject ${approval === "rejected" ? "rejected" : ""}`} onClick={onReject}>
              ✕ {approval === "rejected" ? "Rejected" : "Reject"}
            </button>
          </div>

          {/* View Full Brief / PRD */}
          <button onClick={onViewFull} className="mb-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.06)] px-3.5 py-[9px] text-[0.8rem] font-semibold text-[var(--accent-violet)] transition-all duration-[120ms] hover:bg-[rgba(167,139,250,0.12)]">
            🧠 Generate Intent Snapshot & PRD
          </button>

          {/* Distribute */}
          <div className="relative">
            <button onClick={() => setShowDistribute((v) => !v)} className={cn("flex w-full cursor-pointer items-center justify-center gap-[7px] rounded-lg border px-3.5 py-[9px] text-[0.8rem] font-semibold transition-all duration-[120ms]", showDistribute ? "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.08)] text-primary" : "bg-white/[0.04] text-[var(--muted-light)]")}>
              ↗ Distribute Brief
              <span className="ml-auto text-[0.65rem] opacity-60">{showDistribute ? "▲" : "▼"}</span>
            </button>
            {showDistribute && <DistributePopover cluster={cluster} onClose={() => setShowDistribute(false)} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login Gate ────────────────────────────────────────────────────────────────

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email.toLowerCase().trim() === "hello@totefolk.com" && password === "12345") {
        sessionStorage.setItem("showcase-auth", "1");
        onAuth();
      } else {
        setError("Invalid email or password.");
      }
    }, 700);
  }

  const inputClass = cn(
    "h-auto w-full rounded-lg border bg-white/[0.04] px-3.5 py-2.5 text-[0.85rem] text-white",
    error ? "border-[rgba(239,68,68,0.4)]" : "border-white/10"
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-6">
      {/* Top accent line */}
      <div className="fixed inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,transparent_0%,rgba(249,115,22,0.6)_30%,rgba(249,115,22,0.6)_70%,transparent_100%)]" />

      {/* Logo */}
      <div className="mb-10 flex items-center gap-2.5">
        <LogoMark />
        <span className="font-mono text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">Observer</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] rounded-2xl border bg-card p-8">
        <div className="mb-7 text-center">
          <div className="mb-2 font-mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary">Demo Access</div>
          <h2 className="text-[1.3rem] font-extrabold tracking-[-0.025em] text-white">Totefolk Dashboard</h2>
          <p className="mt-1.5 text-[0.78rem] text-muted-foreground">Sign in to view the product intelligence demo</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <Label className="mb-1.5 block font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@totefolk.com"
              required
              className={inputClass}
            />
          </div>
          <div>
            <Label className="mb-1.5 block font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              className={inputClass}
            />
          </div>

          {error && (
            <div className="rounded-md border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[0.75rem] text-[#f87171]">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 h-auto w-full rounded-lg px-4 py-3 text-[0.88rem] font-bold tracking-[0.01em] text-white disabled:bg-primary/50 disabled:opacity-100"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </Button>
        </form>

        <div className="mt-[22px] border-t pt-[18px] text-center">
          <p className="font-mono text-[0.68rem] text-[var(--muted-dim)]">
            Demo credentials provided by Observer
          </p>
        </div>
      </div>
    </div>
  );
}
void LoginGate;

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShowcasePage() {
  const [authed] = useState(() => (
    typeof window !== "undefined" && sessionStorage.getItem("showcase-auth") === "1"
  ));
  const [authChecked] = useState(true);

  const [selected, setSelected] = useState<Cluster>(TOTEFOLK_CLUSTERS[0]);
  const [approvals, setApprovals] = useState<Record<string, ApprovalState>>({});
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium">("all");
  const [sortBy, setSortBy] = useState<"severity" | "evidence" | "confidence">("severity");
  const [showBanner, setShowBanner] = useState(true);
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  void authChecked; void authed;

  const approvedCount = Object.values(approvals).filter((v) => v === "approved").length;

  const filterCounts = {
    all: TOTEFOLK_CLUSTERS.length,
    critical: TOTEFOLK_CLUSTERS.filter((c) => severityLabel(c.severity) === "critical").length,
    high: TOTEFOLK_CLUSTERS.filter((c) => severityLabel(c.severity) === "high").length,
    medium: TOTEFOLK_CLUSTERS.filter((c) => severityLabel(c.severity) === "medium").length,
  };

  const filtered = TOTEFOLK_CLUSTERS
    .filter((c) => filter === "all" || severityLabel(c.severity) === filter)
    .sort((a, b) => sortBy === "evidence" ? b.evidence_count - a.evidence_count : sortBy === "confidence" ? b.confidence - a.confidence : b.severity - a.severity);

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Demo Nav ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-white/[0.07] bg-[rgba(8,8,8,0.93)] backdrop-blur-[20px]">
        <div className="h-0.5 bg-[linear-gradient(90deg,transparent_0%,rgba(249,115,22,0.55)_30%,rgba(249,115,22,0.55)_70%,transparent_100%)]" />
        <div className="mx-auto flex h-[50px] max-w-[1400px] items-center px-6">
          <Link href="/" className="mr-3.5 flex shrink-0 items-center gap-[9px] no-underline">
            <LogoMark />
            <span className="text-[0.95rem] font-bold italic tracking-[-0.02em] text-white">Observer</span>
          </Link>
          <div className="mr-3.5 h-4 w-px bg-white/10" />
          <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">DEMO · Totefolk</span>
          {approvedCount > 0 && (
            <Badge variant="outline" className="ml-3 rounded-[5px] border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.1)] px-2 py-0.5 font-mono text-[0.62rem] font-bold text-[#4ade80]">{approvedCount} approved</Badge>
          )}
          <div className="flex-1" />
          <Button asChild variant="ghost" className="h-auto shrink-0 rounded-lg border border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.1)] px-3.5 py-1.5 text-[0.78rem] font-semibold text-primary no-underline hover:bg-[rgba(249,115,22,0.1)] hover:text-primary">
            <Link href="/signup">Use Observer for your product →</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-7">

        {/* Page header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="text-[0.95rem]">👜</span>
              <h1 className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-white">Totefolk, Signals</h1>
            </div>
            <p className="text-[0.86rem] text-[var(--muted-light)]">Clustered product intelligence from Email · Zendesk · Intercom · Reddit</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {["EMAIL", "ZENDESK", "INTERCOM", "REDDIT"].map((src) => (
              <Badge key={src} variant="outline" className="gap-1 rounded-[4px] border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-2 py-0.5 font-mono text-[0.6rem] font-bold tracking-[0.08em] text-[#22c55e]">
                <span className="inline-block h-1 w-1 rounded-full bg-[#22c55e]" />{src}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Insight Banner */}
        {showBanner && (
          <div className="mb-3.5">
            <AIInsightBanner clusters={TOTEFOLK_CLUSTERS} onClose={() => setShowBanner(false)} />
          </div>
        )}

        {/* Pipeline Stepper */}
        <div className="mb-4">
          <PipelineStepper />
        </div>

        {/* Status Strip */}
        <StatusStrip />

        {/* Filter + sort bar */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {(["all", "critical", "high", "medium"] as const).map((f) => (
              <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {filterCounts[f] > 0 && <span className={cn("ml-1 font-mono text-[0.65rem] font-bold", filter === f ? "text-primary" : "text-[var(--muted-dim)]")}>{filterCounts[f]}</span>}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[0.7rem] tracking-[0.02em] text-muted-foreground">Sort:</span>
            {(["severity", "evidence", "confidence"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)} className={cn("cursor-pointer rounded-md border-none px-2.5 py-1 text-[0.72rem] font-medium transition-all duration-[120ms]", sortBy === s ? "bg-white/[0.09] text-white" : "bg-transparent text-muted-foreground")}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_400px] items-start gap-4">
          <div className="flex flex-col gap-[11px]">
            {filtered.map((c, idx) => (
              <SignalCard key={c.id} cluster={c} selected={selected?.id === c.id} onClick={() => setSelected(c)} staggerIndex={idx} approval={approvals[c.id] ?? "pending"} />
            ))}
          </div>
          <div className="sticky top-[66px]">
            <ExecutionBrief
              cluster={selected}
              approval={approvals[selected?.id] ?? "pending"}
              onApprove={() => setApprovals((a) => ({ ...a, [selected.id]: a[selected.id] === "approved" ? "pending" : "approved" }))}
              onReject={() => setApprovals((a) => ({ ...a, [selected.id]: a[selected.id] === "rejected" ? "pending" : "rejected" }))}
              onViewFull={() => setSnapshotOpen(true)}
            />
          </div>
        </div>
      </div>

      <IntentSnapshotModal cluster={selected} open={snapshotOpen} onClose={() => setSnapshotOpen(false)} />
    </div>
  );
}
