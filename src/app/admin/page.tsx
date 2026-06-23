"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = "overview" | "customers" | "health";

interface AdminStats {
  overview: {
    workspaceCount: number;
    signalCount: number;
    clusterCount: number;
    failedDeliveries: number;
  };
  planDistribution: Record<string, number>;
  customers: Array<{
    id: string;
    name: string;
    plan: string;
    analysis_count: number;
    created_at: string;
    trial_ends_at: string | null;
    polar_status: string | null;
  }>;
  delivery: Record<string, number>;
  tokenUsage30d: {
    inputTokens: number;
    outputTokens: number;
  };
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[12px] border bg-card px-5 py-4">
      <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[0.74rem] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { year: "2-digit", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return; }
        if (r.status === 401) { router.replace("/login"); return; }
        const data = await r.json();
        setStats(data as AdminStats);
      })
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-[0.85rem] text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (forbidden || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="text-[1rem] font-bold text-foreground">Access denied</div>
        <div className="text-[0.82rem] text-muted-foreground">You need to be an Observer admin to view this page.</div>
        <button
          onClick={() => router.replace("/dashboard")}
          className="mt-2 rounded-lg border px-4 py-2 text-[0.82rem] font-semibold text-foreground"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "customers", label: `Customers (${stats.overview.workspaceCount})` },
    { key: "health", label: "Health" },
  ];

  const totalTokens = stats.tokenUsage30d.inputTokens + stats.tokenUsage30d.outputTokens;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-extrabold tracking-[-0.025em] text-foreground">Observer Admin</h1>
          <p className="mt-0.5 text-[0.8rem] text-muted-foreground">Internal operations dashboard</p>
        </div>
        <span className="rounded-md border border-[rgba(249,115,22,0.3)] bg-[rgba(249,115,22,0.08)] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#f97316]">
          ADMIN
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-[10px] border bg-card p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[0.78rem] font-semibold transition",
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Workspaces" value={stats.overview.workspaceCount} />
            <Stat label="Signals" value={fmtNum(stats.overview.signalCount)} />
            <Stat label="Clusters" value={fmtNum(stats.overview.clusterCount)} />
            <Stat
              label="Failed deliveries"
              value={stats.overview.failedDeliveries}
              sub={stats.overview.failedDeliveries > 0 ? "⚠ needs attention" : "✓ all good"}
            />
          </div>

          {/* Plan distribution */}
          <div className="rounded-[12px] border bg-card p-5">
            <h2 className="mb-4 text-[0.82rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">Plan distribution</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.planDistribution).sort().map(([plan, count]) => (
                <div key={plan} className="rounded-lg border px-4 py-3 text-center min-w-[100px]">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">{plan}</div>
                  <div className="mt-1 text-[1.5rem] font-extrabold tracking-[-0.03em] text-foreground">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Token usage */}
          <div className="rounded-[12px] border bg-card p-5">
            <h2 className="mb-4 text-[0.82rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">Token usage · last 30 days</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[0.72rem] text-muted-foreground">Input tokens</div>
                <div className="text-[1.1rem] font-bold text-foreground">{fmtNum(stats.tokenUsage30d.inputTokens)}</div>
              </div>
              <div>
                <div className="text-[0.72rem] text-muted-foreground">Output tokens</div>
                <div className="text-[1.1rem] font-bold text-foreground">{fmtNum(stats.tokenUsage30d.outputTokens)}</div>
              </div>
              <div>
                <div className="text-[0.72rem] text-muted-foreground">Total tokens</div>
                <div className="text-[1.1rem] font-bold text-foreground">{fmtNum(totalTokens)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Customers tab ── */}
      {tab === "customers" && (
        <div className="rounded-[12px] border bg-card overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-0 border-b bg-muted/40 px-4 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            <span>Workspace</span>
            <span>Plan</span>
            <span>Analyses</span>
            <span>Polar</span>
            <span>Created</span>
          </div>
          {stats.customers.length === 0 && (
            <div className="px-4 py-6 text-center text-[0.82rem] text-muted-foreground">No workspaces yet.</div>
          )}
          {stats.customers.map((ws, i) => (
            <div
              key={ws.id}
              className={cn(
                "grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 text-[0.82rem]",
                i % 2 === 0 ? "bg-card" : "bg-muted/20",
              )}
            >
              <div className="font-semibold text-foreground truncate pr-3">{ws.name || "—"}</div>
              <div>
                <span className={cn(
                  "rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase",
                  ws.plan === "trial" ? "bg-muted text-muted-foreground"
                    : ws.plan === "starter" ? "bg-[rgba(99,102,241,0.12)] text-[#818cf8]"
                    : ws.plan === "growth" ? "bg-[rgba(249,115,22,0.12)] text-[#f97316]"
                    : "bg-[rgba(34,197,94,0.12)] text-[#4ade80]",
                )}>
                  {ws.plan}
                </span>
              </div>
              <div className="text-muted-foreground">{ws.analysis_count}</div>
              <div className="text-muted-foreground">{ws.polar_status ?? "—"}</div>
              <div className="text-muted-foreground">{fmtDate(ws.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Health tab ── */}
      {tab === "health" && (
        <div className="space-y-4">
          <div className="rounded-[12px] border bg-card p-5">
            <h2 className="mb-4 text-[0.82rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">Delivery health</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.delivery).length === 0 ? (
                <p className="text-[0.82rem] text-muted-foreground">No deliveries recorded yet.</p>
              ) : (
                Object.entries(stats.delivery).map(([status, count]) => (
                  <div key={status} className={cn(
                    "rounded-lg border px-4 py-3 text-center min-w-[90px]",
                    status === "failed" && count > 0 ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]" : "",
                  )}>
                    <div className={cn(
                      "text-[0.65rem] font-bold uppercase tracking-[0.08em]",
                      status === "failed" && count > 0 ? "text-[#f87171]" : "text-muted-foreground",
                    )}>
                      {status}
                    </div>
                    <div className="mt-1 text-[1.5rem] font-extrabold tracking-[-0.03em] text-foreground">{count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[12px] border bg-card p-5">
            <h2 className="mb-4 text-[0.82rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">System</h2>
            <div className="space-y-2 text-[0.82rem]">
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground">Cron endpoint</span>
                <span className="font-semibold text-foreground">/api/cron/analyze</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground">Cron schedule</span>
                <span className="font-semibold text-foreground">0 7 * * * (daily 07:00 UTC)</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-muted-foreground">Total workspaces</span>
                <span className="font-semibold text-foreground">{stats.overview.workspaceCount}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">30d token spend</span>
                <span className="font-semibold text-foreground">
                  {fmtNum(stats.tokenUsage30d.inputTokens + stats.tokenUsage30d.outputTokens)} tokens
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
