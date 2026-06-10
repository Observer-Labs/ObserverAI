"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/types";
import { useTranslations } from 'next-intl';

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
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)" }} />
        <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.05rem" }}>Observer</span>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
        {[t('step1'), t('step2')].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i === 0 ? "rgba(34,197,94,0.15)" : "var(--primary)",
              fontSize: "0.72rem", fontWeight: 700,
              color: i === 0 ? "var(--success)" : "var(--primary-foreground)",
            }}>{i === 0 ? "✓" : "2"}</div>
            <span style={{ fontSize: "0.78rem", color: i === 1 ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: i === 1 ? 600 : 400 }}>{s}</span>
            {i < 1 && <div style={{ width: 24, height: 1, background: "var(--border)" }} />}
          </div>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "var(--foreground)", fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            {t('connectTitle')}
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.88rem", lineHeight: 1.65, margin: 0 }}>
            Pick the easiest one to start. You can add more from Sources anytime.
          </p>
        </div>

        {/* Source cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {sources.map((src) => {
            const isSel = selected === src.key;
            return (
              <div key={src.key}>
                <button
                  onClick={() => setSelected(isSel ? null : src.key)}
                  style={{
                    width: "100%", background: isSel ? `${src.color}0d` : "var(--card)",
                    border: `1.5px solid ${isSel ? src.color : "var(--border)"}`,
                    borderRadius: isSel && activeSrc?.fields.length ? "14px 14px 0 0" : "14px",
                    padding: "16px 20px", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 14, transition: "all 0.12s",
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `${src.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{src.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ color: isSel ? src.color : "var(--foreground)", fontWeight: 700, fontSize: "0.9rem" }}>{src.label}</span>
                      {src.recommended && (
                        <span style={{ fontSize: "0.58rem", fontWeight: 800, color: src.color, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Menlo, monospace", background: `${src.color}12`, border: `1px solid ${src.color}30`, borderRadius: 999, padding: "2px 7px" }}>
                          {t('recommendedBadge')}
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#71717a", fontSize: "0.75rem" }}>{src.desc}</div>
                  </div>
                  <div style={{ background: `${src.color}12`, border: `1px solid ${src.color}25`, borderRadius: 999, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 700, color: src.color, fontFamily: "Menlo, monospace", whiteSpace: "nowrap" }}>
                    {src.effort === "OAuth" ? t('effortOAuth') : src.effort === "CSV" ? t('effortCsv') : src.effort}
                  </div>
                  <div style={{ color: isSel ? src.color : "#52525b", fontSize: "1rem", flexShrink: 0 }}>{isSel ? "▼" : "▶"}</div>
                </button>

                {/* Inline form */}
                {isSel && activeSrc && activeSrc.fields.length > 0 && (
                  <div style={{ background: "var(--muted-surface)", border: `1.5px solid ${src.color}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "20px 20px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                      {activeSrc.fields.map((f) => (
                        <div key={f.key}>
                          <label style={{ display: "block", color: "#71717a", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, fontFamily: "Menlo, monospace" }}>{f.label}</label>
                          <input
                            type={f.type ?? "text"}
                            placeholder={f.placeholder}
                            value={formValues[f.key] ?? ""}
                            onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                            style={{ width: "100%", boxSizing: "border-box", background: "var(--muted-surface)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--foreground)", padding: "9px 12px", fontSize: "0.875rem", outline: "none", fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleConnect}
                      disabled={saving || done}
                      style={{
                        width: "100%", background: done ? "#22c55e" : src.color, color: "#fff", border: "none",
                        borderRadius: 10, padding: "11px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      {done ? "✓ Connected! Going to dashboard…" : saving ? t('connecting') : `${t('connectBtn')} ${src.label} →`}
                    </button>
                  </div>
                )}

                {/* Email (OAuth) */}
                {isSel && src.key === "email" && (
                  <div style={{ background: "var(--muted-surface)", border: `1.5px solid ${src.color}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "16px 20px" }}>
                    <button
                      onClick={handleConnect}
                      style={{ width: "100%", background: src.color, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Connect Gmail with Google →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Demo data option */}
        <div style={{ background: "var(--card)", border: "1px dashed var(--border)", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
          <div style={{ color: "#a1a1aa", fontSize: "0.82rem", marginBottom: 10 }}>
            Don&apos;t have credentials ready? See Observer in action with sample data.
          </div>
          <button
            onClick={handleDemoSeed}
            disabled={seeding}
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316", borderRadius: 9, padding: "9px 22px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
          >
            {seeding ? t('seedingDemo') : t('skipDemo')}
          </button>
        </div>

        {/* Skip */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "none", border: "none", color: "#52525b", fontSize: "0.78rem", cursor: "pointer" }}
          >
            Skip, go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
