"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { IntentSnapshotModal } from "@/components/IntentSnapshotModal";
import { severityLabel } from "@/lib/plans";
import type { Cluster, Workspace, OutputConfig as _OutputConfig } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000));
}

function _primarySource(cluster: Cluster): string {
  const sb = cluster.source_breakdown ?? {};
  const entries = Object.entries(sb).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? entries[0][0].toUpperCase() : "MIXED";
}

function _extractTags(cluster: Cluster): string[] {
  const stopwords = new Set(["the","and","for","with","from","that","this","are","was","were","has","have","its","our","your","their","which","what","when","how","who"]);
  const text = `${cluster.title} ${cluster.business_case ?? ""}`;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w))
    .slice(0, 3)
    .map((w) => w.replace(/\s+/g, "-"));
  return [...new Set(words)];
}

function urgencyLabel(s: number): string {
  if (s >= 80) return "Acil";
  if (s >= 60) return "Yakında";
  if (s >= 35) return "Fırsatta";
  return "Düşük öncelik";
}

function timeSince(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function _revenueImpact(business_case?: string): string {
  if (!business_case) return "Unknown";
  const bc = business_case.toLowerCase();
  if (bc.includes("critical") || bc.includes("revenue") || bc.includes("churn")) return "High, Revenue risk";
  if (bc.includes("enterprise") || bc.includes("scalab")) return "Medium, Enterprise";
  if (bc.includes("polish") || bc.includes("minor") || bc.includes("typo")) return "Low, Polish";
  return "Medium, Growth";
}

function severityColor(sev: "critical" | "high" | "medium" | "low"): string {
  switch (sev) {
    case "critical": return "#ef4444";
    case "high":     return "#f97316";
    case "medium":   return "#f59e0b";
    default:         return "rgba(255,255,255,0.28)";
  }
}

function sourceChips(cluster: Cluster): Array<{ name: string; count: number }> {
  const sb = cluster.source_breakdown ?? {};
  return Object.entries(sb)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

// ── Sample café/restaurant insights (shown when a workspace has no real data) ──
// Lets the dashboard demonstrate the product instantly, no setup or AI cost.
const now = Date.now();
const SAMPLE_CLUSTERS: Cluster[] = [
  {
    id: "sample-1", workspace_id: "sample",
    title: "Kadıköy şubenizde hafta sonu yavaş servis",
    severity: 88, severity_label: "high", confidence: 0.9, evidence_count: 14,
    source_breakdown: { "Google Reviews": 9, "Getir": 5 } as unknown as Cluster["source_breakdown"],
    business_case: "Cumartesi ve Pazar sabahları bekleme süreleri 18 dakikayı aşıyor. Bu hafta 14 müşteri şikayet etti — geçen haftanın neredeyse iki katı.",
    recommended_action: "Hafta sonu 8–11 arası vardiyaya bir kişi daha ekleyin; yoğunluk başlamadan önce bardak ve kapakları önceden hazırlayın.",
    customer_quote: "18 dakika bekledim, siparişim unutuldu. Hafta sonu sabahları berbat.",
    projected_impact: "Hafta sonu sabah geliri tehlikede",
    status: "active", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  },
  {
    id: "sample-2", workspace_id: "sample",
    title: "Gece geç saatlerde soğuk yemek teslimatı",
    severity: 72, severity_label: "high", confidence: 0.84, evidence_count: 11,
    source_breakdown: { "Yemeksepeti": 7, "Getir": 4 } as unknown as Cluster["source_breakdown"],
    business_case: "Cuma ve Cumartesi geceleri saat 21:00'den sonra soğuk yemek şikayetleri üçe katlandı; neredeyse tamamı bir saati aşan teslimatlardan kaynaklanıyor.",
    recommended_action: "Akşam kurye teslim sürecini gözden geçirin; yemek teslimattan önce beklemeyecek şekilde mutfak zamanlamasını ayarlayın.",
    customer_quote: "Yemek soğuk geldi, 70 dakika sürdü. Üçüncü kez geç geliyor.",
    projected_impact: "Hafta sonu gece tekrar siparişleri düşüyor",
    status: "active", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  },
  {
    id: "sample-3", workspace_id: "sample",
    title: "Yoğun saatlerde yanlış ve eksik siparişler",
    severity: 54, severity_label: "medium", confidence: 0.78, evidence_count: 6,
    source_breakdown: { "Yemeksepeti": 4, "Google Reviews": 2 } as unknown as Cluster["source_breakdown"],
    business_case: "Yoğun saatlerde sipariş hataları artıyor: yanlış ürünler, eksik içecekler ve özel notlar (yulaf sütü, şekersiz) göz ardı ediliyor.",
    recommended_action: "Yoğun saatlerde siparişler müşteriye verilmeden önce 10 saniyelik çift kontrol uygulayın.",
    customer_quote: "Yanlış sipariş geldi, içecek eksik. Kontrol edilmiyor galiba.",
    projected_impact: "İade talepleri yavaş yavaş artıyor",
    status: "active", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  },
  {
    id: "sample-4", workspace_id: "sample",
    title: "Öğleden sonra müzik biraz yüksek",
    severity: 31, severity_label: "low", confidence: 0.62, evidence_count: 3,
    source_breakdown: { "Google Reviews": 3 } as unknown as Cluster["source_breakdown"],
    business_case: "Son yorumlarda birkaç müşteri, öğleden sonra müziğin yüksek olduğu için çalışmak veya sohbet etmenin zorlaştığını belirtiyor.",
    recommended_action: "Hafta içi 14:00–17:00 arası sesi bir tık kısın.",
    customer_quote: "Kahve güzel ama müzik biraz yüksekti öğleden sonra.",
    projected_impact: "Küçük konfor sorunu, kolay kazanım",
    status: "active", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  },
];

// ── Score Ring (SVG arc) ──────────────────────────────────────────────────────

function _ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = size * 0.375;
  const circ = 2 * Math.PI * r;
  const sev = severityLabel(score);
  const color = severityColor(sev);
  const offset = circ * (1 - score / 100);
  const cx = size / 2;
  const sw = size === 48 ? 3.5 : 3;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          className="[transition:stroke-dashoffset_0.8s_cubic-bezier(0.4,0,0.2,1)]"
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center font-['JetBrains_Mono',monospace] font-extrabold tracking-[-0.03em]",
          size === 48 ? "text-[0.78rem]" : "text-[0.65rem]",
        )}
        style={{ color }}
      >
        {score}
      </div>
    </div>
  );
}

// ── Pipeline Stepper ──────────────────────────────────────────────────────────

function _PipelineStepper({ signalCount, clusterCount }: { signalCount: number; clusterCount: number }) {
  const steps = [
    { key: "ingest",  label: "Ingest",  count: signalCount },
    { key: "cluster", label: "Cluster", count: clusterCount },
    { key: "decide",  label: "Decide",  count: clusterCount },
    { key: "spec",    label: "Spec",    count: clusterCount > 0 ? 1 : 0 },
    { key: "measure", label: "Measure", count: clusterCount > 0 ? 1 : 0 },
  ];
  const activeIndex = clusterCount > 0 ? 1 : signalCount > 0 ? 0 : -1;

  return (
    <div className="flex items-center gap-0 rounded-xl border bg-card px-[18px] py-2.5">
      {steps.map((step, i) => {
        const state = i < activeIndex ? "ps-done" : i === activeIndex ? "ps-active" : "ps-pending";
        const badgeState = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        return (
          <React.Fragment key={step.key}>
            <div className={`pipeline-step ${state}`}>
              <span className={`step-badge ${badgeState}`}>
                {i < activeIndex ? "✓" : i + 1}
              </span>
              {step.label}
              {step.count > 0 && (
                <span className="font-['JetBrains_Mono',monospace] text-[0.7rem] text-muted-foreground">
                  ×{step.count}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="h-px min-w-[12px] max-w-[36px] flex-1 bg-gradient-to-r from-border to-transparent" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── AI Insight Banner ─────────────────────────────────────────────────────────

function AIInsightBanner({ clusters, onClose }: { clusters: Cluster[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const insights = clusters.slice(0, 3).map((c) => {
    const sev = severityLabel(c.severity);
    const emoji = sev === "critical" ? "🔴" : sev === "high" ? "🟠" : "🟡";
    return {
      headline: `${emoji} ${sev.charAt(0).toUpperCase() + sev.slice(1)} priority signal detected`,
      detail: c.title,
      confidence: c.confidence,
      sev,
    };
  });
  if (insights.length === 0) return null;
  const current = insights[idx];

  return (
    <div className="ai-insight-banner">
      <div className="flex items-start gap-3.5">
        {/* Brain icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(249,115,22,0.22)] bg-[rgba(249,115,22,0.1)] text-[1.1rem]">🧠</div>

        <div className="min-w-0 flex-1">
          <div className="mb-[5px] flex items-center gap-2">
            <span className="font-['JetBrains_Mono',monospace] text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">
              AI INSIGHT {idx + 1}/{insights.length}
            </span>
            <span className="rounded border border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.1)] px-[7px] py-0.5 text-[0.62rem] font-semibold text-primary">
              {Math.round(current.confidence * 100)}% confidence
            </span>
          </div>
          <p className="mb-[3px] text-[0.92rem] font-semibold leading-[1.4] text-foreground">
            {current.headline}
          </p>
          <p className="line-clamp-2 text-[0.81rem] leading-[1.55] text-[var(--muted-light)]">
            {current.detail}
          </p>
          {insights.length > 1 && (
            <div className="mt-2.5 flex gap-1">
              {insights.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-[5px] cursor-pointer rounded-[3px] border-none p-0 transition-all duration-200",
                    i === idx ? "w-[18px] bg-primary" : "w-[5px] bg-[rgba(255,255,255,0.16)]",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {idx < insights.length - 1 && (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border bg-[rgba(255,255,255,0.06)] text-base text-foreground"
            >›</button>
          )}
          <button
            onClick={onClose}
            className="cursor-pointer rounded-[5px] border-none bg-transparent px-1.5 py-1 text-[0.9rem] leading-none text-[var(--muted-dim)]"
          >✕</button>
        </div>
      </div>
    </div>
  );
}
void AIInsightBanner;

// ── Insight Card ──────────────────────────────────────────────────────────────

function SignalCard({
  cluster, selected, onClick, staggerIndex,
}: {
  cluster: Cluster;
  selected: boolean;
  onClick: () => void;
  staggerIndex: number;
}) {
  const score = cluster.severity;
  const sev = severityLabel(score);
  const chips = sourceChips(cluster);
  const staggerClass = `stagger-${Math.min(staggerIndex + 1, 8)}`;

  return (
    <div
      className={cn(
        `signal-card sev-${sev} ${selected ? "selected" : ""} ${staggerClass}`,
        "cursor-pointer pt-4 pr-[18px] pb-3.5 pl-5",
      )}
      onClick={onClick}
    >
      {/* Title, visual hero */}
      <h3 className="mb-2.5 text-[0.96rem] font-bold leading-[1.45] tracking-[-0.018em] text-foreground">
        {cluster.title}
      </h3>

      {/* Meta row, plain language */}
      <div className="flex items-center gap-2.5">
        <span className={`badge badge-${sev}`}>{urgencyLabel(score)}</span>
        <span className="text-[0.78rem] text-[var(--muted-light)]">
          <span className="font-semibold text-foreground">{cluster.evidence_count}</span> müşteri bahsetti
        </span>
        {chips.length > 0 && (
          <span className="ml-auto text-[0.72rem] text-[var(--muted-dim)]">
            {chips.slice(0, 2).map((c) => c.name).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Brief Section ─────────────────────────────────────────────────────────────

function BriefSection({
  label, accentColor, children,
}: {
  number?: string;
  label: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-[18px] h-px bg-border" />
      <div className="px-[18px] py-3.5">
        <div className="mb-2.5 flex items-center gap-[7px]">
          <div
            className="h-3 w-[2px] flex-shrink-0 rounded-[1px]"
            style={{ background: accentColor || "rgba(255,255,255,0.14)" }}
          />
          <span className="text-[0.7rem] font-bold tracking-[0.02em] text-[var(--muted-light)]">
            {label}
          </span>
        </div>
        {children}
      </div>
    </>
  );
}

// ── Execution Brief ───────────────────────────────────────────────────────────

type ApprovalState = "pending" | "approved" | "rejected";

function _OutputButton({
  label, icon, href, configured,
}: { label: string; icon: string; href: string; configured: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        "flex flex-1 items-center gap-[7px] rounded-[7px] border px-2.5 py-[7px] text-[0.75rem] font-semibold no-underline transition-all duration-[120ms]",
        configured
          ? "border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.05)] text-[#4ade80]"
          : "bg-[rgba(255,255,255,0.02)] text-muted-foreground",
        "hover:border-[rgba(249,115,22,0.25)] hover:bg-[rgba(249,115,22,0.07)] hover:text-primary",
      )}
    >
      <span className="text-[0.85rem]">{icon}</span>
      <span>{label}</span>
      {configured && <span className="ml-auto text-[0.62rem] opacity-70">↗</span>}
      {!configured && <span className="ml-auto text-[0.62rem] opacity-50">Set up</span>}
    </a>
  );
}

function ExecutionBrief({
  cluster, approval, onApprove, onReject, onViewFull,
}: {
  cluster: Cluster | null;
  approval: ApprovalState;
  onApprove: () => void;
  onReject: () => void;
  onViewFull: () => void;
}) {
  if (!cluster) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[14px] border bg-card p-8">
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.08)] to-transparent" />
        <p className="max-w-[160px] text-center font-['JetBrains_Mono',monospace] text-[0.78rem] leading-[1.65] text-[var(--muted-dim)]">
          Bir sinyal seçin<br />özeti açmak için
        </p>
      </div>
    );
  }

  const sev = severityLabel(cluster.severity);
  const chips = sourceChips(cluster);

  return (
    <div className="overflow-hidden rounded-[14px] border bg-card">
      {/* Title block, plain header */}
      <div className="px-[18px] pt-[18px] pb-1">
        <span className={`badge badge-${sev} mb-3 inline-block`}>
          {urgencyLabel(cluster.severity)}
        </span>
        <h4 className="mb-2 text-[1.05rem] font-bold leading-[1.4] tracking-[-0.015em] text-foreground">
          {cluster.title}
        </h4>
        <p className="text-[0.78rem] text-muted-foreground">
          {cluster.evidence_count} müşteri bahsetti
          {chips.length > 0 && <span> · {chips.slice(0, 3).map((c) => c.name).join(", ")}</span>}
        </p>
      </div>

      {/* What's happening */}
      <BriefSection label="Neler oluyor">
        <p className="text-[0.85rem] leading-[1.65] text-[var(--muted-light)]">
          {cluster.business_case || cluster.recommended_action || ","}
        </p>
      </BriefSection>

      {/* What it's costing you */}
      {cluster.projected_impact && (
        <BriefSection label="Size maliyeti" accentColor="#f59e0b">
          <div className="rounded-lg border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.06)] px-3.5 py-3">
            <div className="text-[0.92rem] font-bold leading-[1.4] text-foreground">
              💰 {cluster.projected_impact}
            </div>
          </div>
        </BriefSection>
      )}

      {/* What to do */}
      <BriefSection label="Ne yapmalı" accentColor="#22c55e">
        <p className="text-[0.85rem] leading-[1.65] text-[var(--muted-light)]">
          {cluster.recommended_action || ","}
        </p>
      </BriefSection>

      {/* Decision */}
      <BriefSection label="Kararınız">
        <div className="mb-2.5 flex gap-2">
          <button
            className={`btn-approve ${approval === "approved" ? "approved" : ""}`}
            onClick={onApprove}
          >
            ✓ {approval === "approved" ? "Onaylandı" : "Önemli görünüyor"}
          </button>
          <button
            className={`btn-reject ${approval === "rejected" ? "rejected" : ""}`}
            onClick={onReject}
          >
            ✕ {approval === "rejected" ? "Atlandı" : "Atla"}
          </button>
        </div>
        <button
          onClick={onViewFull}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-transparent px-3.5 py-2 text-[0.8rem] font-semibold text-primary transition-colors duration-[120ms] hover:border-[rgba(249,115,22,0.28)] hover:bg-[rgba(249,115,22,0.06)]"
        >
          ↗ Detayları gör
        </button>
      </BriefSection>

      {/* Sent to your phone */}
      <BriefSection label="Telefonunuza gönderildi" accentColor="#22c55e">
        {/* WhatsApp preview, the actual message your team receives */}
        <div className="mb-3 rounded-xl border border-[rgba(37,211,102,0.18)] bg-[#0c1419] p-3">
          <div className="mb-2.5 flex items-center gap-[7px]">
            <span className="text-[0.85rem]">💬</span>
            <span className="font-['JetBrains_Mono',monospace] text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#4ade80]">WhatsApp · ekibinizin aldığı mesaj</span>
          </div>
          <div className="rounded-[4px_10px_10px_10px] bg-[#1f2c34] px-3 py-2.5">
            <div className={cn(
              "mb-[5px] text-[0.74rem] font-extrabold",
              sev === "critical" ? "text-[#f87171]" : sev === "high" ? "text-[#fb923c]" : "text-[#fbbf24]",
            )}>
              {sev === "critical" ? "🔴" : sev === "high" ? "🟠" : "🟡"} {sev.toUpperCase()} · {cluster.severity}/100
            </div>
            <div className={cn(
              "text-[0.78rem] font-semibold leading-[1.5] text-[#e9edef]",
              cluster.projected_impact ? "mb-1.5" : "mb-2",
            )}>
              {cluster.title}
            </div>
            {cluster.projected_impact && (
              <div className="mb-2 text-[0.72rem] text-[#9fd9bf]">💰 {cluster.projected_impact}</div>
            )}
            <div className="border-t border-[rgba(255,255,255,0.07)] pt-[7px] text-[0.68rem] text-[#8696a0]">
              Yanıtla <span className="font-bold text-[#22c55e]">1</span> detaylar ·{" "}
              <span className="font-bold text-[#22c55e]">2</span> hallettim ·{" "}
              <span className="font-bold text-[#22c55e]">3</span> geç
            </div>
          </div>
        </div>
        <p className="mb-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
          WhatsApp, Slack ve e-posta ile otomatik iletilir, ekibiniz giriş yapmadan hareket eder.
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1.5 rounded-[7px] border bg-[rgba(255,255,255,0.02)] px-3 py-[7px] text-[0.75rem] font-semibold text-muted-foreground no-underline transition-all duration-[120ms] hover:border-[rgba(249,115,22,0.25)] hover:bg-[rgba(249,115,22,0.07)] hover:text-primary"
        >
          <span>⚡</span>
          <span>Slack · E-posta · WhatsApp Ayarla</span>
          <span className="ml-1 text-[0.62rem] opacity-50">↗</span>
        </Link>
      </BriefSection>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [approvals, setApprovals] = useState<Record<string, ApprovalState>>({});
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const decideCluster = async (clusterId: string, action: "approve" | "reject") => {
    // Optimistic local update for snappy UI
    const optimisticState: ApprovalState = action === "approve" ? "approved" : "rejected";
    setApprovals((a) => ({ ...a, [clusterId]: optimisticState }));

    try {
      const res = await fetch(`/api/clusters/${clusterId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        // Revert on failure
        setApprovals((a) => {
          const next = { ...a };
          delete next[clusterId];
          return next;
        });
        const data = await res.json().catch(() => ({}));
        setToast({ msg: data.error ?? "Couldn't save decision. Try again.", tone: "error" });
        setTimeout(() => setToast(null), 3500);
        return;
      }
      setToast({
        msg: action === "approve" ? "Approved" : "Dismissed",
        tone: "success",
      });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setApprovals((a) => {
        const next = { ...a };
        delete next[clusterId];
        return next;
      });
      setToast({ msg: "Network error, try again.", tone: "error" });
      setTimeout(() => setToast(null), 3500);
    }
  };
  const [_showInsightBanner, _setShowInsightBanner] = useState(true);
  const [severityFilter, _setSeverityFilter] = useState<"all"|"critical"|"high"|"medium"|"low">("all");
  const [sortBy, _setSortBy] = useState<"severity"|"evidence"|"confidence">("severity");
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [_seedingDemo, setSeedingDemo] = useState(false);
  const [_demoSeeded, setDemoSeeded] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  // Auth
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => { if (!res.ok) router.push("/login?redirect=/dashboard"); else setAuthChecked(true); })
      .catch(() => router.push("/login"));

    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => { if (d.workspace) setWorkspace(d.workspace); })
      .catch(() => {});

  }, [router]);

  const fetchClusters = useCallback(async () => {
    const res = await fetch("/api/analyze");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    const fetched: Cluster[] = data.clusters ?? [];
    setClusters(fetched);

    // Hydrate approvals from persisted cluster.status so decisions survive reload.
    // approved/dismissed are the two terminal states written by /api/respond
    // and /api/clusters/:id/decision; everything else stays "pending".
    const persistedApprovals: Record<string, ApprovalState> = {};
    for (const c of fetched) {
      if (c.status === "approved")  persistedApprovals[c.id] = "approved";
      if (c.status === "dismissed") persistedApprovals[c.id] = "rejected";
    }
    setApprovals((prev) => ({ ...persistedApprovals, ...prev })); // keep optimistic local wins

    if (fetched.length > 0 && !selectedCluster) setSelectedCluster(fetched[0]);
    setLoadingClusters(false);
  }, [router, selectedCluster]);

  const fetchSignalCount = useCallback(async () => {
    const res = await fetch("/api/signals?limit=1");
    if (!res.ok) return;
    const data = await res.json();
    setSignalCount(data.total ?? 0);
  }, []);

  useEffect(() => {
    if (authChecked) { fetchClusters(); fetchSignalCount(); }
  }, [authChecked, fetchClusters, fetchSignalCount]);

  // Auto-analyze: new signals turn into insights on their own, no manual "Run Analysis".
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!authChecked || loadingClusters || autoRanRef.current) return;
    if (clusters.length === 0 && signalCount > 0 && !analyzing) {
      autoRanRef.current = true;
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, loadingClusters, clusters.length, signalCount, analyzing]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setUpgradeRequired(false);
    try {
      // Trigger all 8 active ingest sources in parallel (each skips gracefully if not configured)
      await Promise.allSettled([
        fetch("/api/ingest/appstore",  { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/email",     { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/reddit",    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/zendesk",   { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/slack",     { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/intercom",  { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/jira",      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        fetch("/api/ingest/github",    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
      ]);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (analyzeRes.status === 402) {
        const data = await analyzeRes.json();
        setUpgradeRequired(true);
        setUpgradeMessage(data.error ?? "Upgrade required");
        return;
      }
      await fetchClusters();
      await fetchSignalCount();
      setLastRun(new Date());
    } finally {
      setAnalyzing(false);
    }
  };

  const _loadDemoData = async () => {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      if (res.ok) {
        setDemoSeeded(true);
        await fetchSignalCount();
        // Auto-run analysis after seeding so user sees results immediately
        await runAnalysis();
      }
    } finally {
      setSeedingDemo(false);
    }
  };

  const filteredClusters = clusters
    .filter((c) => {
      if (severityFilter === "all") return true;
      return severityLabel(c.severity) === severityFilter;
    })
    .sort((a, b) => {
      if (sortBy === "evidence") return b.evidence_count - a.evidence_count;
      if (sortBy === "confidence") return b.confidence - a.confidence;
      return b.severity - a.severity; // default: severity
    });

  // Prototype: whenever there are no real insights yet, show café sample data
  // so the dashboard ALWAYS demonstrates the product. Analysis runs in the
  // background (never blocks) and swaps in real insights when ready.
  const isSample = clusters.length === 0;
  const displayClusters = isSample ? SAMPLE_CLUSTERS : filteredClusters;
  const activeCluster = selectedCluster ?? displayClusters[0] ?? null;

  const plan = workspace?.plan ?? "trial";
  const polar_status = workspace?.polar_status;
  const trialDays = daysLeft(workspace?.trial_ends_at);
  const _filterCounts = {
    all: clusters.length,
    critical: clusters.filter((c) => severityLabel(c.severity) === "critical").length,
    high: clusters.filter((c) => severityLabel(c.severity) === "high").length,
    medium: clusters.filter((c) => severityLabel(c.severity) === "medium").length,
    low: clusters.filter((c) => severityLabel(c.severity) === "low").length,
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <Loader2 className="h-[38px] w-[38px] animate-spin text-[#f97316]" />
        <p className="text-[0.82rem] text-muted-foreground">Çalışma alanı yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* ── Plan banners ── */}
      {plan === "trial" && trialDays <= 7 && trialDays > 0 && (
        <div className="flex items-center justify-center gap-3 border-b border-[rgba(251,191,36,0.15)] bg-[rgba(251,191,36,0.06)] px-6 py-2">
          <span className="text-[0.82rem] text-[#fbbf24]">
            ⏳ Trial ends in <strong>{trialDays} day{trialDays !== 1 ? "s" : ""}</strong>
          </span>
          <Link href="/settings/billing" className="text-[0.82rem] font-semibold text-[#fbbf24] underline">
            Upgrade →
          </Link>
        </div>
      )}
      {(plan === "expired" || (plan === "trial" && trialDays === 0)) && (
        <div className="flex items-center justify-center gap-3 border-b border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.06)] px-6 py-2">
          <span className="text-[0.82rem] text-[#f87171]">🚫 Trial ended ,</span>
          <Link href="/settings/billing" className="text-[0.82rem] font-semibold text-[#f87171] underline">
            Upgrade to continue →
          </Link>
        </div>
      )}
      {polar_status === "past_due" && (
        <div className="flex items-center justify-center gap-3 border-b border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.06)] px-6 py-2">
          <span className="text-[0.82rem] text-[#f87171]">⚡ Payment failed ,</span>
          <a href="/api/billing/portal" className="text-[0.82rem] font-semibold text-[#f87171] underline">
            Update billing →
          </a>
        </div>
      )}

      {/* ── Main ── */}
      <div className="mx-auto max-w-[1400px] px-6 py-7">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-foreground">
            Sinyaller
          </h1>
          <p className="mt-[3px] text-[0.86rem] text-[var(--muted-light)]">
            Müşterilerinizin söyledikleri, önce neyi düzelteceğinize göre sıralanmış.
          </p>
        </div>

        {/* Upgrade prompt */}
        {upgradeRequired && (
          <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.05)] px-[18px] py-[13px]">
            <span>🔒</span>
            <div className="flex-1 text-sm text-[#fbbf24]">{upgradeMessage}</div>
            <Button asChild className="h-auto rounded-lg px-4 py-[7px] text-[0.8rem] font-semibold tracking-[-0.01em]">
              <Link href="/settings/billing">View plans →</Link>
            </Button>
          </div>
        )}

        {loadingClusters ? (
          /* ── Skeleton state ── */
          <div>
            {/* Status strip skeleton */}
            <div className="mb-4 h-[38px] overflow-hidden rounded-[10px] border bg-card">
              <Skeleton className="h-full rounded-none" />
            </div>
            {/* Pipeline skeleton */}
            <div className="mb-4 rounded-xl border bg-card px-[18px] py-2.5">
              <Skeleton className="h-[26px] rounded-lg" />
            </div>
            {/* Cards skeleton */}
            <div className="grid grid-cols-[1fr_420px] gap-4">
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-[14px] border bg-card px-5 py-[18px]">
                    <div className="mb-3 flex gap-3.5">
                      <Skeleton className="h-12 w-12 flex-shrink-0 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="mb-2 h-[9px] w-[40%]" />
                        <Skeleton className="h-[13px] w-[80%]" />
                      </div>
                    </div>
                    <Skeleton className="mb-1.5 h-[9px]" />
                    <Skeleton className="h-[9px] w-[75%]" />
                  </div>
                ))}
              </div>
              <div className="h-[320px] rounded-[14px] border bg-card">
                <Skeleton className="h-full rounded-[14px]" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sample-data banner */}
            {isSample && (
              <div className="mb-4 flex items-center gap-3.5 rounded-[10px] border bg-muted px-[18px] py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--foreground)_6%,transparent)] text-base">👋</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.86rem] font-semibold text-foreground">Bu bir kafe için örnek veridir.</p>
                  <p className="mt-0.5 text-[0.78rem] text-muted-foreground">Kendi verilerinizi görmek için Google Reviews, Getir veya POS&apos;unuzu bağlayın.</p>
                </div>
                <Button asChild className="h-auto flex-shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-[0.82rem] font-semibold tracking-[-0.01em]">
                  <Link href="/sources">Kaynaklarınızı bağlayın →</Link>
                </Button>
              </div>
            )}

            {/* Header */}
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-[1.15rem] font-bold tracking-[-0.02em] text-foreground">Dikkat gereken konular</h2>
                <p className="mt-[3px] text-[0.82rem] text-muted-foreground">
                  Müşteri kanallarınızda {displayClusters.length} konu bulundu
                  {isSample ? <span className="text-[var(--muted-dim)]"> · örnek</span> : (lastRun && <span className="text-[var(--muted-dim)]"> · güncellendi {timeSince(lastRun)}</span>)}
                </p>
              </div>
            </div>

            {/* Two-column */}
            <div className="grid grid-cols-[1fr_400px] items-start gap-4">
              <div className="flex flex-col gap-[11px]">
                {displayClusters.map((c, idx) => (
                  <SignalCard key={c.id} cluster={c} selected={activeCluster?.id === c.id} onClick={() => setSelectedCluster(c)} staggerIndex={idx} />
                ))}
              </div>
              <div className="sticky top-[66px]">
                <ExecutionBrief
                  cluster={activeCluster}
                  approval={activeCluster ? (approvals[activeCluster.id] ?? "pending") : "pending"}
                  onApprove={() => { if (!activeCluster) return; if (activeCluster.id.startsWith("sample-")) { setApprovals((a) => ({ ...a, [activeCluster.id]: "approved" })); } else { decideCluster(activeCluster.id, "approve"); } }}
                  onReject={() => { if (!activeCluster) return; if (activeCluster.id.startsWith("sample-")) { setApprovals((a) => ({ ...a, [activeCluster.id]: "rejected" })); } else { decideCluster(activeCluster.id, "reject"); } }}
                  onViewFull={() => setSnapshotOpen(true)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <IntentSnapshotModal
        cluster={selectedCluster}
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
      />

      {/* Toast notifications */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-[10px] border px-[18px] py-2.5 text-[0.85rem] font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-[8px]",
            "animate-in fade-in slide-in-from-bottom-2 duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            toast.tone === "success"
              ? "border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] text-[#4ade80]"
              : "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] text-[#f87171]",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
