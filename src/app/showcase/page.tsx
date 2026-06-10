"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Cluster } from "@/lib/types";
import { ConfidenceBar, SeverityBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

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

// ── Logo ──────────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke="#f97316" strokeWidth="1.2" opacity="0.5"/>
      <path d="M3.5 12C5.5 7.5 8.5 5.5 12 5.5C15.5 5.5 18.5 7.5 20.5 12C18.5 16.5 15.5 18.5 12 18.5C8.5 18.5 5.5 16.5 3.5 12Z" stroke="#f97316" strokeWidth="1.3" fill="none"/>
      <circle cx="12" cy="12" r="3" fill="#f97316"/>
      <circle cx="13.2" cy="10.8" r="0.9" fill="rgba(255,255,255,0.6)"/>
    </svg>
  );
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.1rem" }}>🧠</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace" }}>AI INSIGHT {idx + 1}/{insights.length}</span>
            <span style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.18)", fontSize: "0.62rem", fontWeight: 600, color: "var(--accent)" }}>{current.confidence}% confidence</span>
          </div>
          <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fff", margin: "0 0 3px", lineHeight: 1.4 }}>{current.headline}</p>
          <p style={{ color: "var(--muted-light)", fontSize: "0.81rem", margin: 0, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{current.detail}</p>
          {insights.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {insights.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 5, height: 5, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, background: i === idx ? "var(--accent)" : "rgba(255,255,255,0.16)", transition: "all 0.2s" }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {idx < insights.length - 1 && (
            <button onClick={() => setIdx((i) => i + 1)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 7, color: "#fff", cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>›</button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted-dim)", cursor: "pointer", padding: "4px 6px", fontSize: "0.9rem", borderRadius: 5, lineHeight: 1 }}>✕</button>
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
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className={`pipeline-step ${i <= 1 ? "ps-active" : "ps-pending"}`}>
            <span className={`step-badge ${i <= 1 ? "active" : "pending"}`}>{i < 1 ? "✓" : i + 1}</span>
            {step.label}
            {step.count > 0 && <span style={{ color: "var(--muted)", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>×{step.count}</span>}
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent)", minWidth: 12, maxWidth: 36 }} />}
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
    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 16px", height: 38, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 16, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse-dot 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted-light)", letterSpacing: "0.02em" }}>Live</span>
      </div>
      <div style={{ width: 1, height: 16, background: "var(--border)", marginRight: 16, flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 12px", flexShrink: 0 }} />}
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{item.value}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "-0.01em" }}>{item.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 16, flexShrink: 0 }}>
        <div style={{ width: 1, height: 14, background: "var(--border)", marginRight: 4 }} />
        <span style={{ fontSize: "0.7rem", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace" }}>Last run: 2m ago</span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {chips.map(({ name, count }) => {
        const color = colors[name] ?? "#9aa3b2";
        return (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 600, color, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>{name}</span>
              <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((count / max) * 100)}%`, background: color, borderRadius: 3, opacity: 0.7, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
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

  const sharebtn = (key: string, label: string, style?: React.CSSProperties) => {
    const state = shareState[key] ?? "idle";
    return (
      <button className="btn-ghost" onClick={() => simulateShare(key)} disabled={state !== "idle"} style={{ opacity: state === "sending" ? 0.5 : 1, ...style }}>
        {state === "sending" ? "Sending…" : state === "done" ? `✓ Sent` : label}
      </button>
    );
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="760px">
      <div style={{ padding: 36 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "var(--accent-violet)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Intent Snapshot</span>
              <SeverityBadge severity={cluster.severity_label} />
            </div>
            <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.3rem", margin: 0 }}>{cluster.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.4rem", padding: "0 0 0 16px" }}>×</button>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Confidence</div>
            <ConfidenceBar value={cluster.confidence} />
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Evidence</div>
            <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}>{cluster.evidence_count} signals</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Sources</div>
            <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}>
              {sourceChips(cluster).map(({ name, count }) => `${name} ${count}`).join(" · ")}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center" as const, padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(70,230,166,0.2)", borderTopColor: "var(--accent-green)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Generating intent snapshot with Claude…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : shown && snapshot ? (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
            <div>
              <h4 style={{ color: "var(--accent-green)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Problem Statement</h4>
              <p style={{ color: "white", lineHeight: 1.6, margin: 0, fontSize: "0.95rem" }}>{snapshot.problem_statement}</p>
            </div>
            <div style={{ padding: 20, borderRadius: 12, background: "rgba(70,230,166,0.06)", border: "1px solid rgba(70,230,166,0.15)" }}>
              <h4 style={{ color: "var(--accent-green)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Recommended Solution</h4>
              <p style={{ color: "white", lineHeight: 1.6, margin: 0, fontSize: "0.95rem" }}>{snapshot.recommended_solution}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(110,168,255,0.06)", border: "1px solid rgba(110,168,255,0.15)" }}>
                <h4 style={{ color: "var(--accent-blue)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Acceptance Criteria</h4>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  {snapshot.acceptance_criteria.map((c, i) => <li key={i} style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{c}</li>)}
                </ul>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <h4 style={{ color: "var(--accent-violet)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Success Metrics</h4>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  {snapshot.success_metrics.map((m, i) => <li key={i} style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{m}</li>)}
                </ul>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
              <div style={{ flex: 1, minWidth: 200, padding: "16px 20px", borderRadius: 12, background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.2)" }}>
                <div style={{ color: "var(--warning)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>Effort Estimate</div>
                <div style={{ color: "white", fontWeight: 600 }}>{snapshot.effort_estimate}</div>
              </div>
              {cluster.customer_quote && (
                <div style={{ flex: 2, minWidth: 200, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>Customer Voice</div>
                  <blockquote style={{ margin: 0, color: "white", fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.5, borderLeft: "3px solid var(--accent-green)", paddingLeft: 12 }}>
                    &ldquo;{cluster.customer_quote}&rdquo;
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {sharebtn("slack", "⚡ Share to Slack")}

          {/* WhatsApp alert, prominent */}
          <button className="btn-ghost" onClick={() => simulateShare("whatsapp")} disabled={shareState["whatsapp"] !== "idle" && shareState["whatsapp"] !== undefined} style={{ borderColor: "rgba(70,230,166,0.35)", color: "#46e6a6", opacity: shareState["whatsapp"] === "sending" ? 0.5 : 1 }}>
            {shareState["whatsapp"] === "sending" ? "Sending…" : shareState["whatsapp"] === "done" ? "✓ Alert Sent" : "💬 WhatsApp Alert"}
          </button>

          {sharebtn("email", "✉️ Email Brief", { borderColor: "rgba(110,168,255,0.3)", color: "var(--accent-blue)" })}

          {/* Jira */}
          <button className="btn-ghost" onClick={createJira} disabled={shareState["jira"] !== "idle" && shareState["jira"] !== undefined} style={{ borderColor: "rgba(38,132,255,0.3)", color: "#2684ff", opacity: shareState["jira"] === "sending" ? 0.5 : 1 }}>
            {shareState["jira"] === "sending" ? "Creating…" : jiraTicket ? `✓ ${jiraTicket} Created` : "📋 Create Jira Ticket"}
          </button>

          <button className="btn-ghost" onClick={exportMd} style={{ borderColor: "rgba(167,139,250,0.3)", color: "var(--accent-violet)" }}>↓ Export PRD</button>
          <button className="btn-ghost" onClick={copyMd} style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--muted)" }}>{copied ? "✓ Copied!" : "Copy"}</button>
        </div>

        {/* WhatsApp alert preview */}
        {shareState["whatsapp"] === "done" && (
          <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 10, background: "rgba(70,230,166,0.06)", border: "1px solid rgba(70,230,166,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "0.8rem" }}>💬</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#46e6a6", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>WhatsApp Alert Sent · +1 555 0147</span>
              <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace" }}>just now</span>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--muted-light)", lineHeight: 1.6 }}>
              <span style={{ color: "#46e6a6", fontWeight: 700 }}>*Observer Alert*</span>{"\n"}<br />
              ⚠️ {severityLabel(cluster.severity).toUpperCase()} · Score {cluster.severity}/100<br />
              {cluster.title}<br /><br />
              📊 {cluster.evidence_count} signals · {Math.round(cluster.confidence * 100)}% confidence<br />
              ✅ Action: {cluster.recommended_action.slice(0, 80)}…
            </div>
          </div>
        )}

        {jiraTicket && (
          <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(38,132,255,0.06)", border: "1px solid rgba(38,132,255,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.9rem" }}>📋</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2684ff" }}>Jira ticket created: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{jiraTicket}</span></div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>Assigned to Product · Sprint 14 · Priority: {severityLabel(cluster.severity)}</div>
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
    <div className={`signal-card sev-${sev} ${selected ? "selected" : ""} stagger-${Math.min(staggerIndex + 1, 8)}`} onClick={onClick} style={{ padding: "16px 18px 14px 20px", cursor: "pointer", position: "relative" as const }}>
      {approval !== "pending" && (
        <div style={{ position: "absolute" as const, top: 12, right: 14, padding: "2px 8px", borderRadius: 5, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", background: approval === "approved" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: approval === "approved" ? "#4ade80" : "#f87171", border: `1px solid ${approval === "approved" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}` }}>
          {approval === "approved" ? "✓ Approved" : "✕ Rejected"}
        </div>
      )}
      <h3 style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "0.96rem", lineHeight: 1.45, color: "#fff", letterSpacing: "-0.018em", paddingRight: approval !== "pending" ? 90 : 0 }}>
        {cluster.title}
      </h3>
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 10 }}>
          {chips.map(({ name, count }) => (
            <span key={name} style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.62rem", fontWeight: 600, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              {name}<span style={{ opacity: 0.4, fontWeight: 400, marginLeft: 4 }}>{count}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={`badge badge-${sev}`}>{sev}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.67rem", color: "var(--muted)" }}>
          <span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>{cluster.evidence_count}</span> sig
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.67rem", color: "var(--muted)" }}>
          <span style={{ color, fontWeight: 700 }}>{confPct}%</span>
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--muted-dim)" }}>{urgencyLabel(cluster.severity)}</span>
      </div>
      <div style={{ marginTop: 11, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${confPct}%`, background: color, opacity: 0.5, borderRadius: 1 }} />
      </div>
    </div>
  );
}

// ── Brief Section ─────────────────────────────────────────────────────────────

function BriefSection({ number, label, accentColor, children }: { number: string; label: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ height: 1, background: "var(--border)", margin: "0 18px" }} />
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <div style={{ width: 2, height: 12, borderRadius: 1, flexShrink: 0, background: accentColor || "rgba(255,255,255,0.14)" }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace" }}>{number} · {label}</span>
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
    <div ref={ref} style={{ position: "absolute" as const, bottom: "calc(100% + 8px)", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      {done ? (
        <div style={{ textAlign: "center" as const, padding: "12px 0" }}>
          <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>✓</div>
          <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "0.84rem" }}>Brief distributed</div>
          <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: 3 }}>
            {sel.includes("whatsapp") && waRecipients.length > 0
              ? `WhatsApp → ${selectedNames.join(", ")}`
              : `Sent via ${sel.join(", ")}`}
          </div>
        </div>
      ) : step === "recipients" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setStep("channels")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem", padding: "0 2px" }}>←</button>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "#46e6a6", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace" }}>WhatsApp Recipients</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, marginBottom: 14 }}>
            {WA_RECIPIENTS.map((r) => {
              const active = waRecipients.includes(r.id);
              return (
                <button key={r.id} onClick={() => setWaRecipients((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${active ? "#46e6a655" : "rgba(255,255,255,0.08)"}`, background: active ? "#46e6a611" : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left" as const, transition: "all 0.12s" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: active ? "#46e6a622" : "rgba(255,255,255,0.06)", border: `1.5px solid ${active ? "#46e6a6" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: active ? "#46e6a6" : "var(--muted)", flexShrink: 0, letterSpacing: "0.02em" }}>
                    {r.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: active ? "#46e6a6" : "#fff" }}>{r.name}</div>
                    <div style={{ fontSize: "0.67rem", color: "var(--muted)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{r.role} · {r.phone}</div>
                  </div>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${active ? "#46e6a6" : "rgba(255,255,255,0.2)"}`, background: active ? "#46e6a6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {active && <span style={{ color: "#000", fontSize: "0.55rem", fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={doSend} disabled={waRecipients.length === 0} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: waRecipients.length > 0 ? "#46e6a6" : "rgba(255,255,255,0.05)", border: "none", color: waRecipients.length > 0 ? "#000" : "var(--muted-dim)", fontWeight: 700, fontSize: "0.82rem", cursor: waRecipients.length > 0 ? "pointer" : "default", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : `Send to ${waRecipients.length} recipient${waRecipients.length !== 1 ? "s" : ""}`}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-dim)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>Distribute Brief</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 14 }}>
            {DIST_CHANNELS.map(({ key, label, icon, desc, accent }) => {
              const active = sel.includes(key);
              return (
                <button key={key} onClick={() => setSel((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${active ? (accent ? `${accent}55` : "rgba(249,115,22,0.35)") : "rgba(255,255,255,0.08)"}`, background: active ? (accent ? `${accent}11` : "rgba(249,115,22,0.07)") : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left" as const, transition: "all 0.12s" }}>
                  <span style={{ fontSize: "0.95rem" }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: active ? (accent ?? "var(--accent)") : "#fff" }}>{label}</div>
                    <div style={{ fontSize: "0.67rem", color: "var(--muted)" }}>{desc}</div>
                  </div>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${active ? (accent ?? "var(--accent)") : "rgba(255,255,255,0.2)"}`, background: active ? (accent ?? "var(--accent)") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {active && <span style={{ color: "#000", fontSize: "0.55rem", fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={handleNext} disabled={sel.length === 0} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: sel.length > 0 ? "var(--accent)" : "rgba(255,255,255,0.05)", border: "none", color: sel.length > 0 ? "#fff" : "var(--muted-dim)", fontWeight: 600, fontSize: "0.82rem", cursor: sel.length > 0 ? "pointer" : "default" }}>
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
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 320 }}>
        <p style={{ color: "var(--muted-dim)", fontSize: "0.78rem", margin: 0, textAlign: "center" as const, maxWidth: 160, lineHeight: 1.65, fontFamily: "'JetBrains Mono', monospace" }}>Select a signal<br />to open its brief</p>
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
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-dim)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace" }}>Intel Brief</span>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace" }}>#{briefId}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {approval !== "pending" && (
            <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: approval === "approved" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: approval === "approved" ? "#4ade80" : "#f87171", border: `1px solid ${approval === "approved" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
              {approval === "approved" ? "✓ approved" : "✕ rejected"}
            </span>
          )}
          <span className={`badge badge-${sev}`}>{sev}</span>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse-dot 2s ease-in-out infinite" }} />
        </div>
      </div>

      {/* Score + title */}
      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2.6rem", fontWeight: 900, lineHeight: 0.9, color, letterSpacing: "-0.05em" }}>{cluster.severity}</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--muted-dim)", letterSpacing: "0.08em", textTransform: "uppercase" as const, paddingBottom: 3 }}>/ 100</span>
        </div>
        <h4 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: "#fff", lineHeight: 1.5, letterSpacing: "-0.015em" }}>{cluster.title}</h4>
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 18px" }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600, color: activeTab === tab.key ? "var(--accent)" : "var(--muted)", borderBottom: `2px solid ${activeTab === tab.key ? "var(--accent)" : "transparent"}`, transition: "all 0.12s", letterSpacing: "0.02em", marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Action */}
      {activeTab === "assessment" && (
        <>
          <BriefSection number="01" label="Assessment" accentColor={color}>
            <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "var(--muted-light)", lineHeight: 1.7 }}>{cluster.recommended_action}</p>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" as const }}>Urgency</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>{urgencyLabel(cluster.severity)}</span>
            </div>
          </BriefSection>

          {/* ── Distribute CTA ── */}
          <div style={{ padding: "0 18px 18px" }}>
            <div style={{ borderRadius: 10, background: "linear-gradient(135deg, rgba(70,230,166,0.07) 0%, rgba(70,230,166,0.03) 100%)", border: "1px solid rgba(70,230,166,0.18)", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "#46e6a6", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>Share Brief</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Alert your team via WhatsApp, Slack or Email</div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ fontSize: "1rem" }}>💬</span>
                  <span style={{ fontSize: "1rem" }}>⚡</span>
                  <span style={{ fontSize: "1rem" }}>✉️</span>
                </div>
              </div>
              <div style={{ position: "relative" as const }}>
                <button
                  onClick={() => setShowDistribute((v) => !v)}
                  style={{ width: "100%", padding: "11px 16px", borderRadius: 8, background: showDistribute ? "rgba(70,230,166,0.2)" : "rgba(70,230,166,0.12)", border: `1.5px solid ${showDistribute ? "rgba(70,230,166,0.6)" : "rgba(70,230,166,0.35)"}`, color: "#46e6a6", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s", letterSpacing: "0.01em" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(70,230,166,0.2)"; e.currentTarget.style.borderColor = "rgba(70,230,166,0.6)"; }}
                  onMouseLeave={(e) => { if (!showDistribute) { e.currentTarget.style.background = "rgba(70,230,166,0.12)"; e.currentTarget.style.borderColor = "rgba(70,230,166,0.35)"; } }}
                >
                  <span style={{ fontSize: "1rem" }}>↗</span>
                  {showDistribute ? "Close" : "Distribute Brief"}
                  <span style={{ marginLeft: "auto", fontSize: "0.7rem", opacity: 0.7 }}>{showDistribute ? "▲" : "▼"}</span>
                </button>
                {showDistribute && <DistributePopover cluster={cluster} onClose={() => setShowDistribute(false)} />}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab: Evidence */}
      {activeTab === "evidence" && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.6rem", color: "var(--muted-dim)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Evidence</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>{cluster.evidence_count}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2 }}>customer signals</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.6rem", color: "var(--muted-dim)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>Confidence</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", fontWeight: 800, color, letterSpacing: "-0.04em" }}>{confPct}%</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2 }}>AI confidence</div>
            </div>
          </div>
          {chips.length > 0 && (
            <>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>Source breakdown</div>
              <SourceBreakdownChart cluster={cluster} />
            </>
          )}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Confidence</div>
            <ConfidenceBar value={cluster.confidence} />
          </div>
        </div>
      )}

      {/* Tab: Business */}
      {activeTab === "business" && (
        <div style={{ padding: "16px 18px" }}>
          {cluster.customer_quote && (
            <blockquote style={{ margin: "0 0 14px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${color}`, borderRadius: "0 8px 8px 0", fontSize: "0.82rem", color: "var(--muted-light)", lineHeight: 1.65, fontStyle: "italic" }}>
              &ldquo;{cluster.customer_quote}&rdquo;
            </blockquote>
          )}
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted-light)", lineHeight: 1.7 }}>{cluster.business_case}</p>
        </div>
      )}

      {/* Tab: Decide */}
      {activeTab === "disposition" && (
        <div style={{ padding: "16px 18px" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.55 }}>Approve to add to sprint backlog. Reject to dismiss. Distribute to notify your team.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className={`btn-approve ${approval === "approved" ? "approved" : ""}`} onClick={onApprove}>
              ✓ {approval === "approved" ? "Approved" : "Approve"}
            </button>
            <button className={`btn-reject ${approval === "rejected" ? "rejected" : ""}`} onClick={onReject}>
              ✕ {approval === "rejected" ? "Rejected" : "Reject"}
            </button>
          </div>

          {/* View Full Brief / PRD */}
          <button onClick={onViewFull} style={{ width: "100%", marginBottom: 8, padding: "9px 14px", borderRadius: 8, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", color: "var(--accent-violet)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.06)"; }}
          >
            🧠 Generate Intent Snapshot & PRD
          </button>

          {/* Distribute */}
          <div style={{ position: "relative" as const }}>
            <button onClick={() => setShowDistribute((v) => !v)} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: showDistribute ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${showDistribute ? "rgba(249,115,22,0.28)" : "var(--border)"}`, color: showDistribute ? "var(--accent)" : "var(--muted-light)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.12s" }}>
              ↗ Distribute Brief
              <span style={{ marginLeft: "auto", fontSize: "0.65rem", opacity: 0.6 }}>{showDistribute ? "▲" : "▼"}</span>
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Top accent line */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.6) 30%, rgba(249,115,22,0.6) 70%, transparent 100%)" }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <LogoMark />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em", color: "#fff" }}>Observer</span>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>
        <div style={{ marginBottom: 28, textAlign: "center" as const }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>Demo Access</div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.025em" }}>Totefolk Dashboard</h2>
          <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>Sign in to view the product intelligence demo</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@totefolk.com"
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`, color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`, color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "0.75rem", color: "#f87171", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, width: "100%", padding: "12px 16px", borderRadius: 8, background: loading ? "rgba(249,115,22,0.5)" : "var(--accent)", border: "none", color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "opacity 0.15s", letterSpacing: "0.01em" }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)", textAlign: "center" as const }}>
          <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Demo Nav ─────────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.93)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.55) 30%, rgba(249,115,22,0.55) 70%, transparent 100%)" }} />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 50 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, marginRight: 14, flexShrink: 0 }}>
            <LogoMark />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", fontStyle: "italic", letterSpacing: "-0.02em" }}>Observer</span>
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", marginRight: 14 }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>DEMO · Totefolk</span>
          {approvedCount > 0 && (
            <span style={{ marginLeft: 12, padding: "2px 8px", borderRadius: 5, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)", fontSize: "0.62rem", fontWeight: 700, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>{approvedCount} approved</span>
          )}
          <div style={{ flex: 1 }} />
          <Link href="/signup" style={{ textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "var(--accent)", fontSize: "0.78rem", fontWeight: 600, flexShrink: 0 }}>
            Use Observer for your product →
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: "0.95rem" }}>👜</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Totefolk, Signals</h1>
            </div>
            <p style={{ margin: 0, color: "var(--muted-light)", fontSize: "0.86rem" }}>Clustered product intelligence from Email · Zendesk · Intercom · Reddit</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {["EMAIL", "ZENDESK", "INTERCOM", "REDDIT"].map((src) => (
              <span key={src} style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />{src}
              </span>
            ))}
          </div>
        </div>

        {/* AI Insight Banner */}
        {showBanner && (
          <div style={{ marginBottom: 14 }}>
            <AIInsightBanner clusters={TOTEFOLK_CLUSTERS} onClose={() => setShowBanner(false)} />
          </div>
        )}

        {/* Pipeline Stepper */}
        <div style={{ marginBottom: 16 }}>
          <PipelineStepper />
        </div>

        {/* Status Strip */}
        <StatusStrip />

        {/* Filter + sort bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8, flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "critical", "high", "medium"] as const).map((f) => (
              <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {filterCounts[f] > 0 && <span style={{ marginLeft: 4, fontSize: "0.65rem", fontWeight: 700, color: filter === f ? "var(--accent)" : "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace" }}>{filterCounts[f]}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.02em" }}>Sort:</span>
            {(["severity", "evidence", "confidence"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 500, background: sortBy === s ? "rgba(255,255,255,0.09)" : "none", color: sortBy === s ? "#fff" : "var(--muted)", transition: "all 0.12s" }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {filtered.map((c, idx) => (
              <SignalCard key={c.id} cluster={c} selected={selected?.id === c.id} onClick={() => setSelected(c)} staggerIndex={idx} approval={approvals[c.id] ?? "pending"} />
            ))}
          </div>
          <div style={{ position: "sticky", top: 66 }}>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
