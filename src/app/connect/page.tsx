"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import type { IntegrationsConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveSourceKey =
  // ── MVP (SME / local business) ──
  | "googlereviews"
  | "getir"
  | "yemeksepeti"
  | "trendyol"
  | "pos"
  | "googleanalytics"
  // ── kept for later verticals (not shown in MVP) ──
  | "appstore"
  | "email"
  | "reddit"
  | "zendesk"
  | "intercom"
  | "slack"
  | "github"
  | "jira"
  | "shopify"
  | "googleplay"
  | "trustpilot";

interface Workspace {
  id: string;
  gmail_token?: string;
  slack_token?: string;
  integrations_config?: IntegrationsConfig;
  distribution_config?: Record<string, unknown>;
}

// ── Source definitions ────────────────────────────────────────────────────────

interface ActiveSource {
  key: ActiveSourceKey;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: string;
}

const ACTIVE_SOURCES: ActiveSource[] = [
  {
    key: "googlereviews",
    label: "Google Reviews",
    icon: "⭐",
    color: "#4285F4",
    description: "Şubeleriniz hakkında Google'da yazılan yorumlar otomatik olarak çekilir",
    category: "Yorumlar",
  },
  {
    key: "getir",
    label: "Getir",
    icon: "🛵",
    color: "#5d3ebc",
    description: "Getir'deki teslimat derecelendirmeleri ve müşteri yorumları",
    category: "Teslimat",
  },
  {
    key: "yemeksepeti",
    label: "Yemeksepeti",
    icon: "🍽️",
    color: "#ff0a44",
    description: "Yemeksepeti'ndeki sipariş derecelendirmeleri ve şikayetler",
    category: "Teslimat",
  },
  {
    key: "trendyol",
    label: "Trendyol Go",
    icon: "🛍️",
    color: "#f27a1a",
    description: "Trendyol Go'daki teslimat yorumları ve derecelendirmeleri",
    category: "Teslimat",
  },
  {
    key: "pos",
    label: "POS / Ödeme Sistemi",
    icon: "🧾",
    color: "#0f7a4f",
    description: "Şube bazlı günlük satışlar — ay sonu gelmeden düşüşleri erkenden yakalayın",
    category: "Satış",
  },
  {
    key: "googleanalytics",
    label: "Google Analytics",
    icon: "📊",
    color: "#e8710a",
    description: "Web siteniz varsa trafik düşüşlerini ve sepet terk oranını takip edin",
    category: "Web sitesi",
  },
  {
    key: "email",
    label: "Gmail",
    icon: "✉️",
    color: "#EA4335",
    description: "Müşteri e-postalarını ve destek taleplerini sinyal olarak içeri aktarın",
    category: "E-posta",
  },
];

const COMING_SOON = [
  { label: "Instagram",  icon: "📸", category: "Sosyal medya" },
  { label: "Shopify",    icon: "🛒", category: "E-ticaret" },
  { label: "App Store",  icon: "📱", category: "Uygulama yorumları" },
  { label: "Trustpilot", icon: "✅", category: "Yorumlar" },
];

// ── Default configs ───────────────────────────────────────────────────────────

const DEFAULT_CONFIGS: Record<ActiveSourceKey, Record<string, unknown>> = {
  googlereviews:   { enabled: false, business_name: "", last_sync: null },
  getir:           { enabled: false, store_id: "", last_sync: null },
  yemeksepeti:     { enabled: false, restaurant_id: "", last_sync: null },
  trendyol:        { enabled: false, store_id: "", last_sync: null },
  pos:             { enabled: false, last_sync: null },
  appstore:        { enabled: false, app_id_ios: "", app_id_android: "", max_rating: 3, last_sync: null },
  email:           { enabled: false, max_age_days: 7, sender_domains: "", last_sync: null },
  reddit:          { enabled: false, client_id: "", client_secret: "", subreddits: "", min_score: 10, last_sync: null },
  zendesk:         { enabled: false, subdomain: "", email: "", api_token: "", min_priority: "normal", exclude_closed: true, last_sync: null },
  intercom:        { enabled: false, access_token: "", open_only: true, last_sync: null },
  slack:           { enabled: false, max_age_days: 7, keyword_filter: "", last_sync: null },
  github:          { enabled: false, token: "", owner: "", repo: "", min_reactions: 0, labels: "", last_sync: null },
  jira:            { enabled: false, domain: "", email: "", api_token: "", project_key: "", min_priority: "medium", exclude_done: true, issue_types: "", last_sync: null },
  shopify:         { enabled: false, shop_domain: "", access_token: "", last_sync: null },
  googleplay:      { enabled: false, package_name: "", service_account_key: "", max_rating: 3, last_sync: null },
  googleanalytics: { enabled: false, property_id: "", service_account_email: "", service_account_key: "", event_filter: "", last_sync: null },
  trustpilot:      { enabled: false, business_unit_id: "", api_key: "", max_rating: 3, last_sync: null },
};

// ── Config form fields per source ─────────────────────────────────────────────

interface FormField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "number" | "textarea" | "select" | "checkbox";
  hint?: string;
  options?: { value: string | number; label: string }[];
}

const SOURCE_FIELDS: Record<ActiveSourceKey, FormField[]> = {
  googlereviews: [
    { key: "business_name", label: "Google'daki işletme adınız", placeholder: "örn. Kronotrop · Kadıköy", hint: "Google Haritalar'da göründüğü şekilde işletme adını girin. Yorumları otomatik çekeceğiz." },
  ],
  getir: [
    { key: "store_id", label: "Getir'deki mağaza adı veya kimliği", placeholder: "örn. Coffee Lab · Beşiktaş", hint: "Getir iş ortağı panelinizde görünen mağaza adı." },
  ],
  yemeksepeti: [
    { key: "restaurant_id", label: "Yemeksepeti'ndeki restoran adı veya kimliği", placeholder: "örn. Burger House · Moda", hint: "Yemeksepeti'nde görünen restoran adınız." },
  ],
  trendyol: [
    { key: "store_id", label: "Trendyol Go'daki mağaza adı veya kimliği", placeholder: "örn. Pizza Roma · Şişli", hint: "Trendyol Go'da görünen mağaza adınız." },
  ],
  pos: [
    { key: "note", label: "Nasıl bağlanılır", placeholder: "", type: "textarea", hint: "Günlük şube satışlarını POS sisteminizden CSV olarak dışa aktarın ve yükleyin (yakında hazır). Şimdilik örnek veriler nasıl görüneceğini gösteriyor." },
  ],
  appstore: [
    { key: "app_id_ios",  label: "iOS App Kimliği (App Store)", placeholder: "örn. 123456789", hint: "App Store Connect → Uygulama Bilgileri bölümünden bulabilirsiniz." },
    { key: "max_rating",  label: "Maksimum Yıldız Puanı", placeholder: "3", type: "select", options: [{ value: 1, label: "Yalnızca 1 yıldız" }, { value: 2, label: "2 yıldız ve altı" }, { value: 3, label: "3 yıldız ve altı" }], hint: "Yalnızca bu puan ve altındaki yorumları çek" },
  ],
  googleplay: [
    { key: "package_name",        label: "Uygulama Paket Adı",              placeholder: "com.yourcompany.app", hint: "Android paket kimliği, örn. com.example.app" },
    { key: "service_account_key", label: "Servis Hesabı Anahtarı (JSON)",   placeholder: '{"type":"service_account",...}', type: "textarea", hint: "Google Cloud → IAM → Servis Hesapları'ndan alınan JSON anahtarı. androidpublisher iznine ihtiyaç duyar." },
    { key: "max_rating",          label: "Maksimum Yıldız Puanı",           placeholder: "3", type: "select", options: [{ value: 1, label: "Yalnızca 1 yıldız" }, { value: 2, label: "2 yıldız ve altı" }, { value: 3, label: "3 yıldız ve altı" }], hint: "Yalnızca bu puan ve altındaki yorumları çek" },
  ],
  trustpilot: [
    { key: "business_unit_id", label: "İşletme Birimi Kimliği", placeholder: "abc123def456", hint: "Trustpilot Business → Entegrasyonlar → API bölümünde bulunur. 24 karakterlik hex dizisi şeklindedir." },
    { key: "api_key",          label: "API Anahtarı",           placeholder: "••••••••••••••••", type: "password", hint: "Trustpilot Business → Entegrasyonlar → Trustpilot API'den oluşturun" },
    { key: "max_rating",       label: "Maksimum Yıldız Puanı", placeholder: "3", type: "select", options: [{ value: 1, label: "Yalnızca 1 yıldız" }, { value: 2, label: "2 yıldız ve altı" }, { value: 3, label: "3 yıldız ve altı" }], hint: "Yalnızca bu puan ve altındaki yorumları çek" },
  ],
  shopify: [
    { key: "shop_domain",   label: "Mağaza Adresi",    placeholder: "mystore.myshopify.com", hint: "Shopify mağaza adresiniz, örn. mystore.myshopify.com" },
    { key: "access_token",  label: "Admin API Token",  placeholder: "shpat_••••••••••••••••", type: "password", hint: "Shopify Yönetici → Uygulamalar → Uygulama geliştir → Uygulama oluştur → API kimlik bilgileri" },
  ],
  googleanalytics: [
    { key: "property_id",           label: "GA4 Mülk Kimliği",               placeholder: "123456789", hint: "Google Analytics → Yönetici → Mülk → Mülk ayrıntıları bölümünde bulunur." },
    { key: "service_account_email", label: "Servis Hesabı E-postası",         placeholder: "signal@your-project.iam.gserviceaccount.com", hint: "Bu e-postayı GA4 Yönetici → Hesap → Hesap Erişim Yönetimi'nde İzleyici olarak ekleyin." },
    { key: "service_account_key",   label: "Servis Hesabı Anahtarı (JSON)",  placeholder: '{"type":"service_account",...}', type: "textarea", hint: "Google Cloud → IAM → Servis Hesapları'ndan alınan JSON anahtarı. analyticsdata.readonly iznine ihtiyaç duyar." },
    { key: "event_filter",          label: "Etkinlik Filtresi (isteğe bağlı)", placeholder: "page_view, purchase, sign_up", hint: "Virgülle ayrılmış etkinlik adları. Tüm etkinlikleri izlemek için boş bırakın." },
  ],
  email: [
    { key: "sender_domains", label: "Gönderici Alan Adı Filtresi", placeholder: "sirketiniz.com, marka.io", hint: "Virgülle ayrılmış alan adları. Tüm gelen e-postaları yakalamak için boş bırakın." },
    { key: "max_age_days",   label: "Geriye Dönük Süre (gün)",     placeholder: "7", type: "number", hint: "Her senkronizasyonda yalnızca son N günün e-postalarını çek" },
  ],
  reddit: [
    { key: "client_id",     label: "Reddit Uygulama İstemci Kimliği", placeholder: "AbCdEfGhIj1234", hint: "reddit.com/prefs/apps adresinden bir uygulama oluşturun" },
    { key: "client_secret", label: "Reddit Uygulama Gizli Anahtarı",  placeholder: "••••••••••••••••", type: "password" },
    { key: "subreddits",    label: "Subredditler",                     placeholder: "r/urunadi, r/rakipurun", hint: "Virgülle ayrılmış. r/ öneki isteğe bağlı." },
    { key: "min_score",     label: "Minimum Gönderi Puanı",            placeholder: "10", type: "number", hint: "Yalnızca en az bu kadar upvote alan gönderileri çek" },
  ],
  zendesk: [
    { key: "subdomain",    label: "Zendesk Alt Alanı",    placeholder: "sirketiniz",           hint: "URL'nizdeki .zendesk.com önceki kısım" },
    { key: "email",        label: "Temsilci E-postası",   placeholder: "siz@sirketiniz.com" },
    { key: "api_token",    label: "API Token",            placeholder: "••••••••••••••••",     type: "password", hint: "Zendesk Yönetici → Uygulamalar & Entegrasyonlar → Zendesk API'den oluşturun" },
    { key: "min_priority", label: "Minimum Öncelik",      placeholder: "normal",               type: "select", options: [{ value: "low", label: "Düşük ve üzeri" }, { value: "normal", label: "Normal ve üzeri" }, { value: "high", label: "Yüksek ve üzeri" }, { value: "urgent", label: "Yalnızca acil" }], hint: "Yalnızca bu öncelik ve üzerindeki biletleri çek" },
  ],
  intercom: [
    { key: "access_token", label: "Erişim Token'ı",             placeholder: "••••••••••••••••", type: "password", hint: "Intercom Developer Hub → Uygulamanız → Kimlik Doğrulama bölümünden oluşturun" },
    { key: "open_only",    label: "Yalnızca açık konuşmalar",   placeholder: "", type: "checkbox", hint: "Çözülmüş konuşmaları da dahil etmek için işareti kaldırın" },
  ],
  slack: [
    { key: "max_age_days",   label: "Geriye Dönük Süre (gün)",         placeholder: "7", type: "number", hint: "Her senkronizasyonda yalnızca son N günün mesajlarını çek" },
    { key: "keyword_filter", label: "Anahtar Kelime Filtresi (isteğe bağlı)", placeholder: "hata, arıza, öneri, istek", hint: "Virgülle ayrılmış kelimeler. Tüm mesajları yakalamak için boş bırakın." },
  ],
  github: [
    { key: "token",         label: "Kişisel Erişim Token'ı",          placeholder: "ghp_••••••••••••••••", type: "password", hint: "repo:read iznine ihtiyaç duyar. GitHub → Ayarlar → Geliştirici Ayarları → PAT'tan oluşturun" },
    { key: "owner",         label: "Depo Sahibi",                     placeholder: "organizasyonunuz",    hint: "GitHub kullanıcı adı veya organizasyon adı" },
    { key: "repo",          label: "Depo Adı",                        placeholder: "depo-adiniz",         hint: "Depo kısa adı (sahip öneki olmadan)" },
    { key: "labels",        label: "Etiket Filtresi (isteğe bağlı)",  placeholder: "bug, feature-request, feedback", hint: "Virgülle ayrılmış etiket adları. Tüm issue'ları çekmek için boş bırakın." },
    { key: "min_reactions", label: "Minimum Tepki Sayısı",            placeholder: "0", type: "number", hint: "Yalnızca en az bu kadar 👍 tepkisi olan issue'ları çek" },
  ],
  jira: [
    { key: "domain",       label: "Jira Alan Adı",           placeholder: "sirketiniz.atlassian.net", hint: "Atlassian adresiniz, https:// olmadan" },
    { key: "email",        label: "Hesap E-postası",          placeholder: "siz@sirketiniz.com" },
    { key: "api_token",    label: "API Token",               placeholder: "••••••••••••••••", type: "password", hint: "id.atlassian.com → API Token'larından oluşturun" },
    { key: "project_key",  label: "Proje Anahtarı",          placeholder: "PROD", hint: "Jira'da proje adının yanında görünen anahtar (örn. PROD, ENG)" },
    { key: "issue_types",  label: "Issue Türleri (isteğe bağlı)", placeholder: "Bug, Story, Task", hint: "Virgülle ayrılmış. Tüm türleri çekmek için boş bırakın." },
    { key: "min_priority", label: "Minimum Öncelik",         placeholder: "medium", type: "select", options: [{ value: "lowest", label: "En düşük ve üzeri" }, { value: "low", label: "Düşük ve üzeri" }, { value: "medium", label: "Orta ve üzeri" }, { value: "high", label: "Yüksek ve üzeri" }, { value: "highest", label: "Yalnızca en yüksek" }], hint: "Yalnızca bu öncelik ve üzerindeki issue'ları çek" },
  ],
};

// ── Connection status helper ──────────────────────────────────────────────────

function isConnected(key: ActiveSourceKey, workspace: Workspace | null): boolean {
  if (!workspace) return false;
  if (key === "email") return !!workspace.gmail_token;
  if (key === "slack") return !!workspace.slack_token;
  const config = workspace.integrations_config?.[key as keyof IntegrationsConfig] as Record<string, unknown> | undefined;
  return !!(config?.enabled);
}

// Map source key to ingest route (some keys match, some don't)
function ingestRoute(key: ActiveSourceKey): string {
  return `/api/ingest/${key}`;
}

function getConnectedCount(workspace: Workspace | null): number {
  return ACTIVE_SOURCES.filter((s) => isConnected(s.key, workspace)).length;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ConnectPageContent() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActiveSourceKey | null>(null);
  const [formValues, setFormValues] = useState<Record<ActiveSourceKey, Record<string, unknown>>>({
    googlereviews:   { ...DEFAULT_CONFIGS.googlereviews },
    getir:           { ...DEFAULT_CONFIGS.getir },
    yemeksepeti:     { ...DEFAULT_CONFIGS.yemeksepeti },
    trendyol:        { ...DEFAULT_CONFIGS.trendyol },
    pos:             { ...DEFAULT_CONFIGS.pos },
    appstore:        { ...DEFAULT_CONFIGS.appstore },
    email:           { ...DEFAULT_CONFIGS.email },
    reddit:          { ...DEFAULT_CONFIGS.reddit },
    zendesk:         { ...DEFAULT_CONFIGS.zendesk },
    intercom:        { ...DEFAULT_CONFIGS.intercom },
    slack:           { ...DEFAULT_CONFIGS.slack },
    github:          { ...DEFAULT_CONFIGS.github },
    jira:            { ...DEFAULT_CONFIGS.jira },
    shopify:         { ...DEFAULT_CONFIGS.shopify },
    googleplay:      { ...DEFAULT_CONFIGS.googleplay },
    googleanalytics: { ...DEFAULT_CONFIGS.googleanalytics },
    trustpilot:      { ...DEFAULT_CONFIGS.trustpilot },
  });
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<ActiveSourceKey | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadWorkspace = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace");
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) return;
      const { workspace: data } = await res.json() as { workspace: Workspace };
      if (!data) return;
      setWorkspace(data);

      // Hydrate form values from saved config
      const ic = data.integrations_config;
      if (ic) {
        setFormValues((prev) => {
          const next = { ...prev };
          for (const key of ["googlereviews", "getir", "yemeksepeti", "trendyol", "pos", "appstore", "email", "reddit", "zendesk", "intercom", "slack", "github", "jira", "shopify", "googleplay", "googleanalytics", "trustpilot"] as ActiveSourceKey[]) {
            const saved = ic[key as keyof IntegrationsConfig] as unknown as Record<string, unknown> | undefined;
            if (saved) next[key] = { ...DEFAULT_CONFIGS[key], ...saved };
          }
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  async function saveSource(key: ActiveSourceKey) {
    setSaving(true);
    try {
      const values = { ...formValues[key], enabled: true };
      // Merge new values into existing integrations_config so other sources aren't wiped
      const mergedConfig = { ...(workspace?.integrations_config ?? {}), [key]: values };
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { integrations_config: mergedConfig } }),
      });
      if (res.ok) {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2500);
        await loadWorkspace();
      }
    } finally {
      setSaving(false);
    }
  }

  async function disconnectSource(key: ActiveSourceKey) {
    const mergedConfig = {
      ...(workspace?.integrations_config ?? {}),
      [key]: { ...formValues[key], enabled: false },
    };
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: { integrations_config: mergedConfig } }),
    });
    await loadWorkspace();
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const connected = ACTIVE_SOURCES.filter((s) => isConnected(s.key, workspace));
      await Promise.allSettled(
        connected.map((s) => fetch(ingestRoute(s.key), { method: "POST" }))
      );
      router.push("/dashboard");
    } finally {
      setSyncing(false);
    }
  }

  const connectedCount = getConnectedCount(workspace);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-mono text-xs text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-wrap mx-auto max-w-[1100px] px-8 pt-10 pb-20">

        {/* ── Header ── */}
        <div className="mb-9 flex items-start justify-between">
          <div>
            <h1 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.025em] text-foreground">
              Veri Kaynakları
            </h1>
            <p className="mt-1.5 mb-0 text-[0.82rem] leading-[1.6] text-muted-foreground">
              Platformlarınızı bağlayın. Observer geri bildirimleri otomatik olarak toplar, gruplandırır ve önceliklendirir.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Progress pill */}
            <div className="flex items-center gap-2 rounded-[20px] border bg-card px-3 py-1.5">
              <div className="flex gap-[3px]">
                {ACTIVE_SOURCES.map((s) => (
                  <div key={s.key} className={cn("size-1.5 rounded-full", isConnected(s.key, workspace) ? "bg-[#22c55e]" : "bg-border")} />
                ))}
              </div>
              <span className={cn("font-mono text-[0.7rem] font-bold", connectedCount > 0 ? "text-[#4ade80]" : "text-muted-foreground")}>
                {connectedCount}/{ACTIVE_SOURCES.length} bağlı
              </span>
            </div>
            {connectedCount > 0 && (
              <Button
                onClick={syncAll}
                disabled={syncing}
                className={cn(
                  "h-auto gap-1.5 rounded-lg px-[18px] py-2 text-[0.8rem] font-bold disabled:opacity-100",
                  syncing && "bg-[rgba(249,115,22,0.5)]"
                )}
              >
                {syncing ? "Senkronize ediliyor…" : "↻ Senkronize Et & Analiz Et"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Active Sources Grid + Detail ── */}
        <div className={cn("mb-12 grid items-start gap-5", selected ? "grid-cols-[340px_1fr]" : "grid-cols-1")}>

          {/* Source Cards */}
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 font-mono text-[0.6rem] font-bold tracking-[0.12em] text-[var(--muted-dim)] uppercase">
              Aktif Kaynaklar
            </div>
            {ACTIVE_SOURCES.map((source) => {
              const connected = isConnected(source.key, workspace);
              const isActive = selected === source.key;
              return (
                <button
                  key={source.key}
                  onClick={() => setSelected(isActive ? null : source.key)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3.5 rounded-[10px] border px-4 py-3.5 text-left transition-all duration-[120ms]",
                    isActive ? "border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.06)]" : "border-border bg-card"
                  )}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-[1.1rem]"
                    style={{ background: `${source.color}18`, borderColor: `${source.color}30` }}
                  >
                    {source.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.88rem] font-bold text-foreground">{source.label}</span>
                      <span className="rounded bg-muted px-1.5 py-px font-mono text-[0.6rem] font-semibold text-[var(--muted-dim)]">
                        {source.category}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[0.72rem] leading-[1.5] text-muted-foreground">{source.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {connected ? (
                      <span className="flex items-center gap-1 font-mono text-[0.65rem] font-bold text-[#4ade80]">
                        <div className="size-[5px] rounded-full bg-[#22c55e]" />
                        LIVE
                      </span>
                    ) : (
                      <span className={cn("leading-none font-semibold", isActive ? "text-base text-primary" : "text-[0.65rem] text-[var(--muted-dim)]")}>
                        {isActive ? "›" : "Bağlan →"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Config Panel */}
          {selected && (() => {
            const src = ACTIVE_SOURCES.find((s) => s.key === selected)!;
            const connected = isConnected(selected, workspace);
            const fields = SOURCE_FIELDS[selected];
            return (
              <div className="sticky top-[88px] overflow-hidden rounded-xl border bg-card">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[1.2rem]">{src.icon}</span>
                    <div>
                      <div className="text-[0.9rem] font-bold text-foreground">{src.label}</div>
                      <div className="font-mono text-[0.65rem] text-muted-foreground">{src.category}</div>
                    </div>
                  </div>
                  {connected && (
                    <span className="flex items-center gap-1 rounded-md border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2 py-[3px] text-[0.65rem] font-bold text-[#4ade80]">
                      <div className="size-[5px] rounded-full bg-[#22c55e]" />
                      Bağlı
                    </span>
                  )}
                </div>

                {/* Special: Email OAuth */}
                {selected === "email" && !workspace?.gmail_token ? (
                  <div className="p-6">
                    <p className="mt-0 mb-5 text-[0.82rem] leading-[1.65] text-muted-foreground">
                      Gmail hesabınızı bağlayarak destek e-postalarını sinyal olarak içeri aktarın. Observer yalnızca okur, hiçbir şey göndermez.
                    </p>
                    <Button asChild className="h-auto gap-2 rounded-lg bg-[#EA4335] px-[18px] py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#EA4335]/90">
                      <a href="/api/auth/gmail">
                        <span>✉️</span> Gmail&apos;i Bağla
                      </a>
                    </Button>
                    {formValues.email && (
                      <div className="mt-6 border-t pt-5">
                        <div className="mb-3.5 font-mono text-[0.65rem] font-bold tracking-[0.1em] text-[var(--muted-dim)] uppercase">Filtreler</div>
                        <div className="flex flex-col gap-[18px]">
                          {fields.map((f) => renderField(f, selected, formValues, setFormValues))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : selected === "slack" && !workspace?.slack_token ? (
                  /* Special: Slack OAuth */
                  <div className="p-6">
                    <p className="mt-0 mb-5 text-[0.82rem] leading-[1.65] text-muted-foreground">
                      Slack çalışma alanınızı bağlayarak kanal mesajlarını sinyal olarak içeri aktarın. Observer yalnızca davet ettiğiniz genel kanalları okur.
                    </p>
                    <Button asChild className="h-auto gap-2 rounded-lg bg-[#4A154B] px-[18px] py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#4A154B]/90">
                      <a href={`/api/auth/slack?state=${workspace?.id ?? ""}`}>
                        <span>⚡</span> Slack&apos;ı Bağla
                      </a>
                    </Button>
                    <p className="mt-4 mb-0 text-[0.72rem] leading-[1.55] text-[var(--muted-dim)]">
                      Bağlandıktan sonra Observer botunu kanallara davet edin: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">/invite @signal</code>
                    </p>
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Slack re-auth link if already connected */}
                    {selected === "slack" && workspace?.slack_token && (
                      <div className="mb-5 rounded-lg border border-[rgba(74,21,75,0.3)] bg-[rgba(74,21,75,0.15)] px-3.5 py-2.5">
                        <div className="text-[0.72rem] leading-[1.55] text-muted-foreground">
                          Slack çalışma alanı bağlı. Aşağıdan içe aktarma ayarlarını düzenleyin.{" "}
                          <a href={`/api/auth/slack?state=${workspace?.id ?? ""}`} className="text-primary no-underline">Yeniden bağlan →</a>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-[18px]">
                      {fields.map((f) => renderField(f, selected, formValues, setFormValues))}
                    </div>
                    <div className="mt-6 flex gap-2.5">
                      <Button
                        onClick={() => saveSource(selected)}
                        disabled={saving}
                        className={cn(
                          "h-auto flex-1 rounded-lg px-4 py-2.5 text-[0.82rem] font-bold transition-colors duration-200 disabled:opacity-100",
                          savedKey === selected
                            ? "bg-[#22c55e] hover:bg-[#22c55e]"
                            : saving
                              ? "bg-[rgba(249,115,22,0.5)]"
                              : undefined
                        )}
                      >
                        {savedKey === selected ? "✓ Kaydedildi" : saving ? "Kaydediliyor…" : connected ? "Güncelle" : "Bağlan"}
                      </Button>
                      {connected && (
                        <Button
                          variant="outline"
                          onClick={() => disconnectSource(selected)}
                          className="h-auto rounded-lg border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-[0.78rem] font-semibold text-[#f87171] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#f87171]"
                        >
                          Bağlantıyı Kes
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Coming Soon ── */}
        <div>
          <div className="mb-3 font-mono text-[0.6rem] font-bold tracking-[0.12em] text-[var(--muted-dim)] uppercase">
            Yakında
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {COMING_SOON.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3.5 py-3 opacity-50"
              >
                <span className="text-[0.95rem]">{s.icon}</span>
                <div>
                  <div className="text-[0.8rem] font-semibold text-foreground">{s.label}</div>
                  <div className="mt-px font-mono text-[0.6rem] text-[var(--muted-dim)]">{s.category}</div>
                </div>
                <div className="ml-auto rounded border border-[rgba(249,115,22,0.3)] px-[5px] py-px font-mono text-[0.55rem] font-bold whitespace-nowrap text-primary">SOON</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Render field helper ───────────────────────────────────────────────────────

function renderField(
  f: FormField,
  sourceKey: ActiveSourceKey,
  formValues: Record<ActiveSourceKey, Record<string, unknown>>,
  setFormValues: React.Dispatch<React.SetStateAction<Record<ActiveSourceKey, Record<string, unknown>>>>
) {
  const val = formValues[sourceKey][f.key] ?? "";
  const inputClasses =
    "w-full rounded-[7px] border border-border bg-muted px-3 py-[9px] text-[0.82rem] text-foreground outline-none";

  return (
    <div key={f.key}>
      <Label className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {f.label}
      </Label>
      {f.type === "checkbox" ? (
        <Label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.checked } }))}
            className="size-4 cursor-pointer accent-primary"
          />
          <span className="text-[0.8rem] font-normal text-muted-foreground">{f.hint}</span>
        </Label>
      ) : f.type === "textarea" ? (
        <textarea
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.value } }))}
          placeholder={f.placeholder}
          rows={4}
          className={cn(inputClasses, "resize-y leading-[1.5]")}
        />
      ) : f.type === "select" && f.options ? (
        <select
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.value } }))}
          className={cn(inputClasses, "cursor-pointer")}
        >
          {f.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      ) : (
        <Input
          type={f.type ?? "text"}
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } }))}
          placeholder={f.placeholder}
          className="h-auto rounded-[7px] border-border bg-muted px-3 py-[9px] text-[0.82rem] shadow-none md:text-[0.82rem] dark:bg-muted"
        />
      )}
      {f.hint && f.type !== "checkbox" && (
        <div className="mt-[5px] text-[0.67rem] leading-[1.55] text-[var(--muted-dim)]">{f.hint}</div>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <ConnectPageContent />
    </Suspense>
  );
}
