"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size === 48 ? "0.78rem" : "0.65rem",
        fontWeight: 800, color,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "-0.03em",
      }}>
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
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "10px 18px",
      display: "flex", alignItems: "center", gap: 0,
    }}>
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
                <span style={{
                  color: "var(--muted)", fontSize: "0.7rem",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  ×{step.count}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1,
                background: "linear-gradient(90deg, var(--border), transparent)",
                minWidth: 12, maxWidth: 36,
              }} />
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Brain icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(249,115,22,0.1)",
          border: "1px solid rgba(249,115,22,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: "1.1rem",
        }}>🧠</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
              color: "var(--accent)", textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              AI INSIGHT {idx + 1}/{insights.length}
            </span>
            <span style={{
              padding: "2px 7px", borderRadius: 4,
              background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.18)",
              fontSize: "0.62rem", fontWeight: 600, color: "var(--accent)",
            }}>
              {Math.round(current.confidence * 100)}% confidence
            </span>
          </div>
          <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--foreground)", margin: "0 0 3px", lineHeight: 1.4 }}>
            {current.headline}
          </p>
          <p style={{ color: "var(--muted-light)", fontSize: "0.81rem", margin: 0, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {current.detail}
          </p>
          {insights.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {insights.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{
                  width: i === idx ? 18 : 5, height: 5, borderRadius: 3,
                  border: "none", cursor: "pointer", padding: 0,
                  background: i === idx ? "var(--accent)" : "rgba(255,255,255,0.16)",
                  transition: "all 0.2s",
                }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {idx < insights.length - 1 && (
            <button onClick={() => setIdx((i) => i + 1)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              borderRadius: 7, color: "var(--foreground)", cursor: "pointer",
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem",
            }}>›</button>
          )}
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--muted-dim)",
            cursor: "pointer", padding: "4px 6px", fontSize: "0.9rem",
            borderRadius: 5, lineHeight: 1,
          }}>✕</button>
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
      className={`signal-card sev-${sev} ${selected ? "selected" : ""} ${staggerClass}`}
      onClick={onClick}
      style={{ padding: "16px 18px 14px 20px", cursor: "pointer" }}
    >
      {/* Title, visual hero */}
      <h3 style={{
        margin: "0 0 10px",
        fontWeight: 700,
        fontSize: "0.96rem",
        lineHeight: 1.45,
        color: "var(--foreground)",
        letterSpacing: "-0.018em",
      }}>
        {cluster.title}
      </h3>

      {/* Meta row, plain language */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`badge badge-${sev}`}>{urgencyLabel(score)}</span>
        <span style={{ fontSize: "0.78rem", color: "var(--muted-light)" }}>
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{cluster.evidence_count}</span> müşteri bahsetti
        </span>
        {chips.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted-dim)" }}>
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
      <div style={{ height: 1, background: "var(--border)", margin: "0 18px" }} />
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <div style={{
            width: 2, height: 12, borderRadius: 1, flexShrink: 0,
            background: accentColor || "rgba(255,255,255,0.14)",
          }} />
          <span style={{
            fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.02em",
            color: "var(--muted-light)",
          }}>
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
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "7px 10px", borderRadius: 7, textDecoration: "none",
        border: `1px solid ${configured ? "rgba(34,197,94,0.22)" : "var(--border)"}`,
        background: configured ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
        color: configured ? "#4ade80" : "var(--muted)",
        fontSize: "0.75rem", fontWeight: 600, flex: 1,
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.07)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)"; e.currentTarget.style.color = "var(--accent)"; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = configured ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = configured ? "rgba(34,197,94,0.22)" : "var(--border)";
        e.currentTarget.style.color = configured ? "#4ade80" : "var(--muted)";
      }}
    >
      <span style={{ fontSize: "0.85rem" }}>{icon}</span>
      <span>{label}</span>
      {configured && <span style={{ marginLeft: "auto", fontSize: "0.62rem", opacity: 0.7 }}>↗</span>}
      {!configured && <span style={{ marginLeft: "auto", fontSize: "0.62rem", opacity: 0.5 }}>Set up</span>}
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
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 14, padding: 32,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12, minHeight: 320,
      }}>
        <div style={{
          width: 1, height: 40,
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)",
        }} />
        <p style={{
          color: "var(--muted-dim)", fontSize: "0.78rem", margin: 0,
          textAlign: "center", maxWidth: 160, lineHeight: 1.65,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Bir sinyal seçin<br />özeti açmak için
        </p>
      </div>
    );
  }

  const sev = severityLabel(cluster.severity);
  const chips = sourceChips(cluster);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Title block, plain header */}
      <div style={{ padding: "18px 18px 4px" }}>
        <span className={`badge badge-${sev}`} style={{ marginBottom: 12, display: "inline-block" }}>
          {urgencyLabel(cluster.severity)}
        </span>
        <h4 style={{
          margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700,
          color: "var(--foreground)", lineHeight: 1.4, letterSpacing: "-0.015em",
        }}>
          {cluster.title}
        </h4>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
          {cluster.evidence_count} müşteri bahsetti
          {chips.length > 0 && <span> · {chips.slice(0, 3).map((c) => c.name).join(", ")}</span>}
        </p>
      </div>

      {/* What's happening */}
      <BriefSection label="Neler oluyor">
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted-light)", lineHeight: 1.65 }}>
          {cluster.business_case || cluster.recommended_action || ","}
        </p>
      </BriefSection>

      {/* What it's costing you */}
      {cluster.projected_impact && (
        <BriefSection label="Size maliyeti" accentColor="#f59e0b">
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}>
              💰 {cluster.projected_impact}
            </div>
          </div>
        </BriefSection>
      )}

      {/* What to do */}
      <BriefSection label="Ne yapmalı" accentColor="#22c55e">
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted-light)", lineHeight: 1.65 }}>
          {cluster.recommended_action || ","}
        </p>
      </BriefSection>

      {/* Decision */}
      <BriefSection label="Kararınız">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
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
          style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--accent)",
            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
            padding: "8px 14px", width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "background 0.12s, border-color 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(249,115,22,0.06)";
            e.currentTarget.style.borderColor = "rgba(249,115,22,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          ↗ Detayları gör
        </button>
      </BriefSection>

      {/* Sent to your phone */}
      <BriefSection label="Telefonunuza gönderildi" accentColor="#22c55e">
        {/* WhatsApp preview, the actual message your team receives */}
        <div style={{ background: "#0c1419", border: "1px solid rgba(37,211,102,0.18)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ fontSize: "0.85rem" }}>💬</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>WhatsApp · ekibinizin aldığı mesaj</span>
          </div>
          <div style={{ background: "#1f2c34", borderRadius: "4px 10px 10px 10px", padding: "10px 12px" }}>
            <div style={{ color: sev === "critical" ? "#f87171" : sev === "high" ? "#fb923c" : "#fbbf24", fontWeight: 800, fontSize: "0.74rem", marginBottom: 5 }}>
              {sev === "critical" ? "🔴" : sev === "high" ? "🟠" : "🟡"} {sev.toUpperCase()} · {cluster.severity}/100
            </div>
            <div style={{ color: "#e9edef", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: cluster.projected_impact ? 6 : 8, fontWeight: 600 }}>
              {cluster.title}
            </div>
            {cluster.projected_impact && (
              <div style={{ color: "#9fd9bf", fontSize: "0.72rem", marginBottom: 8 }}>💰 {cluster.projected_impact}</div>
            )}
            <div style={{ color: "#8696a0", fontSize: "0.68rem", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 7 }}>
              Yanıtla <span style={{ color: "#22c55e", fontWeight: 700 }}>1</span> detaylar ·{" "}
              <span style={{ color: "#22c55e", fontWeight: 700 }}>2</span> hallettim ·{" "}
              <span style={{ color: "#22c55e", fontWeight: 700 }}>3</span> geç
            </div>
          </div>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55 }}>
          WhatsApp, Slack ve e-posta ile otomatik iletilir, ekibiniz giriş yapmadan hareket eder.
        </p>
        <Link
          href="/alerts"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 7, textDecoration: "none",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            color: "var(--muted)",
            fontSize: "0.75rem", fontWeight: 600,
            transition: "all 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.07)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          <span>⚡</span>
          <span>Slack · E-posta · WhatsApp Ayarla</span>
          <span style={{ marginLeft: 4, fontSize: "0.62rem", opacity: 0.5 }}>↗</span>
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
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 38, height: 38, border: "3px solid rgba(249,115,22,0.15)", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Çalışma alanı yükleniyor...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* ── Plan banners ── */}
      {plan === "trial" && trialDays <= 7 && trialDays > 0 && (
        <div style={{
          background: "rgba(251,191,36,0.06)", borderBottom: "1px solid rgba(251,191,36,0.15)",
          padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ color: "#fbbf24", fontSize: "0.82rem" }}>
            ⏳ Trial ends in <strong>{trialDays} day{trialDays !== 1 ? "s" : ""}</strong>
          </span>
          <Link href="/settings/billing" style={{ color: "#fbbf24", fontWeight: 600, fontSize: "0.82rem", textDecoration: "underline" }}>
            Upgrade →
          </Link>
        </div>
      )}
      {(plan === "expired" || (plan === "trial" && trialDays === 0)) && (
        <div style={{
          background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.15)",
          padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ color: "#f87171", fontSize: "0.82rem" }}>🚫 Trial ended ,</span>
          <Link href="/settings/billing" style={{ color: "#f87171", fontWeight: 600, fontSize: "0.82rem", textDecoration: "underline" }}>
            Upgrade to continue →
          </Link>
        </div>
      )}
      {polar_status === "past_due" && (
        <div style={{
          background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.15)",
          padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ color: "#f87171", fontSize: "0.82rem" }}>⚡ Payment failed ,</span>
          <a href="/api/billing/portal" style={{ color: "#f87171", fontWeight: 600, fontSize: "0.82rem", textDecoration: "underline" }}>
            Update billing →
          </a>
        </div>
      )}

      {/* ── Main ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.03em" }}>
            Sinyaller
          </h1>
          <p style={{ margin: "3px 0 0", color: "var(--muted-light)", fontSize: "0.86rem" }}>
            Müşterilerinizin söyledikleri, önce neyi düzelteceğinize göre sıralanmış.
          </p>
        </div>

        {/* Upgrade prompt */}
        {upgradeRequired && (
          <div style={{
            padding: "13px 18px", borderRadius: 10,
            background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)",
            display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          }}>
            <span>🔒</span>
            <div style={{ flex: 1, color: "#fbbf24", fontSize: "0.875rem" }}>{upgradeMessage}</div>
            <Link href="/settings/billing" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "7px 16px" }}>
              View plans →
            </Link>
          </div>
        )}

        {loadingClusters ? (
          /* ── Skeleton state ── */
          <div>
            {/* Status strip skeleton */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, height: 38, marginBottom: 16, overflow: "hidden" }}>
              <div className="skeleton" style={{ height: "100%" }} />
            </div>
            {/* Pipeline skeleton */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 18px", marginBottom: 16 }}>
              <div className="skeleton" style={{ height: 26, borderRadius: 8 }} />
            </div>
            {/* Cards skeleton */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: "40%", height: 9, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: "80%", height: 13 }} />
                      </div>
                    </div>
                    <div className="skeleton" style={{ height: 9, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: "75%", height: 9 }} />
                  </div>
                ))}
              </div>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, height: 320 }}>
                <div className="skeleton" style={{ height: "100%", borderRadius: 14 }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sample-data banner */}
            {isSample && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", marginBottom: 16, borderRadius: 10, background: "var(--muted-surface)", border: "1px solid var(--border)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "color-mix(in oklch, var(--foreground) 6%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>👋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--foreground)", fontWeight: 600 }}>Bu bir kafe için örnek veridir.</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>Kendi verilerinizi görmek için Google Reviews, Getir veya POS&apos;unuzu bağlayın.</p>
                </div>
                <Link href="/sources" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.82rem", padding: "8px 16px", flexShrink: 0, whiteSpace: "nowrap" }}>Kaynaklarınızı bağlayın →</Link>
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, color: "var(--foreground)", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Dikkat gereken konular</h2>
                <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: "0.82rem" }}>
                  Müşteri kanallarınızda {displayClusters.length} konu bulundu
                  {isSample ? <span style={{ color: "var(--muted-dim)" }}> · örnek</span> : (lastRun && <span style={{ color: "var(--muted-dim)" }}> · güncellendi {timeSince(lastRun)}</span>)}
                </p>
              </div>
            </div>

            {/* Two-column */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {displayClusters.map((c, idx) => (
                  <SignalCard key={c.id} cluster={c} selected={activeCluster?.id === c.id} onClick={() => setSelectedCluster(c)} staggerIndex={idx} />
                ))}
              </div>
              <div style={{ position: "sticky", top: 66 }}>
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
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: toast.tone === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${toast.tone === "success" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
            color: toast.tone === "success" ? "#4ade80" : "#f87171",
            padding: "10px 18px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600,
            zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            animation: "toast-in 0.18s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.12); }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
