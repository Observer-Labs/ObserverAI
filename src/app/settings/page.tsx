"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/types";

// ── Types ───────────────────────────────────────────────────────────────────

type Tab = "profile" | "billing" | "thresholds" | "notifications" | "account";

const TRIAL_LIMIT = 10;

function daysLeft(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function fmtDate(isoDate?: string): string {
  if (!isoDate) return ",";
  return new Date(isoDate).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`toggle-track${checked ? " on" : ""}`}
      style={{ cursor: "pointer", flexShrink: 0 }}
    />
  );
}

// ── Billing plan badge ──────────────────────────────────────────────────────

function PlanBadge({ status, plan }: { status?: string; plan?: string }) {
  if (plan === "trial") return (
    <span style={{ background: "rgba(110,168,255,0.12)", color: "#6ea8ff", border: "1px solid rgba(110,168,255,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.7rem", fontWeight: 700 }}>ÜCRETSİZ DENEME</span>
  );
  if (status === "active") return (
    <span style={{ background: "rgba(249,115,22,0.12)", color: "var(--accent)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.7rem", fontWeight: 700 }}>PRO · AKTİF</span>
  );
  if (status === "past_due") return (
    <span style={{ background: "rgba(255,209,102,0.12)", color: "#ffd166", border: "1px solid rgba(255,209,102,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.7rem", fontWeight: 700 }}>GECİKMİŞ ÖDEME</span>
  );
  if (status === "cancelled" || plan === "cancelled") return (
    <span style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.7rem", fontWeight: 700 }}>İPTAL EDİLDİ</span>
  );
  return (
    <span style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9999, padding: "3px 12px", fontSize: "0.7rem", fontWeight: 700 }}>SÜRESİ DOLDU</span>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInitials, setUserInitials] = useState("?");
  const [userEmail, setUserEmail] = useState("");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // Notifications
  const [notifConfig, setNotifConfig] = useState({
    emailOnAnalysis: true,
    emailOnCritical: true,
    slackMentions: false,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savedNotifs, setSavedNotifs] = useState(false);

  // Thresholds
  const [thresholds, setThresholds] = useState({
    min_severity: 70,
    min_evidence: 5,
    cooldown_hours: 24,
  });
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savedThresholds, setSavedThresholds] = useState(false);

  // Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/auth/session");
        if (!authRes.ok) { router.push("/login?redirect=/settings"); return; }

        try {
          const sessionData = await authRes.clone().json().catch(() => null) || await fetch("/api/auth/session").then(r => r.json());
          const email: string = sessionData?.user?.email ?? "";
          if (email) {
            setUserEmail(email);
            setUserInitials(email.substring(0, 2).toUpperCase());
          }
        } catch { /* ignore */ }

        const wsRes = await fetch("/api/workspace");
        if (wsRes.ok) {
          const wd = await wsRes.json();
          const ws = wd.workspace ?? null;
          setWorkspace(ws);
          if (ws?.distribution_config?.thresholds) {
            setThresholds(ws.distribution_config.thresholds);
          }
        }
        setLoading(false);
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(249,115,22,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: "profile",       label: "Profile",       icon: "👤" },
    { key: "billing",       label: "Billing",        icon: "💳" },
    { key: "thresholds",   label: "Thresholds",     icon: "🎛️" },
    { key: "notifications", label: "Notifications",  icon: "🔔" },
    { key: "account",       label: "Account",        icon: "⚙️" },
  ];

  const saveThresholds = async () => {
    setSavingThresholds(true);
    try {
      const distConfig = workspace?.distribution_config ?? {};
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { distribution_config: { ...distConfig, thresholds } } }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace ?? workspace);
      }
      setSavedThresholds(true);
      setTimeout(() => setSavedThresholds(false), 2500);
    } finally {
      setSavingThresholds(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotifs(true);
    try {
      const distConfig = workspace?.distribution_config ?? {};
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { distribution_config: { ...distConfig, notifications: notifConfig } } }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace ?? workspace);
      }
      setSavedNotifs(true);
      setTimeout(() => setSavedNotifs(false), 2500);
    } finally {
      setSavingNotifs(false);
    }
  };

  const plan = workspace?.plan ?? "trial";
  const polarStatus = workspace?.polar_status;
  const analysisCount = workspace?.analysis_count ?? 0;
  const trialDaysLeft = daysLeft(workspace?.trial_ends_at);
  const trialPct = Math.min(100, (analysisCount / TRIAL_LIMIT) * 100);
  const isActive = plan === "pro" && polarStatus === "active";
  const isPastDue = polarStatus === "past_due";
  const isTrial = plan === "trial";

  const billingPlans = [
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

  const lblStyle: React.CSSProperties = {
    display: "block", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div className="app-shell">
      <div className="page-wrap" style={{ maxWidth: 860, margin: "0 auto", padding: "36px 32px 80px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.4rem", margin: "0 0 4px" }}>Settings</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>
            Manage your account, plan, and notification preferences
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>

          {/* ── Left sidebar tabs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "10px 14px", borderRadius: 9, border: "none",
                  background: activeTab === tab.key ? "rgba(249,115,22,0.1)" : "transparent",
                  color: activeTab === tab.key ? "var(--accent)" : "var(--muted-light)",
                  cursor: "pointer", textAlign: "left", fontSize: "0.875rem",
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  transition: "all 0.15s",
                  outline: activeTab === tab.key ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.background = "var(--muted-surface)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}

            <div style={{ height: 1, background: "var(--muted-surface)", margin: "8px 0" }} />

            {/* Quick links */}
            {[
              { href: "/connect", label: "Sources", icon: "🌐" },
              { href: "/settings/distribution", label: "Distribution", icon: "📡" },
              { href: "/delivery-log", label: "Delivery Log", icon: "📋" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "9px 14px", borderRadius: 9, textDecoration: "none",
                  color: "var(--muted)", fontSize: "0.8rem", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--muted-light)"; e.currentTarget.style.background = "var(--muted-surface)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: "0.85rem" }}>{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Right content panel ── */}
          <div>

            {/* ───── Profile tab ───── */}
            {activeTab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Avatar row */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "24px 28px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", flexShrink: 0,
                    }}>
                      {userInitials}
                    </div>
                    <div>
                      <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.95rem" }}>
                        {displayName || userEmail.split("@")[0]}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 2 }}>{userEmail}</div>
                    </div>
                    <PlanBadge plan={plan} status={polarStatus} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={lblStyle}>Display name</label>
                      <input
                        className="obs-input"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={userEmail.split("@")[0]}
                        style={{ maxWidth: 320 }}
                      />
                    </div>
                    <div>
                      <label style={lblStyle}>Email address</label>
                      <input
                        className="obs-input"
                        value={userEmail}
                        disabled
                        style={{ maxWidth: 320, opacity: 0.5, cursor: "not-allowed" }}
                      />
                      <p style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: 4 }}>
                        Email is managed by your auth provider
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={saveProfile}
                      disabled={savingProfile}
                      style={{ alignSelf: "flex-start", fontSize: "0.875rem", padding: "8px 18px" }}
                    >
                      {savingProfile ? "Saving…" : savedProfile ? "✓ Saved" : "Save Profile"}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ───── Billing tab ───── */}
            {activeTab === "billing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Alert banners */}
                {(plan === "cancelled" || plan === "expired") && (
                  <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.875rem" }}>
                        {plan === "cancelled" ? "Subscription cancelled" : "Trial expired"}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Choose a plan to continue running analyses.</div>
                    </div>
                    <a href="/api/billing/checkout" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "7px 14px", whiteSpace: "nowrap" }}>
                      Upgrade →
                    </a>
                  </div>
                )}

                {isPastDue && (
                  <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span>⚡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#ffd166", fontWeight: 600, fontSize: "0.875rem" }}>Payment failed</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Update your payment method to avoid interruption.</div>
                    </div>
                    <a href="/api/billing/portal" style={{ textDecoration: "none", color: "#ffd166", fontSize: "0.8rem", fontWeight: 600, border: "1px solid rgba(255,209,102,0.25)", padding: "7px 14px", borderRadius: 8, whiteSpace: "nowrap" }}>
                      Update →
                    </a>
                  </div>
                )}

                {/* Plan card */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <h3 style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "1rem", margin: 0 }}>Current plan</h3>
                    <PlanBadge plan={plan} status={polarStatus} />
                  </div>

                  {isTrial && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Trial ends in</span>
                        <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Analyses used</span>
                        <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{analysisCount} / {TRIAL_LIMIT}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 9999, background: "var(--muted-surface)", overflow: "hidden", marginTop: 4 }}>
                        <div style={{ height: "100%", width: `${trialPct}%`, borderRadius: 9999, background: trialPct >= 80 ? "#ef4444" : "var(--accent)", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  )}

                  {(isActive || isPastDue) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Renews on</span>
                        <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{fmtDate(workspace?.polar_renews_at)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Analyses this month</span>
                        <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 600 }}>{analysisCount} runs</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <a href="/api/billing/portal" style={{ textDecoration: "none", color: "var(--muted-light)", fontSize: "0.8rem", padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted-surface)" }}>
                          Manage billing →
                        </a>
                        <a href="/api/billing/portal" style={{ textDecoration: "none", color: "var(--muted-light)", fontSize: "0.8rem", padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted-surface)" }}>
                          View invoices →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade card */}
                {(isTrial || plan === "cancelled" || plan === "expired") && (
                  <div style={{ padding: 28, borderRadius: 14, background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.2)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)" }} />
                    <div>
                      <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 6 }}>Choose a plan</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 18 }}>Plans are based on location count and source coverage.</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                        {billingPlans.map((option) => (
                          <div key={option.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                            <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "0.92rem", marginBottom: 8 }}>{option.name}</div>
                            <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: option.name === "Enterprise" ? "1.2rem" : "1.55rem", letterSpacing: "-0.03em", marginBottom: 6 }}>
                              {option.price}
                            </div>
                            {option.name !== "Enterprise" && <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: -4, marginBottom: 10 }}>/ ay</div>}
                            <div style={{ color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.45, marginBottom: 12 }}>{option.description}</div>
                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                              {option.features.map((feature) => (
                                <li key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "var(--muted-foreground)", fontSize: "0.74rem", lineHeight: 1.35 }}>
                                  <span style={{ color: "var(--foreground)", flexShrink: 0 }}>✓</span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <a href={option.href} className={option.name === "Growth" ? "btn-primary" : undefined} style={{
                              display: "block",
                              textDecoration: "none",
                              fontSize: "0.76rem",
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
                )}
              </div>
            )}

            {/* ───── Thresholds tab ───── */}
            {activeTab === "thresholds" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px" }}>
                  <h3 style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "1rem", margin: "0 0 6px" }}>Observer Firing Thresholds</h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "0 0 24px", lineHeight: 1.6 }}>
                    Control when Observer fires alerts. Clusters below these thresholds are still visible in the dashboard but won&apos;t trigger notifications.
                  </p>

                  {/* Min severity slider */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "0.875rem" }}>Minimum severity</div>
                        <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>Clusters below this score won&apos;t fire alerts</div>
                      </div>
                      <div style={{
                        padding: "4px 12px", borderRadius: 20,
                        background: thresholds.min_severity >= 80 ? "rgba(239,68,68,0.12)" : thresholds.min_severity >= 60 ? "rgba(249,115,22,0.12)" : "rgba(245,158,11,0.12)",
                        border: `1px solid ${thresholds.min_severity >= 80 ? "rgba(239,68,68,0.25)" : thresholds.min_severity >= 60 ? "rgba(249,115,22,0.25)" : "rgba(245,158,11,0.25)"}`,
                        color: thresholds.min_severity >= 80 ? "#f87171" : thresholds.min_severity >= 60 ? "var(--accent)" : "#fbbf24",
                        fontSize: "0.75rem", fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {thresholds.min_severity}
                      </div>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={thresholds.min_severity}
                      onChange={(e) => setThresholds((t) => ({ ...t, min_severity: Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ color: "var(--muted-dim)", fontSize: "0.67rem" }}>0, All clusters</span>
                      <span style={{ color: "var(--muted-dim)", fontSize: "0.67rem" }}>100, Critical only</span>
                    </div>
                  </div>

                  {/* Min evidence */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "0.875rem" }}>Minimum evidence count</div>
                        <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>Minimum number of signals to form an alertable cluster</div>
                      </div>
                      <div style={{
                        padding: "4px 12px", borderRadius: 20,
                        background: "var(--muted-surface)", border: "1px solid var(--border)",
                        color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {thresholds.min_evidence}
                      </div>
                    </div>
                    <input
                      type="range" min={1} max={50} step={1}
                      value={thresholds.min_evidence}
                      onChange={(e) => setThresholds((t) => ({ ...t, min_evidence: Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ color: "var(--muted-dim)", fontSize: "0.67rem" }}>1 signal</span>
                      <span style={{ color: "var(--muted-dim)", fontSize: "0.67rem" }}>50 signals</span>
                    </div>
                  </div>

                  {/* Cooldown */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "0.875rem", marginBottom: 4 }}>Alert cooldown</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: 10 }}>Don&apos;t re-alert the same cluster within this window</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {([24, 48, 168] as const).map((h) => (
                        <button
                          key={h}
                          onClick={() => setThresholds((t) => ({ ...t, cooldown_hours: h }))}
                          style={{
                            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: thresholds.cooldown_hours === h ? "rgba(249,115,22,0.12)" : "var(--muted-surface)",
                            color: thresholds.cooldown_hours === h ? "var(--accent)" : "var(--muted-light)",
                            fontSize: "0.82rem", fontWeight: thresholds.cooldown_hours === h ? 600 : 400,
                            outline: thresholds.cooldown_hours === h ? "1px solid rgba(249,115,22,0.25)" : "1px solid transparent",
                            transition: "all 0.12s",
                          }}
                        >
                          {h === 24 ? "24h" : h === 48 ? "48h" : "1 week"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={saveThresholds}
                    disabled={savingThresholds}
                    style={{ fontSize: "0.875rem", padding: "9px 20px" }}
                  >
                    {savingThresholds ? "Saving…" : savedThresholds ? "✓ Saved" : "Save Thresholds"}
                  </button>
                </div>

                {/* Quick summary */}
                <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 12, padding: "16px 20px" }}>
                  <p style={{ color: "var(--muted-light)", fontSize: "0.82rem", margin: 0, lineHeight: 1.7 }}>
                    📡 Observer will fire alerts for clusters with severity ≥ <strong style={{ color: "var(--foreground)" }}>{thresholds.min_severity}</strong>,
                    backed by at least <strong style={{ color: "var(--foreground)" }}>{thresholds.min_evidence}</strong> evidence signals,
                    and will not re-alert within <strong style={{ color: "var(--foreground)" }}>{thresholds.cooldown_hours}h</strong> for the same cluster.
                  </p>
                </div>
              </div>
            )}

            {/* ───── Notifications tab ───── */}
            {activeTab === "notifications" && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px" }}>
                <h3 style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "1rem", margin: "0 0 20px" }}>
                  Notification preferences
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { key: "emailOnAnalysis" as const, label: "Analysis complete", desc: "Get notified when an analysis run finishes" },
                    { key: "emailOnCritical" as const, label: "Critical signals", desc: "Alert when a critical-severity signal is detected" },
                    { key: "slackMentions" as const,   label: "Slack mentions",   desc: "Receive a Slack DM for new high-priority signals" },
                  ].map((item, i, arr) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--muted-surface)" : "none",
                      }}
                    >
                      <div>
                        <div style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "0.875rem", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{item.desc}</div>
                      </div>
                      <Toggle
                        checked={notifConfig[item.key]}
                        onChange={(v) => setNotifConfig((p) => ({ ...p, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--muted-surface)" }}>
                  <p style={{ color: "var(--muted)", fontSize: "0.78rem", margin: "0 0 14px" }}>
                    Email notifications are sent to <span style={{ color: "var(--muted-light)" }}>{userEmail}</span>
                  </p>
                  <button
                    className="btn-primary"
                    onClick={saveNotifications}
                    disabled={savingNotifs}
                    style={{ fontSize: "0.875rem", padding: "8px 18px" }}
                  >
                    {savingNotifs ? "Saving…" : savedNotifs ? "✓ Saved" : "Save preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ───── Account tab ───── */}
            {activeTab === "account" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Workspace info */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px" }}>
                  <h3 style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "1rem", margin: "0 0 18px" }}>Workspace</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Workspace ID</span>
                      <code style={{ color: "var(--muted-light)", fontSize: "0.78rem", background: "var(--muted-surface)", padding: "3px 8px", borderRadius: 5, fontFamily: "monospace" }}>
                        {workspace?.id?.slice(0, 20)}…
                      </code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Plan</span>
                      <PlanBadge plan={plan} status={polarStatus} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Total analyses run</span>
                      <span style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.85rem" }}>{analysisCount}</span>
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14, padding: "24px 28px" }}>
                  <h3 style={{ color: "#ef4444", fontWeight: 600, fontSize: "1rem", margin: "0 0 6px" }}>Danger zone</h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "0 0 18px" }}>
                    Irreversible and destructive actions. Proceed with caution.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "#ef4444", borderRadius: 8, padding: "9px 18px",
                        fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                    >
                      Delete workspace
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0, fontWeight: 500 }}>
                        Are you sure? This will permanently delete all your signals, clusters, and settings.
                      </p>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          style={{
                            background: "#ef4444", border: "none", color: "var(--foreground)",
                            borderRadius: 8, padding: "8px 16px", fontSize: "0.875rem",
                            fontWeight: 600, cursor: "not-allowed", opacity: 0.7,
                          }}
                          title="Contact support to delete your workspace"
                          disabled
                        >
                          Yes, delete everything
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          style={{
                            background: "none", border: "1px solid var(--border)",
                            color: "var(--muted-light)", borderRadius: 8, padding: "8px 14px",
                            fontSize: "0.875rem", cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: "0.75rem", margin: 0 }}>
                        To permanently delete your workspace, contact <a href="mailto:support@observerai.app" style={{ color: "var(--accent)" }}>support@observerai.app</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
