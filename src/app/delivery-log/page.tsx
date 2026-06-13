"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

interface Delivery {
  id: string;
  cluster_id: string;
  channel: "email" | "whatsapp";
  recipient: string;
  sent_at: string;
  status: "sent" | "failed" | "pending";
  subject?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function channelIcon(ch: string): string {
  if (ch === "email") return "✉️";
  if (ch === "whatsapp") return "💬";
  return "📬";
}

function channelLabel(ch: string): string {
  if (ch === "email") return "E-posta";
  if (ch === "whatsapp") return "WhatsApp";
  return ch;
}

function statusClass(status: string): string {
  if (status === "sent")    return "border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.1)] text-primary";
  if (status === "failed")  return "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] text-[#ef4444]";
  if (status === "pending") return "border-border bg-muted text-[var(--muted-light)]";
  return "border-border bg-muted text-muted-foreground";
}

// ── Mock data for empty state illustration ──────────────────────────────────

const DEMO_DELIVERIES: Delivery[] = []; // Real data from API

// ── Page ────────────────────────────────────────────────────────────────────

export default function DeliveryLogPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>(DEMO_DELIVERIES);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/auth/session");
        if (!authRes.ok) { router.push("/login?redirect=/delivery-log"); return; }

        // Fetch real deliveries
        const dRes = await fetch("/api/deliveries");
        if (dRes.ok) {
          const { deliveries: dlist } = await dRes.json();
          setDeliveries(dlist ?? []);
        }

        setAuthChecked(true);
        setLoading(false);
      } catch {
        router.push("/login?redirect=/delivery-log");
      }
    })();
  }, [router]);

  const filtered = deliveries.filter((d) => {
    if (channelFilter !== "all" && d.channel !== channelFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: deliveries.length,
    sent: deliveries.filter((d) => d.status === "sent").length,
    failed: deliveries.filter((d) => d.status === "failed").length,
    pending: deliveries.filter((d) => d.status === "pending").length,
  };

  if (!authChecked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  const filterTabClass = (active: boolean): string =>
    cn(
      "cursor-pointer rounded-[7px] border-none px-3 py-[5px] text-[0.78rem] font-medium transition-all",
      active
        ? "bg-[rgba(249,115,22,0.12)] text-primary [outline:1px_solid_rgba(249,115,22,0.25)]"
        : "bg-transparent text-muted-foreground [outline:1px_solid_transparent]"
    );

  return (
    <div className="app-shell">
      <div className="page-wrap mx-auto max-w-[1100px] px-8 pt-9 pb-20">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-[1.4rem] font-bold text-foreground">Teslimat Kaydı</h1>
            <p className="text-[0.875rem] text-muted-foreground">
              Tüm kanallardaki giden brief teslimatları
            </p>
          </div>
          <a
            href="/settings/distribution"
            className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[0.82rem] font-medium text-[var(--muted-light)] no-underline transition-all hover:border-[var(--border-hover)] hover:text-foreground"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Kanalları yapılandır
          </a>
        </div>

        {/* ── Stats row ── */}
        <div className="mb-7 grid grid-cols-4 gap-3">
          {[
            { label: "Toplam Teslimat", value: stats.total, className: "text-foreground" },
            { label: "İletildi", value: stats.sent, className: "text-primary" },
            { label: "Başarısız", value: stats.failed, className: "text-[#ef4444]" },
            { label: "Bekliyor", value: stats.pending, className: "text-[var(--muted-light)]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border bg-card px-5 py-4">
              <div className="mb-1.5 text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                {s.label}
              </div>
              <div className={cn("text-2xl leading-none font-bold", s.className)}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        {deliveries.length > 0 && (
          <div className="mb-5 flex items-center gap-4">
            <div className="flex gap-1">
              {["all", "email", "whatsapp"].map((ch) => (
                <button key={ch} className={filterTabClass(channelFilter === ch)} onClick={() => setChannelFilter(ch)}>
                  {ch === "all" ? "Tüm kanallar" : channelLabel(ch)}
                </button>
              ))}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex gap-1">
              {["all", "sent", "failed", "pending"].map((st) => (
                <button key={st} className={filterTabClass(statusFilter === st)} onClick={() => setStatusFilter(st)}>
                  {st === "all" ? "Tüm durumlar" : st === "sent" ? "İletildi" : st === "failed" ? "Başarısız" : "Bekliyor"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Table or empty state ── */}
        <div className="overflow-hidden rounded-[14px] border bg-card">
          {deliveries.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-[rgba(249,115,22,0.15)] bg-[rgba(249,115,22,0.08)] text-[1.6rem]">
                📬
              </div>
              <div className="mb-2 text-base font-semibold text-foreground">
                Henüz teslimat yok
              </div>
              <p className="mb-6 max-w-[380px] text-[0.875rem] leading-[1.6] text-muted-foreground">
                Dağıtım kanallarınızı bağlayın ve bir analiz çalıştırın. Observer gönderilen her brief&apos;i burada kayıt altına alır.
              </p>
              <div className="flex gap-2.5">
                <Button
                  asChild
                  className="h-auto rounded-md px-[18px] py-[9px] text-[0.875rem] font-semibold no-underline"
                >
                  <a href="/settings/distribution">Kanalları ayarla</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto rounded-md bg-transparent px-[18px] py-[9px] text-[0.875rem] font-normal text-[var(--muted-light)] shadow-none no-underline"
                >
                  <a href="/dashboard">Sinyallere git</a>
                </Button>
              </div>
            </div>
          ) : (
            /* ── Delivery table ── */
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {["Kanal", "Alıcı", "Konu", "Gönderildi", "Durum"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    className={cn(
                      "transition-colors hover:bg-muted",
                      i < filtered.length - 1 && "border-b border-muted"
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.95rem]">{channelIcon(d.channel)}</span>
                        <span className="text-[0.875rem] font-medium text-foreground">{channelLabel(d.channel)}</span>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-[0.8rem] text-muted-foreground">
                      {d.recipient}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3.5 text-[0.8rem] text-[var(--muted-light)]">
                      {d.subject ?? `Brief for cluster ${d.cluster_id.slice(0, 8)}`}
                    </td>
                    <td className="px-4 py-3.5 text-[0.8rem] whitespace-nowrap text-muted-foreground">
                      {timeSince(d.sent_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 px-2.5 py-[3px] text-[0.72rem] font-semibold", statusClass(d.status))}
                      >
                        {d.status === "sent" ? "✓ " : d.status === "failed" ? "✕ " : "⏳ "}
                        {d.status === "sent" ? "İletildi" : d.status === "failed" ? "Başarısız" : "Bekliyor"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && filtered.length < deliveries.length && (
          <p className="mt-4 text-center text-[0.8rem] text-muted-foreground">
            {deliveries.length} teslimatın {filtered.length} tanesi gösteriliyor
          </p>
        )}
      </div>
    </div>
  );
}
