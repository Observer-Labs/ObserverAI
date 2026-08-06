"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { parseCsvHeaders } from "@/lib/csv-ingest";
import type { IntegrationsConfig } from "@/lib/types";
import type { CsvColumnMapping } from "@/lib/csv-ingest";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface BranchRow {
  id: string;
  name: string;
  status: "active" | "paused";
}

interface SourceRow {
  id: string;
  branch_id: string;
  type: string;
  display_name: string;
  status: "connected" | "pending" | "error";
  config?: Record<string, unknown>;
  credentials?: {
    provider?: string;
    status?: "pending" | "ready" | "error" | "revoked";
    provided_fields?: string[];
  } | null;
  last_sync_at: string | null;
}

interface CsvImportResult {
  ingested: number;
  skipped: number;
  duplicateRows: number;
  existingDuplicates: number;
}

interface PosImportResult {
  ingested: number;
  skipped: number;
  duplicateRows: number;
  nonMetricRows: number;
  existingDuplicates: number;
}

interface SourceSyncResult {
  source_id: string;
  status: "synced" | "skipped" | "failed";
  fetched?: number;
  ingested?: number;
  existing_duplicates?: number;
  reason?: string;
  error?: string;
}

interface DeliverySyncResult {
  source_id: string;
  platform: "getir" | "trendyol" | "yemeksepeti";
  status: "synced" | "skipped" | "failed";
  metric_date?: string;
  order_count?: number;
  bad_review_count?: number;
  candidates?: number;
  reason?: "unsupported_provider" | "missing_auth_ref";
  error?: string;
  partner_sync?: {
    status: "synced" | "skipped";
    fetchedOrders?: number;
    fetchedReviews?: number;
    persistedOrders?: number;
    persistedReviews?: number;
    reason?: "missing_auth_ref";
  };
}

interface AnalyticsSyncResult {
  source_id: string;
  status: "synced" | "skipped" | "failed";
  anomalies?: number;
  ingested?: number;
  reason?: "missing_property_id" | "missing_auth_ref";
  error?: string;
}

interface EmailSyncResult {
  source_id: string;
  status: "synced" | "skipped" | "failed";
  fetched?: number;
  ingested?: number;
  existing_duplicates?: number;
  reason?: "missing_auth_ref";
  error?: string;
}

interface IngestSummaryItem {
  status?: string;
  error?: string;
  reason?: string;
}

interface IngestResponse {
  error?: string;
  summary?: IngestSummaryItem[];
}

type CsvMappingField = keyof CsvColumnMapping;
type SelfServiceAuthKey = Extract<ActiveSourceKey, "getir" | "trendyol" | "yemeksepeti">;
type SourceCredentialKey = SelfServiceAuthKey | Extract<ActiveSourceKey, "googleanalytics">;

interface SourceConnectionTestResult {
  status: "ready";
  provider: string;
  checkedAt: string;
  checks: Array<{ id: string; status: "ok"; item_count?: number }>;
  store_candidates: Array<{ external_id: string; name?: string; status?: string }>;
}

const CSV_MAPPING_FIELDS: { key: CsvMappingField; label: string; helper: string }[] = [
  { key: "content", label: "Content", helper: "Review, complaint, email, or note text" },
  { key: "timestamp", label: "Timestamp", helper: "Date/time for the row" },
  { key: "channel", label: "Channel", helper: "Google, POS, delivery, survey" },
  { key: "sender", label: "Sender", helper: "Customer, reviewer, or terminal name" },
  { key: "sentiment", label: "Sentiment", helper: "positive, neutral, negative" },
  { key: "metric_name", label: "Metric name", helper: "order_count, sales, prep_time_avg" },
  { key: "metric_value", label: "Metric value", helper: "Numeric metric value" },
];

const CSV_AUTO_VALUE = "__auto__";
const SAMPLE_SIGNAL_CSV = [
  "timestamp,channel,sender,content",
  "2026-06-18T08:00:00Z,review,Aylin,Queue was too slow during breakfast rush",
  "2026-06-18T08:20:00Z,review,Mert,Order arrived cold and delivery took too long",
  "2026-06-18T09:00:00Z,pos,POS Terminal,,order_count,42",
  "2026-06-18T09:00:00Z,pos,POS Terminal,,cancel_count,7",
].join("\n");

function normalizeCsvHeaderForGuess(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function guessCsvMapping(headers: string[]): CsvColumnMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeCsvHeaderForGuess(header),
  }));

  const pick = (candidates: string[]) => normalizedHeaders.find((header) => candidates.includes(header.normalized))?.original;

  return {
    content: pick(["content", "message", "text", "comment", "review", "description", "body"]),
    timestamp: pick(["timestamp", "created_at", "date", "time", "when", "created_local"]),
    channel: pick(["channel", "platform", "source"]),
    sender: pick(["sender", "customer", "name", "author", "guest"]),
    sentiment: pick(["sentiment", "tone", "score_label"]),
    metric_name: pick(["metric_name", "metric", "kpi"]),
    metric_value: pick(["metric_value", "value", "amount", "count", "reading"]),
  };
}

function compactCsvMapping(mapping: CsvColumnMapping) {
  return Object.fromEntries(Object.entries(mapping).filter(([, value]) => value)) as CsvColumnMapping;
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
  // Yemeksepeti: partner API connector'ı henüz yok (ingest "unsupported_provider"
  // ile atlıyor). Connector yazılana kadar katalogda COMING_SOON'da durur;
  // tip/config altyapısı korunuyor ki geri açmak tek satır olsun.
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
];

const COMING_SOON = [
  { label: "Yemeksepeti", icon: "🍽️", category: "Teslimat" },
  { label: "Instagram",  icon: "📸", category: "Sosyal medya" },
  { label: "Shopify",    icon: "🛒", category: "E-ticaret" },
  { label: "App Store",  icon: "📱", category: "Uygulama yorumları" },
  { label: "Trustpilot", icon: "✅", category: "Yorumlar" },
];

// ── Default configs ───────────────────────────────────────────────────────────

const DEFAULT_CONFIGS: Record<ActiveSourceKey, Record<string, unknown>> = {
  googlereviews:   { enabled: false, sync_window_days: 7, last_sync: null },
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
  googleanalytics: { enabled: false, property_id: "", event_filter: "", last_sync: null },
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
    { key: "sync_window_days", label: "Geriye dönük süre (gün)", placeholder: "7", type: "number", hint: "İlk senkronizasyonda 1-150 gün arası yorum geçmişi taranır." },
  ],
  getir: [
    { key: "sync_window_days", label: "Geriye dönük süre (gün)", placeholder: "14", type: "number", hint: "İlk senkronizasyonda kaç günlük sipariş ve yorum geçmişi taransın." },
  ],
  yemeksepeti: [
    { key: "vendor_id", label: "Yemeksepeti vendor kimliği", placeholder: "örn. vendor-123", hint: "Partner/integration erişimi onaylandığında kullanılacak satıcı kimliği." },
    { key: "store_id", label: "Restoran / store kimliği", placeholder: "örn. store-456", hint: "Şube eşlemesi için kullanılacak güvenli mağaza kimliği." },
    { key: "sync_window_days", label: "Geriye dönük süre (gün)", placeholder: "14", type: "number", hint: "İlk senkronizasyonda kaç günlük operasyon verisi taransın." },
  ],
  trendyol: [
    { key: "supplier_id", label: "Trendyol supplier ID", placeholder: "örn. supplier-123", hint: "Satıcı panelindeki entegrasyon bilgilerinde görünür. API key/secret burada tutulmaz." },
    { key: "delivery_type", label: "Teslimat tipi", placeholder: "GO", hint: "Trendyol Go operasyon türünü ayırmak için güvenli metadata." },
    { key: "sync_window_days", label: "Geriye dönük süre (gün)", placeholder: "14", type: "number", hint: "İlk senkronizasyonda kaç günlük sipariş ve yorum geçmişi taransın." },
  ],
  pos: [
    { key: "system_name", label: "POS sistemi", placeholder: "örn. Simpra, Micros, Logo", hint: "Şube satışlarını hangi sistemden alacağımızı belirtir." },
    { key: "sync_mode", label: "Bağlantı tipi", placeholder: "csv", hint: "MVP için csv veya partner_api gibi güvenli metadata." },
    { key: "sync_window_days", label: "Geriye dönük süre (gün)", placeholder: "30", type: "number", hint: "İlk import/senkronizasyon penceresi." },
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
    { key: "event_filter",          label: "Etkinlik Filtresi (isteğe bağlı)", placeholder: "page_view, purchase, sign_up", hint: "Virgülle ayrılmış etkinlik adları. Tüm etkinlikleri izlemek için boş bırakın." },
    { key: "sync_window_days",      label: "Geriye dönük süre (gün)",         placeholder: "30", type: "number", hint: "İlk senkronizasyonda kaç günlük GA4 metriği taransın." },
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

const SOURCE_AUTH_FIELDS: Record<SourceCredentialKey, FormField[]> = {
  getir: [
    { key: "appSecretKey", label: "App secret key", placeholder: "Getir Food API app secret", type: "password", hint: "Getir Food API / entegrasyon bilgileriniz içinde paylaşılır. Observer bu değeri yalnız Vault'a yazar." },
    { key: "restaurantSecretKey", label: "Restaurant secret key", placeholder: "Getir restoran secret", type: "password", hint: "Restoranınıza ait API secret. DB config içinde saklanmaz." },
  ],
  trendyol: [
    { key: "apiKey", label: "API key", placeholder: "Trendyol API key", type: "password", hint: "Trendyol Go Satıcı Paneli → Hesap Bilgilerim → Entegrasyon Bilgileri." },
    { key: "apiSecretKey", label: "API secret key", placeholder: "Trendyol API secret key", type: "password", hint: "Supplier seviyesindeki secret; şube ayrımı store ID ile yapılır." },
  ],
  yemeksepeti: [
    { key: "integrationUser", label: "Integration user", placeholder: "Yemeksepeti integration user", type: "password", hint: "Partner erişimi onaylandığında Yemeksepeti tarafından sağlanan kullanıcı." },
    { key: "integrationPassword", label: "Integration password", placeholder: "Yemeksepeti integration password", type: "password", hint: "Partner erişimi onaylandığında Yemeksepeti tarafından sağlanan parola." },
  ],
  googleanalytics: [
    { key: "serviceAccountJson", label: "Service account JSON", placeholder: "{\"type\":\"service_account\",...}", type: "textarea", hint: "Google Cloud service account JSON. Observer stores it only in Vault and keeps source config non-sensitive." },
  ],
};

// ── Connection status helper ──────────────────────────────────────────────────

function isConnected(key: ActiveSourceKey, workspace: Workspace | null): boolean {
  if (!workspace) return false;
  if (key === "slack") return !!workspace.slack_token;
  const config = workspace.integrations_config?.[key as keyof IntegrationsConfig] as Record<string, unknown> | undefined;
  return !!(config?.enabled);
}

// Map source key to ingest route (some keys match, some don't)
function ingestRoute(key: ActiveSourceKey): string {
  return `/api/ingest/${key}`;
}

const BRANCH_SOURCE_TYPES = new Set<ActiveSourceKey>([
  "googlereviews",
  "getir",
  "yemeksepeti",
  "trendyol",
  "pos",
  "googleanalytics",
  "email",
]);

const SOURCE_CONFIG_ALLOWLIST: Partial<Record<ActiveSourceKey, string[]>> = {
  googlereviews: ["location_id", "location_name", "store_code", "sync_window_days"],
  getir: ["restaurant_id", "restaurant_ids", "sync_window_days"],
  yemeksepeti: ["vendor_id", "store_id", "sync_window_days"],
  trendyol: ["supplier_id", "store_id", "delivery_type", "sync_window_days"],
  pos: ["system_name", "sync_mode", "sync_window_days"],
  googleanalytics: ["property_id", "event_filter", "sync_window_days"],
  email: ["sender_domains", "max_age_days"],
};

function isBranchSourceKey(key: ActiveSourceKey) {
  return BRANCH_SOURCE_TYPES.has(key);
}

function isSelfServiceAuthKey(key: ActiveSourceKey): key is SelfServiceAuthKey {
  return key === "getir" || key === "trendyol" || key === "yemeksepeti";
}

function isSourceCredentialKey(key: ActiveSourceKey): key is SourceCredentialKey {
  return isSelfServiceAuthKey(key) || key === "googleanalytics";
}

function sourceAuthProviderForKey(key: SourceCredentialKey) {
  return key === "googleanalytics" ? "ga4" : key;
}

function isDeliveryConnectionTestKey(key: ActiveSourceKey): key is Extract<SelfServiceAuthKey, "getir" | "trendyol"> {
  return key === "getir" || key === "trendyol";
}

function isLocationListKey(key: ActiveSourceKey): key is Extract<ActiveSourceKey, "googlereviews"> {
  return key === "googlereviews";
}

function sourceRecordType(key: ActiveSourceKey) {
  return key;
}

function branchSourceForKey(sources: SourceRow[], branchId: string, key: ActiveSourceKey) {
  return sources.find((source) => source.branch_id === branchId && source.type === sourceRecordType(key));
}

function formatLastSync(value: string | null | undefined) {
  if (!value) return "Never synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sync time unknown";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isSourceAuthReady(source: SourceRow | undefined) {
  return source?.credentials?.status === "ready";
}

function isSourceAvailable(
  key: ActiveSourceKey,
  workspace: Workspace | null,
  sources: SourceRow[],
  branchId: string,
) {
  if (isBranchSourceKey(key)) return Boolean(branchSourceForKey(sources, branchId, key));
  return isConnected(key, workspace);
}

function getAvailableCount(
  workspace: Workspace | null,
  sources: SourceRow[],
  branchId: string,
) {
  return ACTIVE_SOURCES.filter((source) => isSourceAvailable(source.key, workspace, sources, branchId)).length;
}

function compactSourceConfig(key: ActiveSourceKey, values: Record<string, unknown>) {
  const allowed = SOURCE_CONFIG_ALLOWLIST[key] ?? [];
  const output: Record<string, unknown> = {};

  for (const field of allowed) {
    const value = values[field];
    if (typeof value === "string" && value.trim()) output[field] = value.trim();
    if (typeof value === "number" && Number.isFinite(value)) output[field] = value;
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) output[field] = value;
  }

  return output;
}

function hasCredentialInput(values: Record<string, string>) {
  return Object.values(values).some((value) => value.trim().length > 0);
}

function sourceMappingField(key: ActiveSourceKey): "restaurant_id" | "store_id" | "location_id" | null {
  if (key === "getir") return "restaurant_id";
  if (key === "trendyol") return "store_id";
  if (key === "googlereviews") return "location_id";
  return null;
}

function sourceLabel(key: ActiveSourceKey) {
  return ACTIVE_SOURCES.find((source) => source.key === key)?.label ?? key;
}

function syncFailureMessage(key: ActiveSourceKey, response: IngestResponse) {
  if (response.error) return response.error;

  const failed = response.summary?.find((item) => item.status === "failed");
  if (failed) return failed.error ?? `${sourceLabel(key)} sync failed.`;

  return null;
}

function syncableSourcesForBranch(sources: SourceRow[], branchId: string) {
  return ACTIVE_SOURCES.flatMap((source) => {
    if (!isBranchSourceKey(source.key)) return [];

    const sourceRecord = branchSourceForKey(sources, branchId, source.key);
    if (!sourceRecord) return [];
    if (source.key === "pos") return [];

    return [{ ...source, sourceId: sourceRecord.id }];
  });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ConnectPageContent() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
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
  const [authValues, setAuthValues] = useState<Record<SourceCredentialKey, Record<string, string>>>({
    getir: { appSecretKey: "", restaurantSecretKey: "" },
    trendyol: { apiKey: "", apiSecretKey: "" },
    yemeksepeti: { integrationUser: "", integrationPassword: "" },
    googleanalytics: { serviceAccountJson: "" },
  });
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<ActiveSourceKey | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncAllError, setSyncAllError] = useState<string | null>(null);
  const [csvName, setCsvName] = useState("Manual CSV upload");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<CsvColumnMapping>({});
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvFileLoading, setCsvFileLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [posCsvText, setPosCsvText] = useState("");
  const [posCsvHeaders, setPosCsvHeaders] = useState<string[]>([]);
  const [posCsvMapping, setPosCsvMapping] = useState<CsvColumnMapping>({});
  const [posFileName, setPosFileName] = useState("");
  const [posImporting, setPosImporting] = useState(false);
  const [posFileLoading, setPosFileLoading] = useState(false);
  const [posResult, setPosResult] = useState<PosImportResult | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [sourceSaveError, setSourceSaveError] = useState<string | null>(null);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [mappingCandidateId, setMappingCandidateId] = useState<string | null>(null);
  const [sourceTestResult, setSourceTestResult] = useState<SourceConnectionTestResult | null>(null);
  const [sourceTestError, setSourceTestError] = useState<string | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [sourceSyncResult, setSourceSyncResult] = useState<SourceSyncResult | null>(null);
  const [sourceSyncError, setSourceSyncError] = useState<string | null>(null);
  const [deliverySyncResult, setDeliverySyncResult] = useState<DeliverySyncResult | null>(null);
  const [deliverySyncError, setDeliverySyncError] = useState<string | null>(null);
  const [analyticsSyncResult, setAnalyticsSyncResult] = useState<AnalyticsSyncResult | null>(null);
  const [analyticsSyncError, setAnalyticsSyncError] = useState<string | null>(null);
  const [emailSyncResult, setEmailSyncResult] = useState<EmailSyncResult | null>(null);
  const [emailSyncError, setEmailSyncError] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deleteSourceError, setDeleteSourceError] = useState<string | null>(null);

  useEffect(() => {
    const headers = parseCsvHeaders(csvText);
    setCsvHeaders(headers);
    if (headers.length === 0) {
      setCsvMapping({});
    }
  }, [csvText]);

  useEffect(() => {
    const headers = parseCsvHeaders(posCsvText);
    setPosCsvHeaders(headers);
    if (headers.length === 0) {
      setPosCsvMapping({});
    }
  }, [posCsvText]);

  useEffect(() => {
    if (!selectedBranchId || sources.length === 0) return;

    setFormValues((current) => {
      const next = { ...current };
      for (const source of sources) {
        if (source.branch_id !== selectedBranchId) continue;
        if (!isBranchSourceKey(source.type as ActiveSourceKey)) continue;
        const key = source.type as ActiveSourceKey;
        next[key] = {
          ...DEFAULT_CONFIGS[key],
          ...(source.config ?? {}),
        };
      }
      return next;
    });
  }, [selectedBranchId, sources]);

  const loadWorkspace = useCallback(async () => {
    try {
      const [res, branchesRes, sourcesRes] = await Promise.all([
        fetch("/api/workspace"),
        fetch("/api/branches"),
        fetch("/api/sources"),
      ]);
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) return;
      const { workspace: data } = await res.json() as { workspace: Workspace };
      if (!data) return;
      setWorkspace(data);

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json() as { branches?: BranchRow[] };
        const activeBranches = (branchesData.branches ?? []).filter((branch) => branch.status === "active");
        setBranches(activeBranches);
        setSelectedBranchId((current) => current || activeBranches[0]?.id || "");
      }

      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json() as { sources?: SourceRow[] };
        setSources(sourcesData.sources ?? []);
      }

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
    setSourceSaveError(null);
    setSourceTestError(null);
    setSourceTestResult(null);
    try {
      if (isBranchSourceKey(key)) {
        if (!selectedBranchId) {
          setSourceSaveError("Select a branch before creating a source.");
          return;
        }

        const sourceDefinition = ACTIVE_SOURCES.find((source) => source.key === key);
        const res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: selectedBranchId,
            type: sourceRecordType(key),
            display_name: sourceDefinition?.label ?? key,
            config: compactSourceConfig(key, formValues[key]),
          }),
        });
        const data = await res.json().catch(() => ({})) as { source?: SourceRow; error?: string };
        if (!res.ok) {
          setSourceSaveError(data.error ?? "Source could not be saved.");
          return;
        }

        if (isSourceCredentialKey(key) && hasCredentialInput(authValues[key])) {
          const sourceId = data.source?.id;
          if (!sourceId) {
            setSourceSaveError("Source was saved but credential setup could not start.");
            return;
          }

          const authRes = await fetch(`/api/sources/${sourceId}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: sourceAuthProviderForKey(key),
              credentials: authValues[key],
            }),
          });
          const authData = await authRes.json().catch(() => ({})) as { error?: string };
          if (!authRes.ok) {
            setSourceSaveError(authData.error ?? "Credentials could not be saved securely.");
            return;
          }

          setAuthValues((current) => ({
            ...current,
            [key]: Object.fromEntries(Object.keys(current[key]).map((field) => [field, ""])),
          }) as Record<SourceCredentialKey, Record<string, string>>);
        }

        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2500);
        await loadWorkspace();
        return;
      }

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

  async function deleteSource(source: SourceRow | undefined) {
    if (!source) return;
    const confirmed = window.confirm(
      `${source.display_name} kaynağı silinsin mi? Bu kaynaktan çekilmiş eski yorumlar ve genel analiz de silinir.`,
    );
    if (!confirmed) return;

    setDeletingSourceId(source.id);
    setDeleteSourceError(null);
    try {
      const res = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setDeleteSourceError(data.error ?? "Source could not be deleted.");
        return;
      }

      setSelected(null);
      setSourceSyncResult(null);
      setDeliverySyncResult(null);
      setAnalyticsSyncResult(null);
      setEmailSyncResult(null);
      await loadWorkspace();
    } finally {
      setDeletingSourceId(null);
    }
  }

  async function testSourceConnection(source: SourceRow | undefined) {
    if (!source) return;

    setTestingSourceId(source.id);
    setSourceTestError(null);
    setSourceTestResult(null);

    try {
      const route = source.type === "googlereviews"
        ? `/api/sources/${source.id}/google-locations`
        : `/api/sources/${source.id}/test`;
      const res = await fetch(route, { method: "POST" });
      const data = await res.json().catch(() => ({})) as { result?: SourceConnectionTestResult; error?: string };
      if (!res.ok || !data.result) {
        setSourceTestError(data.error ?? "Connection test failed.");
        return;
      }

      setSourceTestResult(data.result);
      await loadWorkspace();
    } finally {
      setTestingSourceId(null);
    }
  }

  async function syncGoogleReviewsSource(source: SourceRow | undefined) {
    if (!source) return;

    setSyncingSourceId(source.id);
    setSourceSyncResult(null);
    setSourceSyncError(null);

    try {
      const res = await fetch("/api/ingest/googlereviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        summary?: SourceSyncResult[];
      };
      if (!res.ok) {
        setSourceSyncError(data.error ?? "Sync failed.");
        return;
      }

      const result = data.summary?.find((item) => item.source_id === source.id) ?? null;
      if (!result) {
        setSourceSyncError("Sync finished without a source result.");
        return;
      }
      if (result.status === "failed") {
        setSourceSyncError(result.error ?? "Sync failed.");
      } else {
        setSourceSyncResult(result);
      }
      await loadWorkspace();
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function syncDeliverySourceNow(source: SourceRow | undefined) {
    if (!source) return;

    setSyncingSourceId(source.id);
    setDeliverySyncResult(null);
    setDeliverySyncError(null);

    try {
      const res = await fetch("/api/ingest/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        summary?: DeliverySyncResult[];
      };
      if (!res.ok) {
        setDeliverySyncError(data.error ?? "Delivery sync failed.");
        return;
      }

      const result = data.summary?.find((item) => item.source_id === source.id) ?? null;
      if (!result) {
        setDeliverySyncError("Sync finished without a source result.");
        return;
      }
      if (result.status === "failed") {
        setDeliverySyncError(result.error ?? "Delivery sync failed.");
      } else {
        setDeliverySyncResult(result);
      }
      await loadWorkspace();
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function syncAnalyticsSourceNow(source: SourceRow | undefined) {
    if (!source) return;

    setSyncingSourceId(source.id);
    setAnalyticsSyncResult(null);
    setAnalyticsSyncError(null);

    try {
      const res = await fetch("/api/ingest/googleanalytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        summary?: AnalyticsSyncResult[];
      };
      if (!res.ok) {
        setAnalyticsSyncError(data.error ?? "Google Analytics sync failed.");
        return;
      }

      const result = data.summary?.find((item) => item.source_id === source.id) ?? null;
      if (!result) {
        setAnalyticsSyncError("Sync finished without a source result.");
        return;
      }
      if (result.status === "failed") {
        setAnalyticsSyncError(result.error ?? "Google Analytics sync failed.");
      } else {
        setAnalyticsSyncResult(result);
      }
      await loadWorkspace();
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function syncEmailSourceNow(source: SourceRow | undefined) {
    if (!source) return;

    setSyncingSourceId(source.id);
    setEmailSyncResult(null);
    setEmailSyncError(null);

    try {
      const res = await fetch("/api/ingest/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        summary?: EmailSyncResult[];
      };
      if (!res.ok) {
        setEmailSyncError(data.error ?? "Gmail sync failed.");
        return;
      }

      const result = data.summary?.find((item) => item.source_id === source.id) ?? null;
      if (!result) {
        setEmailSyncError("Sync finished without a source result.");
        return;
      }
      if (result.status === "failed") {
        setEmailSyncError(result.error ?? "Gmail sync failed.");
      } else {
        setEmailSyncResult(result);
      }
      await loadWorkspace();
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function applyStoreCandidate(
    key: Extract<ActiveSourceKey, "getir" | "trendyol" | "googlereviews">,
    candidate: SourceConnectionTestResult["store_candidates"][number],
  ) {
    const mappingField = sourceMappingField(key);
    if (!mappingField || !selectedBranchId || !candidate.external_id) return;

    setMappingCandidateId(candidate.external_id);
    setSourceSaveError(null);

    const nextValues = {
      ...formValues[key],
      [mappingField]: candidate.external_id,
    };

    try {
      const sourceDefinition = ACTIVE_SOURCES.find((source) => source.key === key);
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          type: sourceRecordType(key),
          display_name: sourceDefinition?.label ?? key,
          config: compactSourceConfig(key, nextValues),
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setSourceSaveError(data.error ?? "Store mapping could not be saved.");
        return;
      }

      setFormValues((current) => ({
        ...current,
        [key]: nextValues,
      }));
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      await loadWorkspace();
    } finally {
      setMappingCandidateId(null);
    }
  }

  async function syncAll() {
    setSyncing(true);
    setSyncAllError(null);
    try {
      const connected = syncableSourcesForBranch(sources, selectedBranchId);
      const results = await Promise.all(
        connected.map(async (source) => {
          try {
            const res = await fetch(ingestRoute(source.key), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ source_id: source.sourceId }),
            });
            const data = await res.json().catch(() => ({})) as IngestResponse;
            if (!res.ok) {
              return {
                key: source.key,
                error: data.error ?? `${source.label} sync failed.`,
              };
            }

            return {
              key: source.key,
              error: syncFailureMessage(source.key, data),
            };
          } catch {
            return {
              key: source.key,
              error: `${source.label} sync failed.`,
            };
          }
        }),
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) {
        setSyncAllError(`${sourceLabel(failed.key)}: ${failed.error}`);
        await loadWorkspace();
        return;
      }

      router.push("/dashboard");
    } finally {
      setSyncing(false);
    }
  }

  async function importCsv() {
    setCsvImporting(true);
    setCsvError(null);
    setCsvResult(null);

    try {
      const res = await fetch("/api/ingest/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          display_name: csvName,
          csv_text: csvText,
          mapping: compactCsvMapping(csvMapping),
        }),
      });
      const data = await res.json().catch(() => ({})) as Partial<CsvImportResult> & { error?: string };
      if (!res.ok) {
        setCsvError(data.error ?? "CSV import failed");
        return;
      }

      setCsvResult({
        ingested: data.ingested ?? 0,
        skipped: data.skipped ?? 0,
        duplicateRows: data.duplicateRows ?? 0,
        existingDuplicates: data.existingDuplicates ?? 0,
      });
      setCsvText("");
      setCsvFileName("");
      setCsvMapping({});
      await loadWorkspace();
    } finally {
      setCsvImporting(false);
    }
  }

  async function importPosCsv(source: SourceRow | undefined) {
    if (!source) return;

    setPosImporting(true);
    setPosError(null);
    setPosResult(null);

    try {
      const res = await fetch("/api/ingest/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: source.id,
          csv_text: posCsvText,
          mapping: compactCsvMapping(posCsvMapping),
        }),
      });
      const data = await res.json().catch(() => ({})) as Partial<PosImportResult> & { error?: string };
      if (!res.ok) {
        setPosError(data.error ?? "POS import failed");
        return;
      }

      setPosResult({
        ingested: data.ingested ?? 0,
        skipped: data.skipped ?? 0,
        duplicateRows: data.duplicateRows ?? 0,
        nonMetricRows: data.nonMetricRows ?? 0,
        existingDuplicates: data.existingDuplicates ?? 0,
      });
      setPosCsvText("");
      setPosFileName("");
      setPosCsvMapping({});
      await loadWorkspace();
    } finally {
      setPosImporting(false);
    }
  }

  async function handleCsvFileChange(file: File | undefined) {
    if (!file) return;

    setCsvFileLoading(true);
    setCsvError(null);
    setCsvResult(null);

    try {
      const text = await file.text();
      const headers = parseCsvHeaders(text);
      setCsvFileName(file.name);
      setCsvText(text);
      setCsvMapping(guessCsvMapping(headers));
      if (csvName === "Manual CSV upload") {
        setCsvName(file.name.replace(/\.[^.]+$/, "") || "CSV upload");
      }
    } catch {
      setCsvError("Could not read the selected CSV file.");
    } finally {
      setCsvFileLoading(false);
    }
  }

  async function handlePosFileChange(file: File | undefined) {
    if (!file) return;

    setPosFileLoading(true);
    setPosError(null);
    setPosResult(null);

    try {
      const text = await file.text();
      const headers = parseCsvHeaders(text);
      setPosFileName(file.name);
      setPosCsvText(text);
      setPosCsvMapping(guessCsvMapping(headers));
    } catch {
      setPosError("Could not read the selected POS CSV file.");
    } finally {
      setPosFileLoading(false);
    }
  }

  function updateCsvText(value: string) {
    setCsvText(value);
    setCsvResult(null);
    setCsvError(null);
  }

  function loadSampleCsv() {
    setCsvName("Sample signal test");
    setCsvText(SAMPLE_SIGNAL_CSV);
    setCsvMapping(guessCsvMapping(parseCsvHeaders(SAMPLE_SIGNAL_CSV)));
    setCsvFileName("");
    setCsvResult(null);
    setCsvError(null);
  }

  function updatePosCsvText(value: string) {
    setPosCsvText(value);
    setPosResult(null);
    setPosError(null);
  }

  function updateCsvMapping(field: CsvMappingField, value: string) {
    setCsvMapping((current) => {
      const next = { ...current };
      if (value === CSV_AUTO_VALUE) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }

  function updatePosCsvMapping(field: CsvMappingField, value: string) {
    setPosCsvMapping((current) => {
      const next = { ...current };
      if (value === CSV_AUTO_VALUE) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }

  const connectedCount = getAvailableCount(workspace, sources, selectedBranchId);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const csvSources = sources.filter((source) => source.type === "csv" && source.branch_id === selectedBranchId);

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
                  <div key={s.key} className={cn("size-1.5 rounded-full", isSourceAvailable(s.key, workspace, sources, selectedBranchId) ? "bg-[#22c55e]" : "bg-border")} />
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
        {syncAllError && (
          <div className="mb-5 rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[0.78rem] text-destructive">
            {syncAllError}
          </div>
        )}

        <Card className="mb-8 gap-0 rounded-xl py-0">
          <CardHeader className="border-b px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[1rem] font-extrabold tracking-[-0.02em]">
                  Universal CSV
                </CardTitle>
                <CardDescription className="mt-1 text-[0.82rem] leading-[1.55]">
                  POS export, delivery comments, manual issue lists, or survey rows. Choose a branch, paste CSV, and import real signals.
                </CardDescription>
              </div>
              <div className="rounded-lg border bg-muted px-3 py-2 font-mono text-[0.7rem] font-semibold text-muted-foreground">
                {csvSources.length} CSV source{csvSources.length === 1 ? "" : "s"} for branch
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5 lg:grid-cols-[260px_1fr]">
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  Branch
                </Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={branches.length === 0}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="csv-name" className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  Source name
                </Label>
                <Input
                  id="csv-name"
                  value={csvName}
                  onChange={(event) => setCsvName(event.target.value)}
                  className="h-auto rounded-[7px] bg-background px-3 py-[9px] text-[0.82rem] shadow-none md:text-[0.82rem]"
                />
              </div>
              <div>
                <Label htmlFor="csv-file" className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  CSV file
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => void handleCsvFileChange(event.currentTarget.files?.[0])}
                  className="h-auto rounded-[7px] bg-background px-3 py-[9px] text-[0.82rem] shadow-none file:mr-3 file:rounded-md file:bg-muted file:px-2.5 file:py-1.5 file:text-[0.75rem] file:font-bold md:text-[0.82rem]"
                />
                {(csvFileName || csvFileLoading) && (
                  <div className="mt-2 text-[0.72rem] text-muted-foreground">
                    {csvFileLoading ? "Reading file..." : `Loaded ${csvFileName}`}
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-muted px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                Auto-detected headers still work: <span className="font-mono text-foreground">timestamp, channel, sender, content</span>. Use mapping for exports with different column names.
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="csv-text" className="font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                CSV rows for {selectedBranch?.name ?? "selected branch"}
              </Label>
              {csvHeaders.length > 0 && (
                <div className="rounded-lg border bg-muted/55 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                        Column mapping
                      </div>
                      <div className="mt-1 text-[0.72rem] text-muted-foreground">
                        {csvHeaders.length} header{csvHeaders.length === 1 ? "" : "s"} detected. Leave a field on auto when the header already matches Observer defaults.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCsvMapping(guessCsvMapping(csvHeaders))}
                      className="h-auto rounded-lg px-3 py-2 text-[0.75rem] font-bold"
                    >
                      Detect columns
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {CSV_MAPPING_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-[0.72rem] font-semibold text-foreground">
                          {field.label}
                        </Label>
                        <Select
                          value={csvMapping[field.key] ?? CSV_AUTO_VALUE}
                          onValueChange={(value) => updateCsvMapping(field.key, value)}
                        >
                          <SelectTrigger className="h-9 w-full bg-background text-[0.78rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={CSV_AUTO_VALUE}>Auto / not mapped</SelectItem>
                            {csvHeaders.map((header) => (
                              <SelectItem key={`${field.key}-${header}`} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-[0.68rem] leading-[1.4] text-muted-foreground">
                          {field.helper}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                id="csv-text"
                value={csvText}
                onChange={(event) => updateCsvText(event.target.value)}
                rows={8}
                placeholder={"timestamp,channel,sender,content\n2026-06-18T08:00:00Z,review,Aylin,Queue was too slow\n2026-06-18T09:00:00Z,pos,POS Terminal,,order_count,42"}
                className="min-h-[190px] w-full resize-y rounded-lg border bg-background px-3 py-3 font-mono text-[0.78rem] leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[0.75rem] text-muted-foreground">
                  {branches.length === 0 ? "Create a branch first." : "Rows with no content or metric are skipped safely."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadSampleCsv}
                    disabled={csvImporting || branches.length === 0}
                    className="h-auto rounded-lg px-4 py-2.5 text-[0.82rem] font-bold"
                  >
                    Load sample CSV
                  </Button>
                  <Button
                    onClick={importCsv}
                    disabled={csvImporting || !selectedBranchId || !csvText.trim()}
                    className="h-auto rounded-lg px-4 py-2.5 text-[0.82rem] font-bold"
                  >
                    {csvImporting ? "Importing..." : "Import CSV"}
                  </Button>
                </div>
              </div>
              {csvError && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.78rem] text-destructive">
                  {csvError}
                </div>
              )}
              {csvResult && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklch,var(--success)_30%,transparent)] bg-[color-mix(in_oklch,var(--success)_10%,transparent)] px-3 py-2 text-[0.78rem] text-[var(--success)]">
                  <span>
                    Imported {csvResult.ingested} signal{csvResult.ingested === 1 ? "" : "s"}. Skipped {csvResult.skipped}; duplicates in file {csvResult.duplicateRows}; already existing {csvResult.existingDuplicates}.
                  </span>
                  {csvResult.ingested > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      className="h-auto rounded-md border-[color-mix(in_oklch,var(--success)_35%,transparent)] bg-background px-3 py-1.5 text-[0.72rem] font-bold text-foreground"
                    >
                      Open dashboard
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Active Sources Grid + Detail ── */}
        <div className={cn("mb-12 grid items-start gap-5", selected ? "grid-cols-[340px_1fr]" : "grid-cols-1")}>

          {/* Source Cards */}
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 font-mono text-[0.6rem] font-bold tracking-[0.12em] text-[var(--muted-dim)] uppercase">
              Aktif Kaynaklar
            </div>
            {selectedBranch && (
              <div className="text-[0.72rem] text-muted-foreground">
                Selected branch: <span className="font-semibold text-foreground">{selectedBranch.name}</span>
              </div>
            )}
            {ACTIVE_SOURCES.map((source) => {
              const sourceRecord = branchSourceForKey(sources, selectedBranchId, source.key);
              const connected = isSourceAvailable(source.key, workspace, sources, selectedBranchId);
              const authReady = isSourceAuthReady(sourceRecord);
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
                        {authReady ? "READY" : sourceRecord?.status === "pending" ? "PENDING" : "LIVE"}
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
            const selectedSourceRecord = branchSourceForKey(sources, selectedBranchId, selected);
            const connected = isSourceAvailable(selected, workspace, sources, selectedBranchId);
            const authReady = isSourceAuthReady(selectedSourceRecord);
            const fields = SOURCE_FIELDS[selected];
            const hasMappedLocation = typeof selectedSourceRecord?.config?.location_id === "string" &&
              selectedSourceRecord.config.location_id.trim().length > 0;
            const deliveryMappingField = sourceMappingField(selected);
            const hasMappedDeliveryStore = isDeliveryConnectionTestKey(selected) &&
              typeof selectedSourceRecord?.config?.[deliveryMappingField ?? ""] === "string" &&
              String(selectedSourceRecord.config[deliveryMappingField ?? ""]).trim().length > 0;
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
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-md border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2 py-[3px] text-[0.65rem] font-bold text-[#4ade80]">
                        <div className="size-[5px] rounded-full bg-[#22c55e]" />
                        {authReady ? "Kimlik hazır" : selectedSourceRecord?.status === "pending" ? "Onay bekliyor" : "Bağlı"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Kaynağı sil"
                        aria-label="Kaynağı sil"
                        onClick={() => void deleteSource(selectedSourceRecord)}
                        disabled={!selectedSourceRecord || deletingSourceId === selectedSourceRecord.id}
                        className="size-8 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Special: Email OAuth */}
                {selected === "email" && connected && !authReady ? (
                  <div className="p-6">
                    <p className="mt-0 mb-5 text-[0.82rem] leading-[1.65] text-muted-foreground">
                      Gmail hesabınızı bu branch kaynağına bağlayarak destek e-postalarını sinyal olarak içeri aktarın. Observer yalnızca okur, hiçbir şey göndermez.
                    </p>
                    <Button asChild className="h-auto gap-2 rounded-lg bg-[#EA4335] px-[18px] py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#EA4335]/90">
                      <a href={`/api/auth/gmail?source_id=${selectedSourceRecord?.id ?? ""}`}>
                        <span>✉️</span> Gmail&apos;i Bağla
                      </a>
                    </Button>
                    <div className="mt-5 rounded-lg border bg-muted px-3.5 py-2.5 text-[0.72rem] leading-[1.55] text-muted-foreground">
                      Filter settings are saved. Complete OAuth to unlock Gmail sync for this branch.
                    </div>
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
                    {selected === "googlereviews" && !connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-2.5 text-[0.72rem] leading-[1.55] text-muted-foreground">
                        Kaydettikten sonra Google hesabınızla oturum açacak ve işletme konumlarınızdan birini bu şubeye eşleyeceksiniz. İşletme adı veya ID girmeniz gerekmez.
                      </div>
                    )}
                    {isBranchSourceKey(selected) && selected !== "googlereviews" && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-2.5 text-[0.72rem] leading-[1.55] text-muted-foreground">
                        This step stores only branch mapping metadata. API keys, OAuth grants, and service account files are handled in a separate credential step and are not saved here.
                      </div>
                    )}
                    {selected === "pos" && connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[0.78rem] font-semibold text-foreground">POS metric CSV</div>
                            <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                              Import sales, order count, cancel count, prep time, or other numeric metrics for this branch.
                            </div>
                            <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                              Last sync: {formatLastSync(selectedSourceRecord?.last_sync_at)}
                            </div>
                          </div>
                          <Input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={(event) => void handlePosFileChange(event.currentTarget.files?.[0])}
                            className="h-auto max-w-[220px] rounded-[7px] bg-background px-3 py-[8px] text-[0.74rem] shadow-none file:mr-2 file:rounded-md file:bg-muted file:px-2 file:py-1 file:text-[0.7rem] file:font-bold md:text-[0.74rem]"
                          />
                        </div>
                        {(posFileName || posFileLoading) && (
                          <div className="mt-2 text-[0.72rem] text-muted-foreground">
                            {posFileLoading ? "Reading file..." : `Loaded ${posFileName}`}
                          </div>
                        )}
                        {posCsvHeaders.length > 0 && (
                          <div className="mt-3 rounded-md border bg-background p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                                Column mapping
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPosCsvMapping(guessCsvMapping(posCsvHeaders))}
                                className="h-auto rounded-md px-2.5 py-1.5 text-[0.68rem] font-bold"
                              >
                                Detect columns
                              </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {CSV_MAPPING_FIELDS.filter((field) => (
                                field.key === "timestamp" ||
                                field.key === "channel" ||
                                field.key === "sender" ||
                                field.key === "content" ||
                                field.key === "metric_name" ||
                                field.key === "metric_value"
                              )).map((field) => (
                                <div key={`pos-${field.key}`} className="flex flex-col gap-1">
                                  <Label className="text-[0.68rem] font-semibold text-foreground">
                                    {field.label}
                                  </Label>
                                  <Select
                                    value={posCsvMapping[field.key] ?? CSV_AUTO_VALUE}
                                    onValueChange={(value) => updatePosCsvMapping(field.key, value)}
                                  >
                                    <SelectTrigger className="h-8 w-full bg-background text-[0.72rem]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={CSV_AUTO_VALUE}>Auto / not mapped</SelectItem>
                                      {posCsvHeaders.map((header) => (
                                        <SelectItem key={`pos-${field.key}-${header}`} value={header}>
                                          {header}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <textarea
                          value={posCsvText}
                          onChange={(event) => updatePosCsvText(event.target.value)}
                          rows={5}
                          placeholder={"timestamp,channel,sender,metric_name,metric_value\n2026-06-21T10:00:00Z,pos,Terminal 1,daily_sales,12500\n2026-06-21T10:00:00Z,pos,Terminal 1,cancel_count,4"}
                          className="mt-3 min-h-[120px] w-full resize-y rounded-lg border bg-background px-3 py-3 font-mono text-[0.74rem] leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-[0.7rem] leading-[1.45] text-muted-foreground">
                            Rows without <span className="font-mono text-foreground">metric_name</span> and <span className="font-mono text-foreground">metric_value</span> are ignored for POS.
                          </div>
                          <Button
                            type="button"
                            onClick={() => void importPosCsv(selectedSourceRecord)}
                            disabled={posImporting || !posCsvText.trim()}
                            className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                          >
                            {posImporting ? "Importing..." : "Import POS CSV"}
                          </Button>
                        </div>
                        {posError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {posError}
                          </div>
                        )}
                        {posResult && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Imported {posResult.ingested} POS metric signal{posResult.ingested === 1 ? "" : "s"}. Skipped {posResult.skipped}; non-metric rows {posResult.nonMetricRows}; duplicates in file {posResult.duplicateRows}; already existing {posResult.existingDuplicates}.
                          </div>
                        )}
                      </div>
                    )}
                    {isSourceCredentialKey(selected) && (
                      <div className="mt-5 border-t pt-5">
                        <div className="mb-3.5 font-mono text-[0.65rem] font-bold tracking-[0.1em] text-[var(--muted-dim)] uppercase">
                          Secure API credentials
                        </div>
                        <div className="flex flex-col gap-[18px]">
                          {SOURCE_AUTH_FIELDS[selected].map((field) => renderCredentialField(
                            field,
                            selected,
                            authValues,
                            setAuthValues,
                          ))}
                        </div>
                        {authReady && (
                          <div className="mt-4 rounded-lg border bg-muted px-3.5 py-2.5 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Credentials are stored as a Vault reference. Leave these fields blank unless you want to rotate them.
                          </div>
                        )}
                      </div>
                    )}
                    {isSelfServiceAuthKey(selected) && connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[0.78rem] font-semibold text-foreground">Delivery data sync</div>
                            <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                              Pull order and review data into normalized delivery tables for the mapped restaurant.
                            </div>
                            <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                              Last sync: {formatLastSync(selectedSourceRecord?.last_sync_at)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => void syncDeliverySourceNow(selectedSourceRecord)}
                            disabled={!authReady || !hasMappedDeliveryStore || syncingSourceId === selectedSourceRecord?.id}
                            className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                          >
                            {syncingSourceId === selectedSourceRecord?.id ? "Syncing..." : "Sync now"}
                          </Button>
                        </div>
                        {!authReady && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Save secure API credentials before syncing delivery data.
                          </div>
                        )}
                        {authReady && !hasMappedDeliveryStore && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Test the connection and choose a restaurant before syncing delivery data.
                          </div>
                        )}
                        {deliverySyncError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {deliverySyncError}
                          </div>
                        )}
                        {deliverySyncResult && deliverySyncResult.source_id === selectedSourceRecord?.id && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            {deliverySyncResult.status === "synced"
                              ? `Synced ${deliverySyncResult.partner_sync?.persistedOrders ?? 0} order${deliverySyncResult.partner_sync?.persistedOrders === 1 ? "" : "s"} and ${deliverySyncResult.partner_sync?.persistedReviews ?? 0} review${deliverySyncResult.partner_sync?.persistedReviews === 1 ? "" : "s"} for ${deliverySyncResult.metric_date ?? "latest metric date"}. Metrics: ${deliverySyncResult.order_count ?? 0} orders, ${deliverySyncResult.bad_review_count ?? 0} bad reviews, ${deliverySyncResult.candidates ?? 0} candidate${deliverySyncResult.candidates === 1 ? "" : "s"}.`
                              : deliverySyncResult.reason === "missing_auth_ref"
                                ? "Skipped: secure API credentials are not ready."
                                : "Skipped: this delivery provider does not have a live sync adapter yet."}
                          </div>
                        )}
                      </div>
                    )}
                    {selected === "googleanalytics" && connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[0.78rem] font-semibold text-foreground">Analytics data sync</div>
                            <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                              Pull GA4 page traffic and conversion anomalies for this branch.
                            </div>
                            <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                              Last sync: {formatLastSync(selectedSourceRecord?.last_sync_at)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => void syncAnalyticsSourceNow(selectedSourceRecord)}
                            disabled={!authReady || syncingSourceId === selectedSourceRecord?.id}
                            className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                          >
                            {syncingSourceId === selectedSourceRecord?.id ? "Syncing..." : "Sync now"}
                          </Button>
                        </div>
                        {!authReady && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Save the GA4 service account JSON before syncing analytics data.
                          </div>
                        )}
                        {analyticsSyncError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {analyticsSyncError}
                          </div>
                        )}
                        {analyticsSyncResult && analyticsSyncResult.source_id === selectedSourceRecord?.id && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            {analyticsSyncResult.status === "synced"
                              ? `Synced ${analyticsSyncResult.ingested ?? 0} analytics signal${analyticsSyncResult.ingested === 1 ? "" : "s"} from ${analyticsSyncResult.anomalies ?? 0} detected anomal${analyticsSyncResult.anomalies === 1 ? "y" : "ies"}.`
                              : analyticsSyncResult.reason === "missing_property_id"
                                ? "Skipped: GA4 property ID is missing."
                                : "Skipped: GA4 service account credentials are not ready."}
                          </div>
                        )}
                      </div>
                    )}
                    {selected === "email" && connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[0.78rem] font-semibold text-foreground">Gmail data sync</div>
                            <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                              Pull matching inbox messages into this branch as email signals.
                            </div>
                            <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                              Last sync: {formatLastSync(selectedSourceRecord?.last_sync_at)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedSourceRecord && (
                              <Button asChild variant="outline" className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold">
                                <a href={`/api/auth/gmail?source_id=${selectedSourceRecord.id}`}>
                                  {authReady ? "Reauthorize" : "Authorize Gmail"}
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={() => void syncEmailSourceNow(selectedSourceRecord)}
                              disabled={!authReady || syncingSourceId === selectedSourceRecord?.id}
                              className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                            >
                              {syncingSourceId === selectedSourceRecord?.id ? "Syncing..." : "Sync now"}
                            </Button>
                          </div>
                        </div>
                        {!authReady && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Authorize Gmail before syncing email data.
                          </div>
                        )}
                        {emailSyncError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {emailSyncError}
                          </div>
                        )}
                        {emailSyncResult && emailSyncResult.source_id === selectedSourceRecord?.id && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            {emailSyncResult.status === "synced"
                              ? `Synced ${emailSyncResult.ingested ?? 0} email signal${emailSyncResult.ingested === 1 ? "" : "s"} from ${emailSyncResult.fetched ?? 0} fetched message${emailSyncResult.fetched === 1 ? "" : "s"}. ${emailSyncResult.existing_duplicates ?? 0} already existed.`
                              : "Skipped: Gmail authorization is not ready."}
                          </div>
                        )}
                      </div>
                    )}
                    {sourceSaveError && (
                      <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[0.78rem] text-destructive">
                        {sourceSaveError}
                      </div>
                    )}
                    {deleteSourceError && (
                      <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-[0.78rem] text-destructive">
                        {deleteSourceError}
                      </div>
                    )}
                    {isLocationListKey(selected) && connected && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[0.78rem] font-semibold text-foreground">Google Business Profile</div>
                            <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                              Authorize Google, then map a Google location to this Observer branch.
                            </div>
                            <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                              Last sync: {formatLastSync(selectedSourceRecord?.last_sync_at)}
                            </div>
                          </div>
                          {authReady ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void testSourceConnection(selectedSourceRecord)}
                                disabled={testingSourceId === selectedSourceRecord?.id}
                                className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                              >
                                {testingSourceId === selectedSourceRecord?.id ? "Loading..." : "List locations"}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => void syncGoogleReviewsSource(selectedSourceRecord)}
                                disabled={!hasMappedLocation || syncingSourceId === selectedSourceRecord?.id}
                                className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                              >
                                {syncingSourceId === selectedSourceRecord?.id ? "Syncing..." : "Sync now"}
                              </Button>
                            </div>
                          ) : selectedSourceRecord ? (
                            <Button asChild className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold">
                              <a href={`/api/auth/google-reviews?source_id=${selectedSourceRecord.id}`}>Authorize Google</a>
                            </Button>
                          ) : null}
                        </div>
                        {sourceTestError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {sourceTestError}
                          </div>
                        )}
                        {authReady && !hasMappedLocation && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            Select a Google location before syncing reviews.
                          </div>
                        )}
                        {sourceSyncError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {sourceSyncError}
                          </div>
                        )}
                        {sourceSyncResult && sourceSyncResult.source_id === selectedSourceRecord?.id && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            {sourceSyncResult.status === "synced"
                              ? `Synced ${sourceSyncResult.ingested ?? 0} new review signal${sourceSyncResult.ingested === 1 ? "" : "s"} from ${sourceSyncResult.fetched ?? 0} fetched review${sourceSyncResult.fetched === 1 ? "" : "s"}. ${sourceSyncResult.existing_duplicates ?? 0} already existed.`
                              : `Skipped: ${sourceSyncResult.reason ?? "not ready"}.`}
                          </div>
                        )}
                      </div>
                    )}
                    {((isDeliveryConnectionTestKey(selected) && connected) || (isLocationListKey(selected) && connected && sourceTestResult?.provider === selected)) && (
                      <div className="mt-5 rounded-lg border bg-muted px-3.5 py-3">
                        {isDeliveryConnectionTestKey(selected) && (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[0.78rem] font-semibold text-foreground">Connection test</div>
                              <div className="mt-1 text-[0.7rem] leading-[1.5] text-muted-foreground">
                                Resolves the Vault credential and checks the partner API without exposing secrets.
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void testSourceConnection(selectedSourceRecord)}
                              disabled={!authReady || testingSourceId === selectedSourceRecord?.id}
                              className="h-auto rounded-lg px-3.5 py-2 text-[0.75rem] font-bold"
                            >
                              {testingSourceId === selectedSourceRecord?.id ? "Testing..." : "Test connection"}
                            </Button>
                          </div>
                        )}
                        {isDeliveryConnectionTestKey(selected) && sourceTestError && (
                          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[0.72rem] text-destructive">
                            {sourceTestError}
                          </div>
                        )}
                        {sourceTestResult && sourceTestResult.provider === selected && (
                          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-[0.72rem] leading-[1.55] text-muted-foreground">
                            <div className="font-semibold text-foreground">
                              Ready · {sourceTestResult.checks.map((check) => check.id).join(", ")}
                            </div>
                            {sourceTestResult.store_candidates.length > 0 && (
                              <div className="mt-2 flex flex-col gap-2">
                                {sourceTestResult.store_candidates.map((store) => {
                                  const mappingField = sourceMappingField(selected);
                                  const activeValue = mappingField ? formValues[selected][mappingField] : undefined;
                                  const isMapped = activeValue === store.external_id;
                                  return (
                                    <div key={store.external_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted px-2.5 py-2">
                                      <div className="min-w-0">
                                        <div className="truncate font-semibold text-foreground">
                                          {store.name ?? store.external_id}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                                          {store.external_id}{store.status ? ` · ${store.status}` : ""}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant={isMapped ? "secondary" : "outline"}
                                        onClick={() => void applyStoreCandidate(selected, store)}
                                        disabled={mappingCandidateId === store.external_id || isMapped}
                                        className="h-auto rounded-md px-2.5 py-1.5 text-[0.68rem] font-bold"
                                      >
                                        {isMapped ? "Mapped" : mappingCandidateId === store.external_id ? "Saving..." : "Use"}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
                      {connected && !isBranchSourceKey(selected) && (
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

function renderCredentialField(
  f: FormField,
  sourceKey: SourceCredentialKey,
  authValues: Record<SourceCredentialKey, Record<string, string>>,
  setAuthValues: React.Dispatch<React.SetStateAction<Record<SourceCredentialKey, Record<string, string>>>>
) {
  const val = authValues[sourceKey][f.key] ?? "";
  const updateValue = (value: string) => setAuthValues((current) => ({
    ...current,
    [sourceKey]: {
      ...current[sourceKey],
      [f.key]: value,
    },
  }));

  return (
    <div key={f.key}>
      <Label className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {f.label}
      </Label>
      {f.type === "textarea" ? (
        <textarea
          value={val}
          onChange={(event) => updateValue(event.target.value)}
          placeholder={f.placeholder}
          autoComplete="off"
          rows={5}
          className="min-h-[120px] w-full resize-y rounded-[7px] border border-border bg-muted px-3 py-[9px] font-mono text-[0.76rem] leading-[1.55] text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-muted"
        />
      ) : (
        <Input
          type={f.type ?? "password"}
          value={val}
          onChange={(event) => updateValue(event.target.value)}
          placeholder={f.placeholder}
          autoComplete="off"
          className="h-auto rounded-[7px] border-border bg-muted px-3 py-[9px] text-[0.82rem] shadow-none md:text-[0.82rem] dark:bg-muted"
        />
      )}
      {f.hint && (
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
