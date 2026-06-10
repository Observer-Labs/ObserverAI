"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

const COUNTRIES = [
  { code: "+90", flag: "🇹🇷", name: "Türkiye" },
  { code: "+1",  flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+971",flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
];

export default function OnboardingWhatsAppPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fullNumber = `${country.code}${phone.replace(/\D/g, "")}`;
  const isValid = phone.replace(/\D/g, "").length >= 7;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            whatsapp_config: {
              enabled: true,
              webhook_verified: false,
              recipient_numbers: [fullNumber],
              critical_only: false,
            },
            distribution_config: {
              whatsapp: { enabled: true, recipient_numbers: [fullNumber], critical_only: false },
              auto_distribute: true,
            },
          },
        }),
      });
      const consentResponse = await fetch("/api/whatsapp/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullNumber, locale: "tr" }),
      });
      if (!consentResponse.ok) throw new Error("WhatsApp consent request failed");
      setSaved(true);
      setTimeout(() => router.push("/onboarding/connect"), 800);
    } catch {
      setSaving(false);
    }
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
              background: i === 0 ? "#22c55e" : "var(--muted-surface)",
              border: i === 0 ? "none" : "1px solid var(--border)",
              fontSize: "0.72rem", fontWeight: 700,
              color: i === 0 ? "#fff" : "var(--muted-foreground)",
            }}>{i + 1}</div>
            <span style={{ fontSize: "0.78rem", color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: i === 0 ? 600 : 400 }}>{s}</span>
            {i < 1 && <div style={{ width: 24, height: 1, background: "var(--border)" }} />}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, padding: "40px 40px 32px", width: "100%", maxWidth: 480 }}>

        {/* WA icon + header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 18px" }}>💬</div>
          <h1 style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            {t('whatsappTitle')}
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.88rem", lineHeight: 1.65, margin: 0 }}>
            {t('whatsappSubtitle')}
          </p>
        </div>

        {/* Phone input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: "#71717a", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Menlo, monospace" }}>
            WhatsApp Number
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={country.code}
              onChange={(e) => setCountry(COUNTRIES.find(c => c.code === e.target.value) ?? COUNTRIES[0])}
              style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--foreground)", padding: "11px 10px", fontSize: "0.875rem", outline: "none", cursor: "pointer", flexShrink: 0 }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--foreground)", padding: "11px 14px", fontSize: "0.975rem", outline: "none", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          {isValid && (
            <div style={{ color: "#22c55e", fontSize: "0.72rem", marginTop: 6, fontFamily: "Menlo, monospace" }}>
              ✓ Will send alerts to {fullNumber}
            </div>
          )}
        </div>

        {/* WhatsApp preview bubble */}
        <div style={{ background: "#0c1512", border: "1px solid rgba(37,211,102,0.15)", borderRadius: 14, padding: "16px 18px", marginBottom: 28 }}>
          <div style={{ color: "#22c55e", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Menlo, monospace", marginBottom: 10 }}>Preview, what you&apos;ll receive</div>
          <div style={{ background: "#10241c", borderRadius: "4px 12px 12px 12px", padding: "11px 14px" }}>
            <div style={{ color: "#f87171", fontSize: "0.78rem", fontWeight: 800, marginBottom: 4 }}>🔴 HIGH · 84/100</div>
            <div style={{ color: "#e9edef", fontSize: "0.82rem", lineHeight: 1.55, marginBottom: 8 }}>
              14 customers complained about wait times this week, 2× vs last week.
            </div>
            <div style={{ color: "#9fd9bf", fontSize: "0.75rem", marginBottom: 8 }}>💰 Weekend revenue at risk</div>
            <div style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 700, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
              Reply: <strong>1</strong> = details &nbsp;·&nbsp; <strong>2</strong> = on it &nbsp;·&nbsp; <strong>3</strong> = skip
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isValid || saving || saved}
          style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: saved ? "var(--success)" : isValid ? "var(--primary)" : "var(--muted-surface)",
            color: (isValid || saved) ? "var(--primary-foreground)" : "var(--muted-foreground)",
            fontSize: "0.95rem", fontWeight: 700, cursor: isValid ? "pointer" : "not-allowed",
            transition: "all 0.15s", letterSpacing: "-0.01em",
            boxShadow: isValid && !saved ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
            marginBottom: 12,
          }}
        >
          {saved ? "✓ Saved! Continuing…" : saving ? t('saving') : t('saveBtn')}
        </button>

        {/* Skip */}
        <button
          onClick={() => router.push("/onboarding/connect")}
          style={{ width: "100%", background: "none", border: "none", color: "#52525b", fontSize: "0.82rem", cursor: "pointer", padding: "8px" }}
        >
          Skip for now, set up later in Alerts
        </button>
      </div>

      <p style={{ color: "#3f3f46", fontSize: "0.72rem", marginTop: 20, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        We only send messages when Observer detects something important. No spam. You can change your number anytime.
      </p>
    </div>
  );
}
