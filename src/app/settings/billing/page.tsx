"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-green)]" />
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
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b bg-[rgba(11,12,16,0.92)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-16 max-w-[900px] items-center gap-4 px-6">
          <Logo href="/dashboard" size={22} textSize="0.9rem" gap={10} />
          <div className="h-7 w-px bg-border" />
          <span className="text-[0.875rem] text-muted-foreground">Billing</span>
          <div className="flex-1" />
          <Link href="/dashboard" className="text-[0.8rem] text-muted-foreground no-underline">← Dashboard</Link>
        </div>
      </div>

      <div className="mx-auto max-w-[700px] px-6 py-12">
        <h1 className="mb-2 text-[1.6rem] font-bold tracking-[-0.02em] text-foreground">Billing & Plan</h1>
        <p className="mb-10 text-[0.9rem] text-muted-foreground">Manage your Observer subscription.</p>

        {/* ─── Inactive banners ─── */}
        {(isCancelled || isExpired) && (
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-[rgba(255,92,122,0.25)] bg-[rgba(255,92,122,0.08)] px-5 py-4">
            <span className="text-[1.1rem]">⚠️</span>
            <div className="flex-1">
              <div className="text-[0.9rem] font-semibold text-[#ff5c7a]">
                {isCancelled ? "Subscription cancelled" : "Trial expired"}
              </div>
              <div className="text-[0.8rem] text-muted-foreground">Analysis runs are paused. Choose a plan to continue.</div>
            </div>
            <Button asChild className="h-auto whitespace-nowrap px-4 py-[7px] text-[0.8rem]">
              <a href="/api/billing/checkout">Upgrade →</a>
            </Button>
          </div>
        )}

        {isPastDue && (
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-[rgba(255,209,102,0.25)] bg-[rgba(255,209,102,0.08)] px-5 py-4">
            <span className="text-[1.1rem]">⚡</span>
            <div className="flex-1">
              <div className="text-[0.9rem] font-semibold text-[#ffd166]">Payment failed</div>
              <div className="text-[0.8rem] text-muted-foreground">Please update your payment method to avoid interruption.</div>
            </div>
            <a href="/api/billing/portal" className="rounded-lg border border-[rgba(255,209,102,0.3)] px-4 py-[7px] text-[0.8rem] font-semibold text-[#ffd166] no-underline">
              Update billing →
            </a>
          </div>
        )}

        {/* ─── Plan card ─── */}
        <div className="mb-6 rounded-[14px] border bg-card px-8 py-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            {isTrial && (
              <Badge variant="outline" className="rounded-full border-[rgba(110,168,255,0.25)] bg-[rgba(110,168,255,0.12)] px-3 py-[3px] text-[0.75rem] font-bold text-[var(--accent-blue)]">
                FREE TRIAL
              </Badge>
            )}
            {isActive && (
              <Badge variant="outline" className="rounded-full border-[rgba(70,230,166,0.25)] bg-[rgba(70,230,166,0.12)] px-3 py-[3px] text-[0.75rem] font-bold text-[var(--accent-green)]">
                PRO · ACTIVE
              </Badge>
            )}
            {isPastDue && (
              <Badge variant="outline" className="rounded-full border-[rgba(255,209,102,0.25)] bg-[rgba(255,209,102,0.12)] px-3 py-[3px] text-[0.75rem] font-bold text-[#ffd166]">
                PRO · PAST DUE
              </Badge>
            )}
            {(isCancelled || isExpired) && (
              <Badge variant="outline" className="rounded-full border-[rgba(255,92,122,0.25)] bg-[rgba(255,92,122,0.12)] px-3 py-[3px] text-[0.75rem] font-bold text-[#ff5c7a]">
                {isExpired ? "EXPIRED" : "CANCELLED"}
              </Badge>
            )}
          </div>

          {isTrial && (
            <>
              <div className="mb-2 flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Trial ends in</span>
                <span className="text-[0.85rem] font-semibold text-foreground">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</span>
              </div>
              <div className="mb-3 flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Analyses used</span>
                <span className="text-[0.85rem] font-semibold text-foreground">{analysisCount} / {TRIAL_LIMIT}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    trialPct >= 80 ? "bg-destructive" : "bg-[var(--accent-green)]"
                  )}
                  style={{ width: `${trialPct}%` }}
                />
              </div>
            </>
          )}

          {(isActive || isPastDue) && (
            <>
              <div className="mb-2 flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Renews on</span>
                <span className="text-[0.85rem] font-semibold text-foreground">{fmtDate(workspace?.polar_renews_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Analyses this month</span>
                <span className="text-[0.85rem] font-semibold text-foreground">{analysisCount} runs</span>
              </div>
            </>
          )}
        </div>

        {/* ─── Action buttons ─── */}
        {(isActive || isPastDue) && (
          <div className="mb-10 flex gap-3">
            <Button asChild variant="outline" className="h-auto rounded-[10px] bg-muted px-5 py-2.5 text-[0.875rem] font-normal text-muted-foreground">
              <a href="/api/billing/portal">Manage billing →</a>
            </Button>
            <Button asChild variant="outline" className="h-auto rounded-[10px] bg-muted px-5 py-2.5 text-[0.875rem] font-normal text-muted-foreground">
              <a href="/api/billing/portal">View invoices →</a>
            </Button>
          </div>
        )}

        {/* ─── Upgrade card (shown for trial / expired / cancelled) ─── */}
        {(isTrial || isCancelled || isExpired) && (
          <div className="relative overflow-hidden rounded-[20px] border border-[rgba(70,230,166,0.2)] bg-[linear-gradient(135deg,rgba(70,230,166,0.06),rgba(110,168,255,0.06))] p-8">
            <div className="absolute top-0 left-1/2 h-px w-[60%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(70,230,166,0.4),transparent)]" />

            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="w-full">
                <div className="mb-1.5 text-[1.1rem] font-bold text-foreground">Choose a plan</div>
                <div className="mb-[22px] text-[0.84rem] text-muted-foreground">
                  Match Observer to your location count and source coverage.
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                  {planOptions.map((option) => (
                    <div key={option.name} className="rounded-xl border bg-card p-4">
                      <div className="mb-2 text-[0.95rem] font-extrabold text-foreground">{option.name}</div>
                      <div className={cn(
                        "mb-1.5 font-extrabold tracking-[-0.03em] text-foreground",
                        option.name === "Enterprise" ? "text-[1.25rem]" : "text-[1.6rem]"
                      )}>
                        {option.price}
                      </div>
                      {option.name !== "Enterprise" && <div className="-mt-1 mb-2.5 text-[0.72rem] text-muted-foreground">/ ay</div>}
                      <div className="mb-3 text-[0.78rem] leading-[1.45] text-muted-foreground">{option.description}</div>
                      <ul className="m-0 mb-3.5 flex list-none flex-col gap-[7px] p-0">
                        {option.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-[7px] text-[0.76rem] leading-[1.35] text-muted-foreground">
                            <span className="shrink-0 text-foreground">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        asChild
                        variant={option.name === "Growth" ? "default" : "outline"}
                        className={cn(
                          "h-auto w-full rounded-lg px-3 py-[9px] text-center text-[0.78rem] font-bold",
                          option.name !== "Growth" && "bg-muted text-foreground hover:bg-muted/80"
                        )}
                      >
                        <a href={option.href}>{option.cta}</a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
