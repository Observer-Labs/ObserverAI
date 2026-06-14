"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/types";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SOURCES_BY_VERTICAL: Record<string, Array<{ key: string; icon: string; label: string; desc: string; color: string; effort: string; recommended?: boolean; fields: Array<{ key: string; label: string; placeholder: string; type?: string }> }>> = {
  qsr: [
    { key: "googlereviews", icon: "⭐", label: "Google Reviews", desc: "What people say about your branches on Google", color: "#4285F4", effort: "1 min", recommended: true, fields: [{ key: "business_name", label: "Your business on Google", placeholder: "e.g. Kronotrop · Kadıköy" }] },
    { key: "email",         icon: "✉️", label: "Gmail", desc: "Support emails and customer requests from your inbox", color: "#EA4335", effort: "OAuth", fields: [] },
    { key: "yemeksepeti",   icon: "🍽️", label: "Yemeksepeti", desc: "Order ratings & customer comments", color: "#ff0a44", effort: "2 min", fields: [{ key: "restaurant_id", label: "Restaurant name or ID", placeholder: "e.g. Burger House Moda" }] },
    { key: "getir",         icon: "🛵", label: "Getir", desc: "Delivery ratings & complaints", color: "#5d3ebc", effort: "2 min", fields: [{ key: "store_id", label: "Store name or ID", placeholder: "e.g. Coffee Lab Beşiktaş" }] },
    { key: "pos",           icon: "🧾", label: "POS / Payments", desc: "Daily sales by branch, spot drops early", color: "#0f7a4f", effort: "CSV", fields: [] },
  ],
  retail: [
    { key: "googlereviews", icon: "⭐", label: "Google Reviews", desc: "What people say about your store on Google", color: "#4285F4", effort: "1 min", recommended: true, fields: [{ key: "business_name", label: "Your business on Google", placeholder: "e.g. Moda Butik · Şişli" }] },
    { key: "email",         icon: "✉️", label: "Gmail", desc: "Support emails and customer requests from your inbox", color: "#EA4335", effort: "OAuth", fields: [] },
    { key: "pos",           icon: "🧾", label: "POS / Payments", desc: "Daily sales, spot quiet drops before month-end", color: "#0f7a4f", effort: "CSV", fields: [] },
    { key: "googleanalytics", icon: "📊", label: "Google Analytics", desc: "If you have a website, traffic & checkout drops", color: "#e8710a", effort: "5 min", fields: [{ key: "property_id", label: "GA4 Property ID", placeholder: "123456789" }] },
  ],
};

const DEFAULT_SOURCES = SOURCES_BY_VERTICAL.qsr;

export default function OnboardingConnectPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [vertical, setVertical] = useState<string>("qsr");
  const [selected, setSelected] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d: { workspace?: Workspace & { vertical?: string } }) => {
        const v = (d.workspace as { vertical?: string })?.vertical ?? "qsr";
        setVertical(v === "retail" ? "retail" : "qsr");
      })
      .catch(() => {});
  }, []);

  const sources = SOURCES_BY_VERTICAL[vertical] ?? DEFAULT_SOURCES;
  const activeSrc = sources.find((s) => s.key === selected);

  const handleConnect = async () => {
    if (!selected) return;
    if (selected === "email") {
      window.location.href = "/api/auth/gmail";
      return;
    }
    setSaving(true);
    try {
      const ic: Record<string, unknown> = { [selected]: { enabled: true, ...formValues, last_sync: null } };
      await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { integrations_config: ic } }),
      });
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch { setSaving(false); }
  };

  const handleDemoSeed = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed-demo", { method: "POST" });
      router.push("/dashboard");
    } catch { setSeeding(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">

      {/* Logo */}
      <div className="mb-12">
        <Logo size={28} textSize="1.05rem" gap={10} />
      </div>

      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {[t('step1'), t('step2')].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-[26px] items-center justify-center rounded-full text-[0.72rem] font-bold",
                i === 0
                  ? "bg-[rgba(34,197,94,0.15)] text-[var(--success)]"
                  : "bg-primary text-primary-foreground"
              )}
            >{i === 0 ? "✓" : "2"}</div>
            <span className={cn("text-[0.78rem]", i === 1 ? "font-semibold text-foreground" : "font-normal text-muted-foreground")}>{s}</span>
            {i < 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-[560px]">
        <div className="mb-8 text-center">
          <h1 className="mt-0 mb-2.5 text-[clamp(1.5rem,3.5vw,2rem)] font-extrabold tracking-[-0.03em] text-foreground">
            {t('connectTitle')}
          </h1>
          <p className="m-0 text-[0.88rem] leading-[1.65] text-[#71717a]">
            Pick the easiest one to start. You can add more from Sources anytime.
          </p>
        </div>

        {/* Source cards */}
        <div className="mb-5 flex flex-col gap-2.5">
          {sources.map((src) => {
            const isSel = selected === src.key;
            return (
              <div key={src.key}>
                <button
                  onClick={() => setSelected(isSel ? null : src.key)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3.5 border-[1.5px] border-border bg-card px-5 py-4 text-left transition-all duration-[120ms]",
                    isSel && activeSrc?.fields.length ? "rounded-t-[14px]" : "rounded-[14px]"
                  )}
                  style={isSel ? { background: `${src.color}0d`, borderColor: src.color } : undefined}
                >
                  <div
                    className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] text-[1.3rem]"
                    style={{ background: `${src.color}15` }}
                  >{src.icon}</div>
                  <div className="flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className="text-[0.9rem] font-bold text-foreground"
                        style={isSel ? { color: src.color } : undefined}
                      >{src.label}</span>
                      {src.recommended && (
                        <span
                          className="rounded-full border px-[7px] py-0.5 font-mono text-[0.58rem] font-extrabold tracking-[0.08em] uppercase"
                          style={{ color: src.color, background: `${src.color}12`, borderColor: `${src.color}30` }}
                        >
                          {t('recommendedBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[0.75rem] text-[#71717a]">{src.desc}</div>
                  </div>
                  <div
                    className="rounded-full border px-2.5 py-[3px] font-mono text-[0.65rem] font-bold whitespace-nowrap"
                    style={{ background: `${src.color}12`, borderColor: `${src.color}25`, color: src.color }}
                  >
                    {src.effort === "OAuth" ? t('effortOAuth') : src.effort === "CSV" ? t('effortCsv') : src.effort}
                  </div>
                  <div
                    className="shrink-0 text-base text-[#52525b]"
                    style={isSel ? { color: src.color } : undefined}
                  >{isSel ? "▼" : "▶"}</div>
                </button>

                {/* Inline form */}
                {isSel && activeSrc && activeSrc.fields.length > 0 && (
                  <div
                    className="rounded-b-[14px] border-[1.5px] border-t-0 bg-muted px-5 pt-5 pb-4"
                    style={{ borderColor: src.color }}
                  >
                    <div className="mb-4 flex flex-col gap-3">
                      {activeSrc.fields.map((f) => (
                        <div key={f.key}>
                          <Label className="mb-[5px] font-mono text-[0.68rem] font-bold tracking-[0.1em] text-[#71717a] uppercase">{f.label}</Label>
                          <Input
                            type={f.type ?? "text"}
                            placeholder={f.placeholder}
                            value={formValues[f.key] ?? ""}
                            onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                            className="h-auto rounded-[9px] border-border bg-muted px-3 py-[9px] text-sm shadow-none dark:bg-muted"
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={saving || done}
                      className="h-auto w-full rounded-[10px] py-[11px] text-sm font-bold text-white disabled:opacity-100"
                      style={{ background: done ? "#22c55e" : src.color }}
                    >
                      {done ? "✓ Connected! Going to dashboard…" : saving ? t('connecting') : `${t('connectBtn')} ${src.label} →`}
                    </Button>
                  </div>
                )}

                {/* Email (OAuth) */}
                {isSel && src.key === "email" && (
                  <div
                    className="rounded-b-[14px] border-[1.5px] border-t-0 bg-muted px-5 py-4"
                    style={{ borderColor: src.color }}
                  >
                    <Button
                      onClick={handleConnect}
                      className="h-auto w-full rounded-[10px] py-[11px] text-sm font-bold text-white"
                      style={{ background: src.color }}
                    >
                      Connect Gmail with Google →
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Demo data option */}
        <div className="rounded-[14px] border border-dashed bg-card px-5 py-[18px] text-center">
          <div className="mb-2.5 text-[0.82rem] text-[#a1a1aa]">
            Don&apos;t have credentials ready? See Observer in action with sample data.
          </div>
          <Button
            variant="outline"
            onClick={handleDemoSeed}
            disabled={seeding}
            className="h-auto rounded-[9px] border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.1)] px-[22px] py-[9px] text-[0.82rem] font-bold text-[#f97316] shadow-none hover:bg-[rgba(249,115,22,0.1)] hover:text-[#f97316]"
          >
            {seeding ? t('seedingDemo') : t('skipDemo')}
          </Button>
        </div>

        {/* Skip */}
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="h-auto p-0 text-[0.78rem] font-normal text-[#52525b] hover:bg-transparent hover:text-[#52525b]"
          >
            Skip, go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
