"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DistributionConfig } from "@/lib/types";

const defaultConfig: DistributionConfig = {
  slack: { enabled: false, channels: [], severity_threshold: "high", schedule: "instant" },
  whatsapp: { enabled: false, recipient_numbers: [], critical_only: true },
  email: { enabled: false, recipients: [], schedule: "daily" },
  auto_distribute: false,
};

// ── Recipient Chip ──────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge className="gap-1.5 border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.1)] py-[3px] pr-2.5 pl-3 text-[0.78rem] font-normal text-primary">
      {label}
      <button
        onClick={onRemove}
        className="cursor-pointer border-none bg-transparent p-0 text-[0.9rem] leading-none text-muted-foreground"
      >×</button>
    </Badge>
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
    <div className="rounded-[14px] border bg-card p-6 transition-colors">
      {/* Card header */}
      <div className={cn("flex items-center justify-between", enabled && children && "mb-5")}>
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border bg-muted text-[1.2rem] transition-all">
            {icon}
          </div>
          <div>
            <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">{title}</div>
            <div className="text-[0.8rem] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {/* Expanded content */}
      {enabled && children && (
        <div className="border-t border-muted pt-5">
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  const lblCls = "mb-[6px] block text-[0.75rem] font-medium tracking-[0.05em] uppercase text-muted-foreground";

  return (
    <div className="app-shell">
      <div className="page-wrap mx-auto max-w-[900px] px-8 pt-9 pb-20">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-[1.4rem] font-bold text-foreground">Dağıtım</h1>
            <p className="m-0 text-sm text-muted-foreground">
              Observer&apos;ın içgörü özetlerini ve uyarıları nereye göndereceğini yapılandırın
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              onClick={saveConfig}
              disabled={saving}
              className="h-auto gap-1.5 px-[18px] py-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Kaydediliyor…
                </>
              ) : saved ? "✓ Kaydedildi" : "Kaydet"}
            </Button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mb-7 grid grid-cols-3 gap-3">
          {[
            { label: "Aktif Kanal", value: activeChannels, max: 2, color: activeChannels > 0 ? "text-primary" : "text-[var(--muted-light)]" },
            { label: "Toplam Alıcı", value: totalRecipients, max: null, color: totalRecipients > 0 ? "text-primary" : "text-[var(--muted-light)]" },
            { label: "Otomatik Dağıtım", value: config.auto_distribute ? "Açık" : "Kapalı", max: null, color: config.auto_distribute ? "text-primary" : "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card px-5 py-4">
              <div className="mb-1.5 text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                {stat.label}
              </div>
              <div className={cn("text-[1.4rem] leading-none font-bold", stat.color)}>
                {stat.value}{stat.max !== null ? <span className="text-[0.9rem] font-normal text-muted-foreground">/{stat.max}</span> : ""}
              </div>
            </div>
          ))}
        </div>

        {/* ── Auto-distribute toggle ── */}
        <div className="mb-4 rounded-[14px] border bg-card px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border bg-muted text-base">
                ⚡
              </div>
              <div>
                <div className="mb-0.5 text-[0.9rem] font-semibold text-foreground">
                  Analiz sonrası otomatik dağıt
                </div>
                <div className="text-[0.78rem] text-muted-foreground">
                  Analiz tamamlandığında içgörü özetlerini aktif kanallara otomatik gönder
                </div>
              </div>
            </div>
            <Switch
              checked={config.auto_distribute ?? false}
              onCheckedChange={(v) => setConfig({ ...config, auto_distribute: v })}
            />
          </div>
        </div>

        {/* ── Channel cards ── */}
        <div className="mt-2 flex flex-col gap-3">

          {/* Email */}
          <ChannelCard
            icon="✉️"
            title="E-posta"
            subtitle="Analiz özetlerini ve raporları e-posta ile gönderin"
            enabled={config.email.enabled}
            onToggle={(v) => setConfig({ ...config, email: { ...config.email, enabled: v } })}
          >
            <div className="flex flex-col gap-4">
              <div>
                <Label className={lblCls}>Alıcılar</Label>
                <div className="mb-2.5 flex gap-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    placeholder="yonetici@sirket.com"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    onClick={addEmail}
                    className="h-auto rounded-lg border px-3.5 text-[0.82rem] text-[var(--muted-light)]"
                  >
                    Ekle
                  </Button>
                </div>
                {config.email.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {config.email.recipients.map((r) => (
                      <Chip key={r} label={r} onRemove={() => setConfig({ ...config, email: { ...config.email, recipients: config.email.recipients.filter((e) => e !== r) } })} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className={lblCls}>Gönderim programı</Label>
                <Select
                  value={config.email.schedule}
                  onValueChange={(v) => setConfig({ ...config, email: { ...config.email, schedule: v as "instant" | "daily" | "weekly" } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Anında (yalnızca kritik)</SelectItem>
                    <SelectItem value="daily">Günlük özet</SelectItem>
                    <SelectItem value="weekly">Haftalık özet</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="flex flex-col gap-4">
              <div>
                <Label className={lblCls}>Alıcı numaralar</Label>
                <div className="mb-2.5 flex gap-2">
                  <Input
                    value={waInput}
                    onChange={(e) => setWaInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWaNumber()}
                    placeholder="+901234567890"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    onClick={addWaNumber}
                    className="h-auto rounded-lg border px-3.5 text-[0.82rem] text-[var(--muted-light)]"
                  >
                    Ekle
                  </Button>
                </div>
                {config.whatsapp.recipient_numbers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {config.whatsapp.recipient_numbers.map((n) => (
                      <Chip key={n} label={n} onRemove={() => setConfig({ ...config, whatsapp: { ...config.whatsapp, recipient_numbers: config.whatsapp.recipient_numbers.filter((r) => r !== n) } })} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-muted py-3.5">
                <div>
                  <div className="mb-0.5 text-sm font-medium text-foreground">
                    Yalnızca kritik uyarılar
                  </div>
                  <div className="text-[0.78rem] text-muted-foreground">
                    Yalnızca yüksek önem puanlı sinyalleri gönder (70+)
                  </div>
                </div>
                <Switch
                  checked={config.whatsapp.critical_only}
                  onCheckedChange={(v) => setConfig({ ...config, whatsapp: { ...config.whatsapp, critical_only: v } })}
                />
              </div>
            </div>
          </ChannelCard>
        </div>
      </div>
    </div>
  );
}
