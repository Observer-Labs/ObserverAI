import { severityLabel, type SeverityLabel } from "./plans";

export type DailyTopic = "delivery_delay" | "late_delivery" | "cold_food" | "payment_failed" | "payment_type_error" | "payment_system_down" | "food_poisoning" | "foreign_object" | "severe_hygiene" | "threat" | "other";

export interface TopicCount {
  topic: DailyTopic | string;
  count: number;
  confidence?: number;
}

export interface DailyDeliveryMetrics {
  workspaceId: string;
  branchId: string;
  sourceId?: string;
  platform: "getir" | "trendyol" | "yemeksepeti" | "pos" | "google" | "ga4" | "csv";
  date: string;
  orderCount: number;
  cancelCount: number;
  netAmount: number;
  grossAmount?: number;
  badReviewCount: number;
  avgRating?: number;
  avgPrepDurationMinutes?: number;
  topicCounts: TopicCount[];
}

export interface DailyBaselineMetrics {
  orderCount: number;
  cancelRate: number;
  netAmount: number;
  badReviewCount: number;
  avgRating?: number;
  avgPrepDurationMinutes?: number;
}

export interface PreviousNotification {
  workspaceId: string;
  branchId: string;
  topic: string;
  sentAt: string;
}

export type CandidateKind =
  | "delivery_cancel_delay"
  | "sales_drop_review"
  | "payment_problem"
  | "critical_topic";

export interface SignalCandidate {
  kind: CandidateKind;
  workspaceId: string;
  branchId: string;
  sourceId?: string;
  platform: DailyDeliveryMetrics["platform"];
  topic: string;
  severity: number;
  severityLabel: SeverityLabel;
  evidenceCount: number;
  businessImpact: string;
  evidence: string[];
  shouldNotify: boolean;
  suppressReason?: string;
}

type SignalCandidateDraft = Omit<SignalCandidate, "severityLabel">;

export interface EvaluateDailySignalOptions {
  minOrderCount: number;
  minCancelCount: number;
  minCancelRateMultiplier: number;
  minBadReviewCount: number;
  minTopicShare: number;
  minNetAmountDropPercent: number;
  cooldownHours: number;
  now: Date;
}

export const DEFAULT_DAILY_SIGNAL_OPTIONS: EvaluateDailySignalOptions = {
  minOrderCount: 20,
  minCancelCount: 3,
  minCancelRateMultiplier: 2,
  minBadReviewCount: 2,
  minTopicShare: 0.4,
  minNetAmountDropPercent: 0.15,
  cooldownHours: 24,
  now: new Date(),
};

const CRITICAL_TOPICS = new Set(["food_poisoning", "foreign_object", "severe_hygiene", "threat", "payment_system_down"]);
const DELAY_TOPICS = new Set(["delivery_delay", "late_delivery"]);
const PAYMENT_TOPICS = new Set(["payment_failed", "payment_type_error", "payment_system_down"]);

export function evaluateDailySignalCandidates(
  metrics: DailyDeliveryMetrics,
  baseline: DailyBaselineMetrics | null,
  previousNotifications: PreviousNotification[] = [],
  options: Partial<EvaluateDailySignalOptions> = {},
): SignalCandidate[] {
  const resolved = { ...DEFAULT_DAILY_SIGNAL_OPTIONS, ...options };
  const candidates: SignalCandidateDraft[] = [];
  const cancelRate = rate(metrics.cancelCount, metrics.orderCount);
  const dominant = dominantTopic(metrics.topicCounts);
  const dominantShare = topicShare(metrics.topicCounts, dominant?.topic);
  const delayCount = countTopics(metrics.topicCounts, DELAY_TOPICS);
  const delayShare = metrics.badReviewCount > 0 ? delayCount / metrics.badReviewCount : 0;
  const paymentCount = countTopics(metrics.topicCounts, PAYMENT_TOPICS);
  const critical = metrics.topicCounts.find((topic) => CRITICAL_TOPICS.has(topic.topic) && topic.count > 0 && (topic.confidence ?? 1) >= 0.7);

  if (critical) {
    candidates.push(applyNotificationPolicy({
      kind: "critical_topic",
      workspaceId: metrics.workspaceId,
      branchId: metrics.branchId,
      sourceId: metrics.sourceId,
      platform: metrics.platform,
      topic: critical.topic,
      severity: clampSeverity(82 + Math.min(12, critical.count * 4)),
      evidenceCount: critical.count,
      businessImpact: "Critical customer safety or trust issue detected.",
      evidence: [`${critical.count} critical ${critical.topic} mention${critical.count === 1 ? "" : "s"}.`],
      shouldNotify: true,
    }, previousNotifications, resolved));
  }

  if (!baseline) {
    return candidates.map((candidate) => withSeverityLabel(candidate));
  }

  const cancelRateMultiplier = safeMultiplier(cancelRate, baseline.cancelRate);
  if (
    metrics.orderCount >= resolved.minOrderCount &&
    metrics.cancelCount >= resolved.minCancelCount &&
    cancelRateMultiplier >= resolved.minCancelRateMultiplier &&
    metrics.badReviewCount >= resolved.minBadReviewCount &&
    delayShare >= resolved.minTopicShare
  ) {
    const severity = scoreCandidate({
      businessImpact: Math.min(30, (cancelRateMultiplier - 1) * 12),
      volume: Math.min(20, metrics.cancelCount * 3 + metrics.badReviewCount),
      anomaly: Math.min(25, (cancelRateMultiplier - 1) * 10),
      topicSeverity: 16,
      multiSource: 8,
      confidence: 10,
    });
    candidates.push(applyNotificationPolicy({
      kind: "delivery_cancel_delay",
      workspaceId: metrics.workspaceId,
      branchId: metrics.branchId,
      sourceId: metrics.sourceId,
      platform: metrics.platform,
      topic: "delivery_delay",
      severity,
      evidenceCount: metrics.cancelCount + delayCount,
      businessImpact: `Cancel rate is ${formatMultiplier(cancelRateMultiplier)} baseline.`,
      evidence: [
        `${metrics.cancelCount} cancellations from ${metrics.orderCount} orders (${formatPercent(cancelRate)}).`,
        `Baseline cancel rate is ${formatPercent(baseline.cancelRate)}.`,
        `${delayCount} of ${metrics.badReviewCount} bad reviews mention delivery delay.`,
      ],
      shouldNotify: true,
    }, previousNotifications, resolved));
  }

  const netDropPercent = dropPercent(metrics.netAmount, baseline.netAmount);
  if (
    netDropPercent >= resolved.minNetAmountDropPercent &&
    metrics.badReviewCount >= resolved.minBadReviewCount + 1 &&
    dominant &&
    dominantShare >= resolved.minTopicShare
  ) {
    const severity = scoreCandidate({
      businessImpact: Math.min(35, netDropPercent * 120),
      volume: Math.min(18, metrics.badReviewCount * 3),
      anomaly: Math.min(20, netDropPercent * 80),
      topicSeverity: dominant.topic === "other" ? 6 : 12,
      multiSource: 8,
      confidence: 8,
    });
    candidates.push(applyNotificationPolicy({
      kind: "sales_drop_review",
      workspaceId: metrics.workspaceId,
      branchId: metrics.branchId,
      sourceId: metrics.sourceId,
      platform: metrics.platform,
      topic: dominant.topic,
      severity,
      evidenceCount: metrics.badReviewCount,
      businessImpact: `Net sales are down ${formatPercent(netDropPercent)} vs baseline.`,
      evidence: [
        `Net amount ${formatMoney(metrics.netAmount)} vs baseline ${formatMoney(baseline.netAmount)}.`,
        `${metrics.badReviewCount} bad reviews today.`,
        `${dominant.count} reviews mention ${dominant.topic}.`,
      ],
      shouldNotify: true,
    }, previousNotifications, resolved));
  }

  if (paymentCount >= 1 && (netDropPercent >= resolved.minNetAmountDropPercent || metrics.badReviewCount >= resolved.minBadReviewCount)) {
    candidates.push(applyNotificationPolicy({
      kind: "payment_problem",
      workspaceId: metrics.workspaceId,
      branchId: metrics.branchId,
      sourceId: metrics.sourceId,
      platform: metrics.platform,
      topic: "payment_failed",
      severity: scoreCandidate({
        businessImpact: Math.min(35, netDropPercent * 120),
        volume: Math.min(18, paymentCount * 6),
        anomaly: Math.min(18, netDropPercent * 80),
        topicSeverity: 18,
        multiSource: 6,
        confidence: 9,
      }),
      evidenceCount: paymentCount,
      businessImpact: netDropPercent > 0 ? `Net sales are down ${formatPercent(netDropPercent)} with payment complaints.` : "Payment complaints detected.",
      evidence: [`${paymentCount} payment-related complaint${paymentCount === 1 ? "" : "s"}.`],
      shouldNotify: true,
    }, previousNotifications, resolved));
  }

  return candidates.map((candidate) => withSeverityLabel(candidate));
}

export function selectDailyDigestCandidates(candidates: SignalCandidate[], maxItems = 3): SignalCandidate[] {
  return candidates
    .filter((candidate) => candidate.shouldNotify)
    .sort((a, b) => b.severity - a.severity || b.evidenceCount - a.evidenceCount)
    .slice(0, maxItems);
}

/**
 * Groups notifiable candidates by workspace and keeps at most maxItems per
 * workspace per day (roadmap B.5.3: max 3 WhatsApp issues/day). Suppressed
 * candidates stay on the dashboard but never reach WhatsApp.
 */
export function selectDailyDigestByWorkspace<T extends { candidate: SignalCandidate }>(
  items: T[],
  maxItems = 3,
): Map<string, T[]> {
  const byWorkspace = new Map<string, T[]>();

  for (const item of items) {
    if (!item.candidate.shouldNotify) continue;
    const list = byWorkspace.get(item.candidate.workspaceId) ?? [];
    list.push(item);
    byWorkspace.set(item.candidate.workspaceId, list);
  }

  for (const [workspaceId, list] of byWorkspace) {
    byWorkspace.set(
      workspaceId,
      [...list]
        .sort(
          (a, b) =>
            b.candidate.severity - a.candidate.severity ||
            b.candidate.evidenceCount - a.candidate.evidenceCount,
        )
        .slice(0, maxItems),
    );
  }

  return byWorkspace;
}

function applyNotificationPolicy<T extends SignalCandidateDraft>(
  candidate: T,
  previousNotifications: PreviousNotification[],
  options: EvaluateDailySignalOptions,
): T {
  const sentRecently = previousNotifications.some((notification) => (
    notification.workspaceId === candidate.workspaceId &&
    notification.branchId === candidate.branchId &&
    notification.topic === candidate.topic &&
    hoursBetween(new Date(notification.sentAt), options.now) < options.cooldownHours
  ));

  if (sentRecently) {
    return {
      ...candidate,
      shouldNotify: false,
      suppressReason: "cooldown",
    };
  }

  return candidate;
}

function withSeverityLabel(candidate: SignalCandidateDraft): SignalCandidate {
  return {
    ...candidate,
    severityLabel: severityLabel(candidate.severity),
  };
}

function dominantTopic(topics: TopicCount[]): TopicCount | null {
  return topics.filter((topic) => topic.count > 0).sort((a, b) => b.count - a.count)[0] ?? null;
}

function topicShare(topics: TopicCount[], topic: string | undefined): number {
  if (!topic) return 0;
  const total = topics.reduce((sum, current) => sum + Math.max(0, current.count), 0);
  const count = topics.find((current) => current.topic === topic)?.count ?? 0;
  return total > 0 ? count / total : 0;
}

function countTopics(topics: TopicCount[], allowed: Set<string>): number {
  return topics.reduce((sum, topic) => allowed.has(topic.topic) ? sum + Math.max(0, topic.count) : sum, 0);
}

function rate(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function safeMultiplier(value: number, baseline: number): number {
  if (baseline <= 0) return value > 0 ? Number.POSITIVE_INFINITY : 0;
  return value / baseline;
}

function dropPercent(current: number, baseline: number): number {
  if (baseline <= 0 || current >= baseline) return 0;
  return (baseline - current) / baseline;
}

function scoreCandidate(parts: {
  businessImpact: number;
  volume: number;
  anomaly: number;
  topicSeverity: number;
  multiSource: number;
  confidence: number;
}): number {
  return clampSeverity(
    parts.businessImpact +
    parts.volume +
    parts.anomaly +
    parts.topicSeverity +
    parts.multiSource +
    parts.confidence,
  );
}

function clampSeverity(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hoursBetween(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / (60 * 60 * 1000);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMultiplier(value: number): string {
  if (!Number.isFinite(value)) return "above";
  return `${value.toFixed(1)}x`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "TRY",
  }).format(value);
}
