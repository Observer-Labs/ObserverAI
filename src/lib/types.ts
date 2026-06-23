export type SignalSource =
  | "slack" | "email" | "whatsapp"
  | "zendesk" | "intercom" | "jira"
  | "appstore" | "googleplay" | "googleanalytics"
  | "github" | "reddit"
  | "shopify" | "trustpilot"
  | "googlereviews" | "google_reviews"
  | "getir" | "yemeksepeti" | "trendyol"
  | "pos" | "ga4" | "gmail" | "csv";

export type VerticalType = "saas" | "ecommerce" | "qsr" | "retail" | "auto";
export type DataCategory = "voice" | "pos" | "analytics" | "social";

export type Severity = "critical" | "high" | "medium" | "low";
export type ClusterCategory = "musteri" | "operasyon" | "personel";
export type ClusterStatus = "active" | "reviewed" | "actioned" | "approved" | "dismissed";
export type DeliveryChannel = "slack" | "whatsapp" | "email";
export type DeliveryStatus = "sent" | "failed" | "pending";

export interface Signal {
  id: string;
  workspace_id: string;
  branch_id: string;
  source_id?: string | null;
  source_type?: string | null;
  source: SignalSource;
  channel: string;
  sender?: string;
  content: string;
  timestamp: string;
  sentiment?: "positive" | "negative" | "neutral";
  metric_name?: string | null;
  metric_value?: number | null;
  tags?: string[];
  reviewed: boolean;
  created_at: string;
}

export interface SourceBreakdown {
  slack: number;
  email: number;
  whatsapp: number;
  zendesk: number;
  intercom: number;
  jira: number;
  appstore: number;
  googleplay: number;
  googleanalytics: number;
  github: number;
  reddit: number;
  shopify: number;
  trustpilot: number;
}

export interface Cluster {
  id: string;
  workspace_id: string;
  branch_id: string;
  title: string;
  severity: number; // 0-100
  severity_label: Severity;
  confidence: number; // 0-1
  evidence_count: number;
  source_breakdown: SourceBreakdown;
  business_case: string;
  recommended_action: string;
  category?: ClusterCategory;
  root_cause?: string;
  customer_quote?: string;
  projected_impact?: string; // e.g. "~$12k MRR at risk" or "~18% conversion uplift"
  metric_delta?: number;
  correlation_id?: string | null;
  candidate_key?: string | null;
  vertical?: VerticalType;
  status: ClusterStatus;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  cluster_id: string;
  branch_id: string;
  channel: DeliveryChannel;
  recipient: string;
  sent_at: string;
  status: DeliveryStatus;
  decision?: "approved" | "dismissed" | "pending";
  response?: string;
}

export interface Branch {
  id: string;
  workspace_id: string;
  name: string;
  brand?: string | null;
  district?: string | null;
  city?: string | null;
  timezone: string;
  baseline_metrics: Record<string, unknown>;
  status: "active" | "paused";
  created_at: string;
  updated_at?: string;
}

export interface Source {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: SignalSource;
  display_name: string;
  status: "connected" | "pending" | "error";
  config: Record<string, unknown>;
  credentials?: Record<string, unknown> | null;
  last_sync_at?: string | null;
  created_at: string;
}

export interface Correlation {
  id: string;
  workspace_id: string;
  branch_id: string;
  window_start: string;
  window_end: string;
  primary_metric?: string | null;
  correlated_signal_ids: string[];
  hypothesis?: string | null;
  confidence: number;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  workspace_id: string;
  branch_id?: string | null;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
}

export type DeliveryPlatform = "getir" | "trendyol" | "yemeksepeti" | "csv";

export interface DeliveryOrder {
  id: string;
  workspace_id: string;
  branch_id: string;
  source_id?: string | null;
  platform: DeliveryPlatform;
  external_order_id: string;
  external_store_id?: string | null;
  status: string;
  ordered_at: string;
  updated_at?: string | null;
  gross_amount?: number | null;
  net_amount?: number | null;
  discount_amount?: number | null;
  payment_type?: string | null;
  payment_provider?: string | null;
  cancel_reason?: string | null;
  prep_duration_minutes?: number | null;
  delivery_duration_minutes?: number | null;
  raw_ref: Record<string, unknown>;
  created_at: string;
  updated_record_at?: string;
}

export interface DeliveryReviewClassification {
  sentiment?: "positive" | "negative" | "neutral";
  topics?: string[];
  topic_confidence?: number;
  severity_hint?: Severity;
  critical_topic?: boolean;
  actionable?: boolean;
}

export interface DeliveryReview {
  id: string;
  workspace_id: string;
  branch_id: string;
  source_id?: string | null;
  platform: DeliveryPlatform;
  external_review_id?: string | null;
  external_order_id?: string | null;
  external_store_id?: string | null;
  reviewed_at: string;
  rating_overall?: number | null;
  rating_food?: number | null;
  rating_service?: number | null;
  rating_delivery?: number | null;
  comment_text?: string | null;
  answer_status?: string | null;
  classification: DeliveryReviewClassification;
  raw_ref: Record<string, unknown>;
  created_at: string;
  updated_record_at?: string;
}

export interface DeliveryDailyTopic {
  topic: string;
  count: number;
  confidence?: number;
}

export interface DeliveryDailyMetrics {
  id: string;
  workspace_id: string;
  branch_id: string;
  source_id?: string | null;
  platform: DeliveryPlatform;
  metric_date: string;
  order_count: number;
  cancel_count: number;
  cancel_rate: number;
  gross_amount: number;
  net_amount: number;
  discount_amount: number;
  avg_rating?: number | null;
  bad_review_count: number;
  avg_prep_duration_minutes?: number | null;
  avg_delivery_duration_minutes?: number | null;
  dominant_topics: DeliveryDailyTopic[];
  created_at: string;
  updated_record_at?: string;
}

// ─── Integration Configs ──────────────────────────────────────────────────────

/** Slack signal ingestion config (credentials live on workspace top-level fields) */
export interface SlackIngestConfig {
  enabled: boolean;
  max_age_days: number;    // Only pull messages from last N days (default 7)
  keyword_filter: string;  // Comma-sep keywords, empty = all messages
  last_sync: string | null;
}

/** Email/Gmail ingestion config (credentials live on workspace top-level fields) */
export interface EmailIngestConfig {
  enabled: boolean;
  max_age_days: number;    // Only pull emails from last N days (default 7)
  sender_domains: string;  // Comma-sep domains to watch, empty = all senders
  last_sync: string | null;
}

export interface ZendeskConfig {
  enabled: boolean;
  subdomain: string;
  email: string;
  api_token: string;
  /** Only ingest tickets at or above this priority */
  min_priority: "low" | "normal" | "high" | "urgent";
  /** Skip tickets with status closed or solved */
  exclude_closed: boolean;
  last_sync: string | null;
}

export interface IntercomConfig {
  enabled: boolean;
  access_token: string;
  /** Only ingest open conversations */
  open_only: boolean;
  last_sync: string | null;
}

export interface JiraConfig {
  enabled: boolean;
  domain: string; // e.g. yourcompany.atlassian.net (no https://)
  email: string;
  api_token: string;
  project_key: string;
  /** Only ingest issues at or above this priority */
  min_priority: "lowest" | "low" | "medium" | "high" | "highest";
  /** Skip issues with status Done, Closed, or Resolved */
  exclude_done: boolean;
  /** Comma-sep issue types to include, empty = all (Bug, Story, Epic, Task, etc.) */
  issue_types: string;
  last_sync: string | null;
}

export interface AppStoreConfig {
  enabled: boolean;
  app_id_ios: string;
  app_id_android: string;
  /** Only ingest reviews at or below this star rating (1-5). Default 3, surfaces negative signals */
  max_rating: number;
  last_sync: string | null;
}

export interface GooglePlayConfig {
  enabled: boolean;
  package_name: string;
  service_account_key: string; // JSON string
  max_rating: number; // 1-5, default 3
  last_sync: string | null;
}

export interface GoogleAnalyticsConfig {
  enabled: boolean;
  property_id: string; // GA4 property ID e.g. "123456789"
  service_account_email: string;
  service_account_key: string; // JSON string
  event_filter: string; // comma-sep event names, empty = all
  last_sync: string | null;
}

// ─── Output Integrations ──────────────────────────────────────────────────────

export interface NotionOutputConfig {
  enabled: boolean;
  api_key: string;
  database_id: string;
}

export interface JiraOutputConfig {
  enabled: boolean;
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
}

export interface GoogleDocsOutputConfig {
  enabled: boolean;
  service_account_key: string;
  folder_id: string;
}

export interface OutputConfig {
  notion?: NotionOutputConfig;
  jira?: JiraOutputConfig;
  google_docs?: GoogleDocsOutputConfig;
}

// ─── Alert Thresholds ─────────────────────────────────────────────────────────

export interface ThresholdsConfig {
  min_severity: number;   // 0-100, default 70, clusters below this won't fire alerts
  min_evidence: number;   // default 5, min signals to form a cluster worth alerting
  cooldown_hours: number; // 24 | 48 | 168, don't re-alert same cluster within window
}

export interface GitHubConfig {
  enabled: boolean;
  token: string;
  owner: string;
  repo: string;
  /** Only ingest issues with at least this many reactions */
  min_reactions: number;
  /** Comma-sep label names to filter by, empty = all labels */
  labels: string;
  last_sync: string | null;
}

export interface RedditConfig {
  enabled: boolean;
  client_id: string;
  client_secret: string;
  subreddits: string; // comma-separated: "r/typescript, r/nextjs"
  /** Only ingest posts with at least this score (upvotes - downvotes) */
  min_score: number;
  /** Only ingest posts with at least this many comments */
  min_comments: number;
  last_sync: string | null;
}

export interface ShopifyConfig {
  enabled: boolean;
  shop_domain: string;     // e.g. mystore.myshopify.com
  access_token: string;    // Shopify Admin API token
  last_sync: string | null;
}

export interface TrustpilotConfig {
  enabled: boolean;
  business_unit_id: string; // Trustpilot business unit ID
  api_key: string;
  max_rating: number; // 1-5, default 3
  last_sync: string | null;
}

export interface IntegrationsConfig {
  slack: SlackIngestConfig;
  email: EmailIngestConfig;
  zendesk: ZendeskConfig;
  intercom: IntercomConfig;
  jira: JiraConfig;
  appstore: AppStoreConfig;
  googleplay: GooglePlayConfig;
  googleanalytics: GoogleAnalyticsConfig;
  github: GitHubConfig;
  reddit: RedditConfig;
  shopify?: ShopifyConfig;
  trustpilot?: TrustpilotConfig;
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface WhatsAppConfig {
  enabled: boolean;
  webhook_verified: boolean;
  recipient_numbers: string[];
  critical_only: boolean;
  consent_requested_at?: string;
  opted_in?: boolean;
  opted_in_at?: string;
  verified?: boolean;
  verified_at?: string;
  last_inbound_at?: string;
}

export interface DistributionConfig {
  slack: {
    enabled: boolean;
    channels: string[];
    severity_threshold: Severity;
    schedule: "instant" | "hourly" | "daily";
  };
  whatsapp: {
    enabled: boolean;
    recipient_numbers: string[];
    critical_only: boolean;
  };
  email: {
    enabled: boolean;
    recipients: string[];
    schedule: "instant" | "daily" | "weekly";
  };
  auto_distribute?: boolean;
  thresholds?: ThresholdsConfig;
}

export interface Workspace {
  id: string;
  name: string;
  slack_token?: string;
  slack_bot_token?: string;
  slack_team_id?: string;
  slack_monitored_channels?: string[];
  gmail_token?: string;
  gmail_refresh_token?: string;
  whatsapp_config?: WhatsAppConfig;
  distribution_config?: DistributionConfig;
  integrations_config?: IntegrationsConfig;
  output_config?: OutputConfig;
  created_at: string;
  // ─── Billing ───────────────────────────────────────────────────────────────
  plan?: "trial" | "starter" | "growth" | "scale" | "enterprise" | "pro" | "past_due" | "cancelled" | "expired";
  branch_limit?: number | null;
  trial_ends_at?: string;
  polar_subscription_id?: string;
  polar_customer_id?: string;
  polar_order_id?: string;
  polar_status?: string;
  polar_renews_at?: string;
  polar_ends_at?: string;
  analysis_count?: number;
  analysis_count_reset_at?: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export interface IntentSnapshot {
  problem_statement: string;
  recommended_solution: string;
  acceptance_criteria: string[];
  success_metrics: string[];
  effort_estimate: string;
  cluster: Cluster;
}

export interface AnalysisResult {
  title: string;
  severity: number;
  confidence: number;
  evidence_count: number;
  source_breakdown: SourceBreakdown;
  business_case: string;
  recommended_action: string;
  category?: ClusterCategory;
  customer_quote?: string;
  projected_impact?: string;
}

// ─── Sprint (Jira) ────────────────────────────────────────────────────────────

export interface SprintItem {
  id: string;
  key?: string;
  title: string;
  status?: string;
  priority?: string;
  type?: string;
  category?: string;
}
