"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DistributionConfig } from "@/lib/types";

const defaultConfig: DistributionConfig = {
  slack: { enabled: false, channels: [], severity_threshold: "high", schedule: "instant" },
  whatsapp: { enabled: false, recipient_numbers: [], critical_only: true },
  email: { enabled: false, recipients: [], schedule: "daily" },
  auto_distribute: false,
};

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

// ── Recipient Chip ──────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px 3px 12px",
      background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
      borderRadius: 9999, fontSize: "0.78rem", color: "var(--accent)",
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.9rem" }}
      >×</button>
    </div>
  );
}

// ── Channel card ────────────────────────────────────────────────────────────

function ChannelCard({
  icon, title, subtitle, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 24,
      transition: "border-color 0.2s",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled && children ? 20 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: "var(--muted-surface)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", flexShrink: 0, transition: "all 0.2s",
          }}>
            {icon}
          </div>
          <div>
            <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.95rem", marginBottom: 2 }}>{title}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{subtitle}</div>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {/* Expanded content */}
      {enabled && children && (
        <div style={{ paddingTop: 20, borderTop: "1px solid var(--muted-surface)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── WhatsApp Logo ────────────────────────────────────────────────────────────

function WhatsAppLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="13" fill="#25D366"/>
      <path d="M13 5.5C8.86 5.5 5.5 8.86 5.5 13c0 1.3.33 2.52.9 3.58L5.5 20.5l4-.9A7.5 7.5 0 1 0 13 5.5zm0 13.5a6 6 0 0 1-3.06-.84l-.22-.13-2.36.52.54-2.3-.14-.23A6 6 0 1 1 13 19zm3.3-4.47c-.18-.09-1.07-.53-1.24-.59-.16-.06-.28-.09-.4.09-.12.18-.46.59-.56.71-.1.12-.21.13-.39.05-.18-.09-.76-.28-1.44-.89-.53-.48-.89-1.07-1-.1.25-.15.47-.05.64.09.18.4.53.48.64.09.12.12.2.02.38-.1.18-.42.71-.51.86-.09.15-.18.17-.36.09-.18-.09-.75-.28-1.43-.88a5.38 5.38 0 0 1-.94-1.48c-.1-.26-.01-.4.07-.53.07-.1.18-.27.27-.4.09-.14.12-.23.18-.38.06-.15.03-.28-.02-.4-.05-.12-.4-.97-.55-1.33-.14-.34-.28-.3-.4-.3-.1 0-.22-.01-.34-.01-.12 0-.3.05-.46.23-.15.18-.6.59-.6 1.44s.62 1.67.71 1.79c.09.11 1.22 1.86 2.96 2.61.41.18.73.29.98.37.41.13.79.11 1.08.07.33-.05 1.01-.41 1.16-.81.14-.4.14-.74.1-.81-.05-.08-.17-.13-.36-.22z" fill="white"/>
    </svg>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function DistributionSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState<DistributionConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [waInput, setWaInput] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/auth/session");
        if (!authRes.ok) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return; }
        const wsRes = await fetch("/api/workspace");
        if (!wsRes.ok) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return; }
        const wd = await wsRes.json();
        if (wd.workspace?.distribution_config) {
          setConfig({ ...defaultConfig, ...wd.workspace.distribution_config });
        }
        setAuthChecked(true);
      } catch {
        router.push("/login");
      }
    })();
  }, [pathname, router]);

  const saveConfig = async () => {
    setSaving(true);
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: { distribution_config: config } }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addEmail = () => {
    const v = emailInput.trim();
    if (v) {
      setConfig({ ...config, email: { ...config.email, recipients: [...config.email.recipients, v] } });
      setEmailInput("");
    }
  };

  const addWaNumber = () => {
    const v = waInput.trim();
    if (v) {
      setConfig({ ...config, whatsapp: { ...config.whatsapp, recipient_numbers: [...config.whatsapp.recipient_numbers, v] } });
      setWaInput("");
    }
  };

  // Stats
  const activeChannels = [config.email.enabled, config.whatsapp.enabled].filter(Boolean).length;
  const totalRecipients = config.email.recipients.length + config.whatsapp.recipient_numbers.length;

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(249,115,22,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const lblStyle: React.CSSProperties = {
    display: "block", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div className="app-shell">
      <div className="page-wrap" style={{ maxWidth: 900, margin: "0 auto", padding: "36px 32px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1.4rem", margin: "0 0 4px" }}>Dağıtım</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>
              Observer&apos;ın içgörü özetlerini ve uyarıları nereye göndereceğini yapılandırın
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn-primary"
              onClick={saveConfig}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", fontSize: "0.875rem" }}
            >
              {saving ? (
                <>
                  <span style={{ width: 12, height: 12, border: "2px solid var(--muted-foreground)", borderTopColor: "var(--foreground)", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  Kaydediliyor…
                </>
              ) : saved ? "✓ Kaydedildi" : "Kaydet"}
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Aktif Kanal", value: activeChannels, max: 2, color: activeChannels > 0 ? "var(--accent)" : "var(--muted-light)" },
            { label: "Toplam Alıcı", value: totalRecipients, max: null, color: totalRecipients > 0 ? "var(--accent)" : "var(--muted-light)" },
            { label: "Otomatik Dağıtım", value: config.auto_distribute ? "Açık" : "Kapalı", max: null, color: config.auto_distribute ? "var(--accent)" : "var(--muted)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{ color: "var(--muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ color: stat.color, fontWeight: 700, fontSize: "1.4rem", lineHeight: 1 }}>
                {stat.value}{stat.max !== null ? <span style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: 400 }}>/{stat.max}</span> : ""}
              </div>
            </div>
          ))}
        </div>

        {/* ── Auto-distribute toggle ── */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "20px 24px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: "var(--muted-surface)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
              }}>
                ⚡
              </div>
              <div>
                <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>
                  Analiz sonrası otomatik dağıt
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                  Analiz tamamlandığında içgörü özetlerini aktif kanallara otomatik gönder
                </div>
              </div>
            </div>
            <Toggle
              checked={config.auto_distribute ?? false}
              onChange={(v) => setConfig({ ...config, auto_distribute: v })}
            />
          </div>
        </div>

        {/* ── Channel cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>

          {/* Email */}
          <ChannelCard
            icon="✉️"
            title="E-posta"
            subtitle="Analiz özetlerini ve raporları e-posta ile gönderin"
            enabled={config.email.enabled}
            onToggle={(v) => setConfig({ ...config, email: { ...config.email, enabled: v } })}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lblStyle}>Alıcılar</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    className="obs-input"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    placeholder="yonetici@sirket.com"
                    style={{ flex: 1 }}
                  />
                  <button className="btn-ghost" onClick={addEmail}
                    style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 14px", color: "var(--muted-light)", background: "none", cursor: "pointer", fontSize: "0.82rem" }}>
                    Ekle
                  </button>
                </div>
                {config.email.recipients.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {config.email.recipients.map((r) => (
                      <Chip key={r} label={r} onRemove={() => setConfig({ ...config, email: { ...config.email, recipients: config.email.recipients.filter((e) => e !== r) } })} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={lblStyle}>Gönderim programı</label>
                <select className="obs-input" value={config.email.schedule}
                  onChange={(e) => setConfig({ ...config, email: { ...config.email, schedule: e.target.value as "instant" | "daily" | "weekly" } })}
                  style={{ width: "100%" }}>
                  <option value="instant">Anında (yalnızca kritik)</option>
                  <option value="daily">Günlük özet</option>
                  <option value="weekly">Haftalık özet</option>
                </select>
              </div>
            </div>
          </ChannelCard>

          {/* WhatsApp */}
          <ChannelCard
            icon={<WhatsAppLogo />}
            title="WhatsApp"
            subtitle="Kritik uyarıları WhatsApp mesajı olarak gönderin"
            enabled={config.whatsapp.enabled}
            onToggle={(v) => setConfig({ ...config, whatsapp: { ...config.whatsapp, enabled: v } })}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lblStyle}>Alıcı numaralar</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    className="obs-input"
                    value={waInput}
                    onChange={(e) => setWaInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWaNumber()}
                    placeholder="+901234567890"
                    style={{ flex: 1 }}
                  />
                  <button className="btn-ghost" onClick={addWaNumber}
                    style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 14px", color: "var(--muted-light)", background: "none", cursor: "pointer", fontSize: "0.82rem" }}>
                    Ekle
                  </button>
                </div>
                {config.whatsapp.recipient_numbers.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {config.whatsapp.recipient_numbers.map((n) => (
                      <Chip key={n} label={n} onRemove={() => setConfig({ ...config, whatsapp: { ...config.whatsapp, recipient_numbers: config.whatsapp.recipient_numbers.filter((r) => r !== n) } })} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 0", borderTop: "1px solid var(--muted-surface)",
              }}>
                <div>
                  <div style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "0.875rem", marginBottom: 2 }}>
                    Yalnızca kritik uyarılar
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                    Yalnızca yüksek önem puanlı sinyalleri gönder (70+)
                  </div>
                </div>
                <Toggle
                  checked={config.whatsapp.critical_only}
                  onChange={(v) => setConfig({ ...config, whatsapp: { ...config.whatsapp, critical_only: v } })}
                />
              </div>
            </div>
          </ChannelCard>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
