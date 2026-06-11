"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import type { Workspace } from "@/lib/types";

const TRIAL_LIMIT = 10;

function daysLeft(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function fmtDate(isoDate?: string): string {
  if (!isoDate) return ",";
  return new Date(isoDate).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

export default function BillingPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => { if (!r.ok) router.push("/login?redirect=/settings/billing"); })
      .catch(() => router.push("/login"));

    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => { setWorkspace(d.workspace); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(70,230,166,0.2)", borderTopColor: "var(--accent-green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const plan = workspace?.plan ?? "trial";
  const analysisCount = workspace?.analysis_count ?? 0;
  const trialDaysLeft = daysLeft(workspace?.trial_ends_at);
  const trialPct = Math.min(100, (analysisCount / TRIAL_LIMIT) * 100);

  const planOptions = [
    {
      name: "Starter",
      price: "$79",
      description: "1 lokasyon · Tek kafe veya mağaza",
      features: ["1 lokasyon", "Temel kaynak takibi", "E-posta uyarıları"],
      cta: "Choose Starter",
      href: "/api/billing/checkout",
    },
    {
      name: "Growth",
      price: "$149",
      description: "2-5 lokasyon · Küçük zincirler",
      features: ["2-5 lokasyon", "Çok lokasyonlu özet görünüm", "Öncelikli aksiyon listesi"],
      cta: "Choose Growth",
      href: "/api/billing/checkout",
    },
    {
      name: "Scale",
      price: "$299",
      description: "6-20 lokasyon · Bölgesel markalar",
      features: ["6-20 lokasyon", "Tüm aktif kaynaklar", "Bölgesel performans takibi"],
      cta: "Choose Scale",
      href: "/api/billing/checkout",
    },
    {
      name: "Enterprise",
      price: "Özel",
      description: "20+ lokasyon · Franchise'lar & gruplar",
      features: ["20+ lokasyon", "Özel fiyatlandırma (~$500+/ay)", "Franchise/grup desteği"],
      cta: "Contact Sales",
      href: "mailto:hello@observerai.app?subject=ObserverAI%20Enterprise",
    },
  ];

  const isActive = plan === "pro" && workspace?.polar_status === "active";
  const isPastDue = workspace?.polar_status === "past_due";
  const isCancelled = plan === "cancelled" || workspace?.polar_status === "cancelled";
  const isExpired = plan === "expired";
  const isTrial = plan === "trial";

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(11,12,16,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 64 }}>
          <Logo href="/dashboard" size={22} textSize="0.9rem" gap={10} />
          <div style={{ width: 1, height: 28, background: "var(--border)" }} />
          <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Billing</span>
          <div style={{ flex: 1 }} />
          <Link href="/dashboard" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>← Dashboard</Link>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ color: "var(--foreground)", fontSize: "1.6rem", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Billing & Plan</h1>
        <p style={{ color: "var(--muted)", marginBottom: 40, fontSize: "0.9rem" }}>Manage your Observer subscription.</p>

        {/* ─── Inactive banners ─── */}
        {(isCancelled || isExpired) && (
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,92,122,0.08)", border: "1px solid rgba(255,92,122,0.25)", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#ff5c7a", fontWeight: 600, fontSize: "0.9rem" }}>
                {isCancelled ? "Subscription cancelled" : "Trial expired"}
              </div>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Analysis runs are paused. Choose a plan to continue.</div>
            </div>
            <a href="/api/billing/checkout" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "7px 16px", whiteSpace: "nowrap" }}>
              Upgrade →
            </a>
          </div>
        )}

        {isPastDue && (
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.25)", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.1rem" }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#ffd166", fontWeight: 600, fontSize: "0.9rem" }}>Payment failed</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Please update your payment method to avoid interruption.</div>
            </div>
            <a href="/api/billing/portal" style={{ textDecoration: "none", color: "#ffd166", fontSize: "0.8rem", fontWeight: 600, border: "1px solid rgba(255,209,102,0.3)", padding: "7px 16px", borderRadius: 8 }}>
              Update billing →
            </a>
          </div>
        )}

        {/* ─── Plan card ─── */}
        <div className="obs-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            {isTrial && (
              <span style={{ background: "rgba(110,168,255,0.12)", color: "var(--accent-blue)", border: "1px solid rgba(110,168,255,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
                FREE TRIAL
              </span>
            )}
            {isActive && (
              <span style={{ background: "rgba(70,230,166,0.12)", color: "var(--accent-green)", border: "1px solid rgba(70,230,166,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
                PRO · ACTIVE
              </span>
            )}
            {isPastDue && (
              <span style={{ background: "rgba(255,209,102,0.12)", color: "#ffd166", border: "1px solid rgba(255,209,102,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
                PRO · PAST DUE
              </span>
            )}
            {(isCancelled || isExpired) && (
              <span style={{ background: "rgba(255,92,122,0.12)", color: "#ff5c7a", border: "1px solid rgba(255,92,122,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
                {isExpired ? "EXPIRED" : "CANCELLED"}
              </span>
            )}
          </div>

          {isTrial && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Trial ends in</span>
                <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Analyses used</span>
                <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{analysisCount} / {TRIAL_LIMIT}</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 9999, background: "var(--muted-surface)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${trialPct}%`, borderRadius: 9999, background: trialPct >= 80 ? "var(--danger)" : "var(--accent-green)", transition: "width 0.3s" }} />
              </div>
            </>
          )}

          {(isActive || isPastDue) && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Renews on</span>
                <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{fmtDate(workspace?.polar_renews_at)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Analyses this month</span>
                <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{analysisCount} runs</span>
              </div>
            </>
          )}
        </div>

        {/* ─── Action buttons ─── */}
        {(isActive || isPastDue) && (
          <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
            <a href="/api/billing/portal" style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.875rem", padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted-surface)" }}>
              Manage billing →
            </a>
            <a href="/api/billing/portal" style={{ textDecoration: "none", color: "var(--muted)", fontSize: "0.875rem", padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted-surface)" }}>
              View invoices →
            </a>
          </div>
        )}

        {/* ─── Upgrade card (shown for trial / expired / cancelled) ─── */}
        {(isTrial || isCancelled || isExpired) && (
          <div style={{ padding: "32px", borderRadius: 20, background: "linear-gradient(135deg, rgba(70,230,166,0.06), rgba(110,168,255,0.06))", border: "1px solid rgba(70,230,166,0.2)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg, transparent, rgba(70,230,166,0.4), transparent)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
              <div style={{ width: "100%" }}>
                <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Choose a plan</div>
                <div style={{ color: "var(--muted)", fontSize: "0.84rem", marginBottom: 22 }}>
                  Match Observer to your location count and source coverage.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {planOptions.map((option) => (
                    <div key={option.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                      <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "0.95rem", marginBottom: 8 }}>{option.name}</div>
                      <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: option.name === "Enterprise" ? "1.25rem" : "1.6rem", letterSpacing: "-0.03em", marginBottom: 6 }}>
                        {option.price}
                      </div>
                      {option.name !== "Enterprise" && <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: -4, marginBottom: 10 }}>/ ay</div>}
                      <div style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.45, marginBottom: 12 }}>{option.description}</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                        {option.features.map((feature) => (
                          <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "var(--muted-foreground)", fontSize: "0.76rem", lineHeight: 1.35 }}>
                            <span style={{ color: "var(--foreground)", flexShrink: 0 }}>✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <a href={option.href} className={option.name === "Growth" ? "btn-primary" : undefined} style={{
                        display: "block",
                        textDecoration: "none",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "9px 12px",
                        textAlign: "center",
                        borderRadius: 8,
                        border: option.name === "Growth" ? "none" : "1px solid var(--border)",
                        background: option.name === "Growth" ? undefined : "var(--muted-surface)",
                        color: option.name === "Growth" ? undefined : "var(--foreground)",
                      }}>
                        {option.cta}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
