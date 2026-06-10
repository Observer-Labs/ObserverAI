"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import type { IntegrationsConfig } from "@/lib/types";

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
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-wrap" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.025em" }}>
              Veri Kaynakları
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Platformlarınızı bağlayın. Observer geri bildirimleri otomatik olarak toplar, gruplandırır ve önceliklendirir.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {/* Progress pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {ACTIVE_SOURCES.map((s) => (
                  <div key={s.key} style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected(s.key, workspace) ? "#22c55e" : "var(--border)" }} />
                ))}
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: connectedCount > 0 ? "#4ade80" : "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                {connectedCount}/{ACTIVE_SOURCES.length} bağlı
              </span>
            </div>
            {connectedCount > 0 && (
              <button
                onClick={syncAll}
                disabled={syncing}
                style={{ padding: "8px 18px", borderRadius: 8, background: syncing ? "rgba(249,115,22,0.5)" : "var(--accent)", border: "none", color: "var(--primary-foreground)", fontSize: "0.8rem", fontWeight: 700, cursor: syncing ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {syncing ? "Senkronize ediliyor…" : "↻ Senkronize Et & Analiz Et"}
              </button>
            )}
          </div>
        </div>

        {/* ── Active Sources Grid + Detail ── */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: 20, alignItems: "start", marginBottom: 48 }}>

          {/* Source Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-dim)", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
              Aktif Kaynaklar
            </div>
            {ACTIVE_SOURCES.map((source) => {
              const connected = isConnected(source.key, workspace);
              const isActive = selected === source.key;
              return (
                <button
                  key={source.key}
                  onClick={() => setSelected(isActive ? null : source.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    background: isActive ? "rgba(249,115,22,0.06)" : "var(--card)",
                    border: `1px solid ${isActive ? "rgba(249,115,22,0.35)" : "var(--border)"}`,
                    borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${source.color}18`, border: `1px solid ${source.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {source.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--foreground)" }}>{source.label}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "var(--muted-surface)", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {source.category}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>{source.description}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {connected ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", fontWeight: 700, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                        LIVE
                      </span>
                    ) : (
                      <span style={{ fontSize: isActive ? "1rem" : "0.65rem", lineHeight: 1, fontWeight: 600, color: isActive ? "var(--accent)" : "var(--muted-dim)" }}>
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
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", position: "sticky", top: 88 }}>
                {/* Panel Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.2rem" }}>{src.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{src.label}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{src.category}</div>
                    </div>
                  </div>
                  {connected && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", fontWeight: 700, color: "#4ade80", padding: "3px 8px", background: "rgba(34,197,94,0.1)", borderRadius: 6, border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                      Bağlı
                    </span>
                  )}
                </div>

                {/* Special: Email OAuth */}
                {selected === "email" && !workspace?.gmail_token ? (
                  <div style={{ padding: 24 }}>
                    <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>
                      Gmail hesabınızı bağlayarak destek e-postalarını sinyal olarak içeri aktarın. Observer yalnızca okur, hiçbir şey göndermez.
                    </p>
                    <a
                      href="/api/auth/gmail"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "#EA4335", border: "none", color: "#fff", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
                    >
                      <span>✉️</span> Gmail&apos;i Bağla
                    </a>
                    {formValues.email && (
                      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: 14 }}>Filtreler</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                          {fields.map((f) => renderField(f, selected, formValues, setFormValues))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : selected === "slack" && !workspace?.slack_token ? (
                  /* Special: Slack OAuth */
                  <div style={{ padding: 24 }}>
                    <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>
                      Slack çalışma alanınızı bağlayarak kanal mesajlarını sinyal olarak içeri aktarın. Observer yalnızca davet ettiğiniz genel kanalları okur.
                    </p>
                    <a
                      href={`/api/auth/slack?state=${workspace?.id ?? ""}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "#4A154B", border: "none", color: "#fff", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
                    >
                      <span>⚡</span> Slack&apos;ı Bağla
                    </a>
                    <p style={{ margin: "16px 0 0", fontSize: "0.72rem", color: "var(--muted-dim)", lineHeight: 1.55 }}>
                      Bağlandıktan sonra Observer botunu kanallara davet edin: <code style={{ background: "var(--muted-surface)", padding: "2px 6px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>/invite @signal</code>
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: 24 }}>
                    {/* Slack re-auth link if already connected */}
                    {selected === "slack" && workspace?.slack_token && (
                      <div style={{ marginBottom: 20, padding: "10px 14px", background: "rgba(74,21,75,0.15)", border: "1px solid rgba(74,21,75,0.3)", borderRadius: 8 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55 }}>
                          Slack çalışma alanı bağlı. Aşağıdan içe aktarma ayarlarını düzenleyin.{" "}
                          <a href={`/api/auth/slack?state=${workspace?.id ?? ""}`} style={{ color: "var(--accent)", textDecoration: "none" }}>Yeniden bağlan →</a>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      {fields.map((f) => renderField(f, selected, formValues, setFormValues))}
                    </div>
                    <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                      <button
                        onClick={() => saveSource(selected)}
                        disabled={saving}
                        style={{ flex: 1, padding: "10px 16px", borderRadius: 8, background: savedKey === selected ? "#22c55e" : saving ? "rgba(249,115,22,0.5)" : "var(--accent)", border: "none", color: "var(--primary-foreground)", fontWeight: 700, fontSize: "0.82rem", cursor: saving ? "default" : "pointer", transition: "background 0.2s" }}
                      >
                        {savedKey === selected ? "✓ Kaydedildi" : saving ? "Kaydediliyor…" : connected ? "Güncelle" : "Bağlan"}
                      </button>
                      {connected && (
                        <button
                          onClick={() => disconnectSource(selected)}
                          style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                        >
                          Bağlantıyı Kes
                        </button>
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
          <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted-dim)", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
            Yakında
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {COMING_SOON.map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, opacity: 0.5 }}
              >
                <span style={{ fontSize: "0.95rem" }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted-dim)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{s.category}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: "0.55rem", fontWeight: 700, color: "var(--accent)", padding: "1px 5px", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>SOON</div>
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
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 7,
    background: "var(--muted-surface)", border: "1px solid var(--border)",
    color: "var(--foreground)", fontSize: "0.82rem", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div key={f.key}>
      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
        {f.label}
      </label>
      {f.type === "checkbox" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.checked } }))}
            style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{f.hint}</span>
        </label>
      ) : f.type === "textarea" ? (
        <textarea
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.value } }))}
          placeholder={f.placeholder}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      ) : f.type === "select" && f.options ? (
        <select
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: e.target.value } }))}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {f.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={f.type ?? "text"}
          value={String(val)}
          onChange={(e) => setFormValues((p) => ({ ...p, [sourceKey]: { ...p[sourceKey], [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } }))}
          placeholder={f.placeholder}
          style={inputStyle}
        />
      )}
      {f.hint && f.type !== "checkbox" && (
        <div style={{ marginTop: 5, fontSize: "0.67rem", color: "var(--muted-dim)", lineHeight: 1.55 }}>{f.hint}</div>
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
