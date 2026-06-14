"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
                  ? "bg-[#22c55e] text-white"
                  : "border bg-muted text-muted-foreground"
              )}
            >{i + 1}</div>
            <span className={cn("text-[0.78rem]", i === 0 ? "font-semibold text-foreground" : "font-normal text-muted-foreground")}>{s}</span>
            {i < 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-[480px] rounded-3xl border bg-card px-10 pt-10 pb-8">

        {/* WA icon + header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-[18px] flex size-16 items-center justify-center rounded-[18px] border border-[rgba(37,211,102,0.25)] bg-[rgba(37,211,102,0.1)] text-[1.8rem]">💬</div>
          <h1 className="mt-0 mb-2.5 text-2xl font-extrabold tracking-[-0.03em] text-foreground">
            {t('whatsappTitle')}
          </h1>
          <p className="m-0 text-[0.88rem] leading-[1.65] text-[#71717a]">
            {t('whatsappSubtitle')}
          </p>
        </div>

        {/* Phone input */}
        <div className="mb-5">
          <Label className="mb-2 font-mono text-[0.72rem] font-bold tracking-[0.1em] text-[#71717a] uppercase">
            WhatsApp Number
          </Label>
          <div className="flex gap-2">
            <select
              value={country.code}
              onChange={(e) => setCountry(COUNTRIES.find(c => c.code === e.target.value) ?? COUNTRIES[0])}
              className="shrink-0 cursor-pointer rounded-[10px] border border-border bg-background px-2.5 py-[11px] text-sm text-foreground outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <Input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              className="h-auto flex-1 rounded-[10px] border-border bg-background px-3.5 py-[11px] text-[0.975rem] shadow-none md:text-[0.975rem] dark:bg-background"
            />
          </div>
          {isValid && (
            <div className="mt-1.5 font-mono text-[0.72rem] text-[#22c55e]">
              ✓ Will send alerts to {fullNumber}
            </div>
          )}
        </div>

        {/* WhatsApp preview bubble */}
        <div className="mb-7 rounded-[14px] border border-[rgba(37,211,102,0.15)] bg-[#0c1512] px-[18px] py-4">
          <div className="mb-2.5 font-mono text-[0.62rem] font-bold tracking-[0.1em] text-[#22c55e] uppercase">Preview, what you&apos;ll receive</div>
          <div className="rounded-[4px_12px_12px_12px] bg-[#10241c] px-3.5 py-[11px]">
            <div className="mb-1 text-[0.78rem] font-extrabold text-[#f87171]">🔴 HIGH · 84/100</div>
            <div className="mb-2 text-[0.82rem] leading-[1.55] text-[#e9edef]">
              14 customers complained about wait times this week, 2× vs last week.
            </div>
            <div className="mb-2 text-[0.75rem] text-[#9fd9bf]">💰 Weekend revenue at risk</div>
            <div className="border-t border-[rgba(255,255,255,0.07)] pt-2 text-[0.75rem] font-bold text-[#22c55e]">
              Reply: <strong>1</strong> = details &nbsp;·&nbsp; <strong>2</strong> = on it &nbsp;·&nbsp; <strong>3</strong> = skip
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!isValid || saving || saved}
          className={cn(
            "mb-3 h-auto w-full rounded-xl p-3.5 text-[0.95rem] font-bold tracking-[-0.01em] transition-all duration-150 disabled:opacity-100",
            saved
              ? "bg-[var(--success)] text-primary-foreground"
              : isValid
                ? "bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
                : "bg-muted text-muted-foreground"
          )}
        >
          {saved ? "✓ Saved! Continuing…" : saving ? t('saving') : t('saveBtn')}
        </Button>

        {/* Skip */}
        <Button
          variant="ghost"
          onClick={() => router.push("/onboarding/connect")}
          className="h-auto w-full p-2 text-[0.82rem] font-normal text-[#52525b] hover:bg-transparent hover:text-[#52525b]"
        >
          Skip for now, set up later in Alerts
        </Button>
      </div>

      <p className="mt-5 max-w-[360px] text-center text-[0.72rem] leading-[1.6] text-[#3f3f46]">
        We only send messages when Observer detects something important. No spam. You can change your number anytime.
      </p>
    </div>
  );
}
