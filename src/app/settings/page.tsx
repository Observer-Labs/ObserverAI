"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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

// ── Billing plan badge ──────────────────────────────────────────────────────

const planBadgeBase = "px-3 py-[3px] text-[0.7rem] font-bold";

function PlanBadge({ status, plan }: { status?: string; plan?: string }) {
  if (plan === "trial") return (
    <Badge className={cn(planBadgeBase, "border-[rgba(110,168,255,0.25)] bg-[rgba(110,168,255,0.12)] text-[#6ea8ff]")}>ÜCRETSİZ DENEME</Badge>
  );
  if (status === "active") return (
    <Badge className={cn(planBadgeBase, "border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.12)] text-primary")}>PRO · AKTİF</Badge>
  );
  if (status === "past_due") return (
    <Badge className={cn(planBadgeBase, "border-[rgba(255,209,102,0.25)] bg-[rgba(255,209,102,0.12)] text-[#ffd166]")}>GECİKMİŞ ÖDEME</Badge>
  );
  if (status === "cancelled" || plan === "cancelled") return (
    <Badge className={cn(planBadgeBase, "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]")}>İPTAL EDİLDİ</Badge>
  );
  return (
    <Badge className={cn(planBadgeBase, "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]")}>SÜRESİ DOLDU</Badge>
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
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

  const lblCls = "mb-[6px] block text-[0.75rem] font-medium tracking-[0.05em] uppercase text-muted-foreground";

  return (
    <div className="app-shell">
      <div className="page-wrap mx-auto max-w-[860px] px-8 pt-9 pb-20">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="mb-1 text-[1.4rem] font-bold text-foreground">Settings</h1>
          <p className="m-0 text-sm text-muted-foreground">
            Manage your account, plan, and notification preferences
          </p>
        </div>

        <div className="grid grid-cols-[200px_1fr] gap-6">

          {/* ── Left sidebar tabs ── */}
          <div className="flex flex-col gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-[9px] rounded-[9px] border-none px-3.5 py-2.5 text-left text-sm transition-all outline",
                  activeTab === tab.key
                    ? "bg-[rgba(249,115,22,0.1)] font-semibold text-primary outline-[rgba(249,115,22,0.2)]"
                    : "bg-transparent font-normal text-[var(--muted-light)] outline-transparent hover:bg-muted"
                )}
              >
                <span className="text-[0.9rem]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}

            <Separator className="my-2 bg-muted" />

            {/* Quick links */}
            {[
              { href: "/connect", label: "Sources", icon: "🌐" },
              { href: "/settings/distribution", label: "Distribution", icon: "📡" },
              { href: "/delivery-log", label: "Delivery Log", icon: "📋" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-[9px] rounded-[9px] px-3.5 py-[9px] text-[0.8rem] text-muted-foreground no-underline transition-all hover:bg-muted hover:text-[var(--muted-light)]"
              >
                <span className="text-[0.85rem]">{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Right content panel ── */}
          <div>

            {/* ───── Profile tab ───── */}
            {activeTab === "profile" && (
              <div className="flex flex-col gap-4">
                {/* Avatar row */}
                <div className="rounded-[14px] border bg-card px-7 py-6">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[rgba(249,115,22,0.3)] bg-[rgba(249,115,22,0.15)] text-[1.1rem] font-bold text-primary">
                      {userInitials}
                    </div>
                    <div>
                      <div className="text-[0.95rem] font-semibold text-foreground">
                        {displayName || userEmail.split("@")[0]}
                      </div>
                      <div className="mt-0.5 text-[0.8rem] text-muted-foreground">{userEmail}</div>
                    </div>
                    <PlanBadge plan={plan} status={polarStatus} />
                  </div>

                  <div className="flex flex-col gap-3.5">
                    <div>
                      <Label className={lblCls}>Display name</Label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={userEmail.split("@")[0]}
                        className="max-w-[320px]"
                      />
                    </div>
                    <div>
                      <Label className={lblCls}>Email address</Label>
                      <Input
                        value={userEmail}
                        disabled
                        className="max-w-[320px]"
                      />
                      <p className="mt-1 text-[0.72rem] text-muted-foreground">
                        Email is managed by your auth provider
                      </p>
                    </div>
                    <Button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="h-auto self-start px-[18px] py-2 text-sm"
                    >
                      {savingProfile ? "Saving…" : savedProfile ? "✓ Saved" : "Save Profile"}
                    </Button>
                  </div>
                </div>

              </div>
            )}

            {/* ───── Billing tab ───── */}
            {activeTab === "billing" && (
              <div className="flex flex-col gap-4">

                {/* Alert banners */}
                {(plan === "cancelled" || plan === "expired") && (
                  <div className="flex items-center gap-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-[18px] py-3.5">
                    <span>⚠️</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#ef4444]">
                        {plan === "cancelled" ? "Subscription cancelled" : "Trial expired"}
                      </div>
                      <div className="text-[0.78rem] text-muted-foreground">Choose a plan to continue running analyses.</div>
                    </div>
                    <Button asChild className="h-auto px-3.5 py-[7px] text-[0.8rem] whitespace-nowrap">
                      <a href="/api/billing/checkout">Upgrade →</a>
                    </Button>
                  </div>
                )}

                {isPastDue && (
                  <div className="flex items-center gap-3 rounded-xl border border-[rgba(255,209,102,0.2)] bg-[rgba(255,209,102,0.08)] px-[18px] py-3.5">
                    <span>⚡</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#ffd166]">Payment failed</div>
                      <div className="text-[0.78rem] text-muted-foreground">Update your payment method to avoid interruption.</div>
                    </div>
                    <a href="/api/billing/portal" className="rounded-lg border border-[rgba(255,209,102,0.25)] px-3.5 py-[7px] text-[0.8rem] font-semibold whitespace-nowrap text-[#ffd166] no-underline">
                      Update →
                    </a>
                  </div>
                )}

                {/* Plan card */}
                <div className="rounded-[14px] border bg-card px-7 py-6">
                  <div className="mb-5 flex items-center gap-2.5">
                    <h3 className="m-0 text-base font-semibold text-foreground">Current plan</h3>
                    <PlanBadge plan={plan} status={polarStatus} />
                  </div>

                  {isTrial && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between">
                        <span className="text-[0.85rem] text-muted-foreground">Trial ends in</span>
                        <span className="text-[0.85rem] font-semibold text-foreground">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[0.85rem] text-muted-foreground">Analyses used</span>
                        <span className="text-[0.85rem] font-semibold text-foreground">{analysisCount} / {TRIAL_LIMIT}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-[width] duration-300", trialPct >= 80 ? "bg-[#ef4444]" : "bg-primary")}
                          style={{ width: `${trialPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {(isActive || isPastDue) && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between">
                        <span className="text-[0.85rem] text-muted-foreground">Renews on</span>
                        <span className="text-[0.85rem] font-semibold text-foreground">{fmtDate(workspace?.polar_renews_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[0.85rem] text-muted-foreground">Analyses this month</span>
                        <span className="text-[0.85rem] font-semibold text-foreground">{analysisCount} runs</span>
                      </div>
                      <div className="mt-3 flex gap-2.5">
                        <a href="/api/billing/portal" className="rounded-lg border bg-muted px-4 py-2 text-[0.8rem] text-[var(--muted-light)] no-underline">
                          Manage billing →
                        </a>
                        <a href="/api/billing/portal" className="rounded-lg border bg-muted px-4 py-2 text-[0.8rem] text-[var(--muted-light)] no-underline">
                          View invoices →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade card */}
                {(isTrial || plan === "cancelled" || plan === "expired") && (
                  <div className="relative overflow-hidden rounded-[14px] border border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.04)] p-7">
                    <div className="absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(249,115,22,0.5),transparent)]" />
                    <div>
                      <div className="mb-1.5 text-[1.05rem] font-bold text-foreground">Choose a plan</div>
                      <div className="mb-[18px] text-[0.82rem] text-muted-foreground">Plans are based on location count and source coverage.</div>
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                        {billingPlans.map((option) => (
                          <div key={option.name} className="rounded-xl border bg-card p-4">
                            <div className="mb-2 text-[0.92rem] font-extrabold text-foreground">{option.name}</div>
                            <div className={cn("mb-1.5 font-extrabold tracking-[-0.03em] text-foreground", option.name === "Enterprise" ? "text-[1.2rem]" : "text-[1.55rem]")}>
                              {option.price}
                            </div>
                            {option.name !== "Enterprise" && <div className="-mt-1 mb-2.5 text-[0.72rem] text-muted-foreground">/ ay</div>}
                            <div className="mb-3 text-[0.76rem] leading-[1.45] text-muted-foreground">{option.description}</div>
                            <ul className="m-0 mb-3.5 flex list-none flex-col gap-[7px] p-0">
                              {option.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-[7px] text-[0.74rem] leading-[1.35] text-muted-foreground">
                                  <span className="shrink-0 text-foreground">✓</span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Button
                              asChild
                              variant={option.name === "Growth" ? "default" : "outline"}
                              className={cn(
                                "h-auto w-full px-3 py-[9px] text-[0.76rem] font-bold",
                                option.name !== "Growth" && "border bg-muted text-foreground"
                              )}
                            >
                              <a href={option.href}>{option.cta}</a>
                            </Button>
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
              <div className="flex flex-col gap-4">
                <div className="rounded-[14px] border bg-card px-7 py-6">
                  <h3 className="mb-1.5 text-base font-semibold text-foreground">Observer Firing Thresholds</h3>
                  <p className="mb-6 text-[0.8rem] leading-[1.6] text-muted-foreground">
                    Control when Observer fires alerts. Clusters below these thresholds are still visible in the dashboard but won&apos;t trigger notifications.
                  </p>

                  {/* Min severity slider */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">Minimum severity</div>
                        <div className="mt-0.5 text-[0.75rem] text-muted-foreground">Clusters below this score won&apos;t fire alerts</div>
                      </div>
                      <div className={cn(
                        "rounded-[20px] border px-3 py-1 font-mono text-[0.75rem] font-bold",
                        thresholds.min_severity >= 80
                          ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.12)] text-[#f87171]"
                          : thresholds.min_severity >= 60
                            ? "border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.12)] text-primary"
                            : "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.12)] text-[#fbbf24]"
                      )}>
                        {thresholds.min_severity}
                      </div>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={thresholds.min_severity}
                      onChange={(e) => setThresholds((t) => ({ ...t, min_severity: Number(e.target.value) }))}
                      className="w-full cursor-pointer accent-primary"
                    />
                    <div className="mt-1 flex justify-between">
                      <span className="text-[0.67rem] text-[var(--muted-dim)]">0, All clusters</span>
                      <span className="text-[0.67rem] text-[var(--muted-dim)]">100, Critical only</span>
                    </div>
                  </div>

                  {/* Min evidence */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">Minimum evidence count</div>
                        <div className="mt-0.5 text-[0.75rem] text-muted-foreground">Minimum number of signals to form an alertable cluster</div>
                      </div>
                      <div className="rounded-[20px] border bg-muted px-3 py-1 font-mono text-[0.75rem] font-bold text-foreground">
                        {thresholds.min_evidence}
                      </div>
                    </div>
                    <input
                      type="range" min={1} max={50} step={1}
                      value={thresholds.min_evidence}
                      onChange={(e) => setThresholds((t) => ({ ...t, min_evidence: Number(e.target.value) }))}
                      className="w-full cursor-pointer accent-primary"
                    />
                    <div className="mt-1 flex justify-between">
                      <span className="text-[0.67rem] text-[var(--muted-dim)]">1 signal</span>
                      <span className="text-[0.67rem] text-[var(--muted-dim)]">50 signals</span>
                    </div>
                  </div>

                  {/* Cooldown */}
                  <div className="mb-7">
                    <div className="mb-1 text-sm font-medium text-foreground">Alert cooldown</div>
                    <div className="mb-2.5 text-[0.75rem] text-muted-foreground">Don&apos;t re-alert the same cluster within this window</div>
                    <div className="flex gap-2">
                      {([24, 48, 168] as const).map((h) => (
                        <button
                          key={h}
                          onClick={() => setThresholds((t) => ({ ...t, cooldown_hours: h }))}
                          className={cn(
                            "cursor-pointer rounded-lg border-none px-4 py-2 text-[0.82rem] transition-all outline",
                            thresholds.cooldown_hours === h
                              ? "bg-[rgba(249,115,22,0.12)] font-semibold text-primary outline-[rgba(249,115,22,0.25)]"
                              : "bg-muted font-normal text-[var(--muted-light)] outline-transparent"
                          )}
                        >
                          {h === 24 ? "24h" : h === 48 ? "48h" : "1 week"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={saveThresholds}
                    disabled={savingThresholds}
                    className="h-auto px-5 py-[9px] text-sm"
                  >
                    {savingThresholds ? "Saving…" : savedThresholds ? "✓ Saved" : "Save Thresholds"}
                  </Button>
                </div>

                {/* Quick summary */}
                <div className="rounded-xl border border-[rgba(249,115,22,0.15)] bg-[rgba(249,115,22,0.04)] px-5 py-4">
                  <p className="m-0 text-[0.82rem] leading-[1.7] text-[var(--muted-light)]">
                    📡 Observer will fire alerts for clusters with severity ≥ <strong className="text-foreground">{thresholds.min_severity}</strong>,
                    backed by at least <strong className="text-foreground">{thresholds.min_evidence}</strong> evidence signals,
                    and will not re-alert within <strong className="text-foreground">{thresholds.cooldown_hours}h</strong> for the same cluster.
                  </p>
                </div>
              </div>
            )}

            {/* ───── Notifications tab ───── */}
            {activeTab === "notifications" && (
              <div className="rounded-[14px] border bg-card px-7 py-6">
                <h3 className="mb-5 text-base font-semibold text-foreground">
                  Notification preferences
                </h3>

                <div className="flex flex-col">
                  {[
                    { key: "emailOnAnalysis" as const, label: "Analysis complete", desc: "Get notified when an analysis run finishes" },
                    { key: "emailOnCritical" as const, label: "Critical signals", desc: "Alert when a critical-severity signal is detected" },
                    { key: "slackMentions" as const,   label: "Slack mentions",   desc: "Receive a Slack DM for new high-priority signals" },
                  ].map((item, i, arr) => (
                    <div
                      key={item.key}
                      className={cn("flex items-center justify-between py-4", i < arr.length - 1 && "border-b border-muted")}
                    >
                      <div>
                        <div className="mb-0.5 text-sm font-medium text-foreground">{item.label}</div>
                        <div className="text-[0.78rem] text-muted-foreground">{item.desc}</div>
                      </div>
                      <Switch
                        checked={notifConfig[item.key]}
                        onCheckedChange={(v) => setNotifConfig((p) => ({ ...p, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-muted pt-5">
                  <p className="mb-3.5 text-[0.78rem] text-muted-foreground">
                    Email notifications are sent to <span className="text-[var(--muted-light)]">{userEmail}</span>
                  </p>
                  <Button
                    onClick={saveNotifications}
                    disabled={savingNotifs}
                    className="h-auto px-[18px] py-2 text-sm"
                  >
                    {savingNotifs ? "Saving…" : savedNotifs ? "✓ Saved" : "Save preferences"}
                  </Button>
                </div>
              </div>
            )}

            {/* ───── Account tab ───── */}
            {activeTab === "account" && (
              <div className="flex flex-col gap-4">

                {/* Workspace info */}
                <div className="rounded-[14px] border bg-card px-7 py-6">
                  <h3 className="mb-[18px] text-base font-semibold text-foreground">Workspace</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.85rem] text-muted-foreground">Workspace ID</span>
                      <code className="rounded-[5px] bg-muted px-2 py-[3px] font-mono text-[0.78rem] text-[var(--muted-light)]">
                        {workspace?.id?.slice(0, 20)}…
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.85rem] text-muted-foreground">Plan</span>
                      <PlanBadge plan={plan} status={polarStatus} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.85rem] text-muted-foreground">Total analyses run</span>
                      <span className="text-[0.85rem] font-semibold text-foreground">{analysisCount}</span>
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="rounded-[14px] border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)] px-7 py-6">
                  <h3 className="mb-1.5 text-base font-semibold text-[#ef4444]">Danger zone</h3>
                  <p className="mb-[18px] text-[0.8rem] text-muted-foreground">
                    Irreversible and destructive actions. Proceed with caution.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="cursor-pointer rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-[18px] py-[9px] text-sm font-medium text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)]"
                    >
                      Delete workspace
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="m-0 text-[0.85rem] font-medium text-[#ef4444]">
                        Are you sure? This will permanently delete all your signals, clusters, and settings.
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          className="cursor-not-allowed rounded-lg border-none bg-[#ef4444] px-4 py-2 text-sm font-semibold text-foreground opacity-70"
                          title="Contact support to delete your workspace"
                          disabled
                        >
                          Yes, delete everything
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="cursor-pointer rounded-lg border bg-transparent px-3.5 py-2 text-sm text-[var(--muted-light)]"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="m-0 text-[0.75rem] text-muted-foreground">
                        To permanently delete your workspace, contact <a href="mailto:support@observerai.app" className="text-primary">support@observerai.app</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
