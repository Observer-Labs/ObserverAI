import type { DeliveryDailyMetrics, DeliveryDailyTopic, DeliveryOrder, DeliveryPlatform, DeliveryReview } from "./types";

export type DeliveryOrderMetricInput = Pick<
  DeliveryOrder,
  | "workspace_id"
  | "branch_id"
  | "source_id"
  | "platform"
  | "status"
  | "ordered_at"
  | "gross_amount"
  | "net_amount"
  | "discount_amount"
  | "prep_duration_minutes"
  | "delivery_duration_minutes"
>;

export type DeliveryReviewMetricInput = Pick<
  DeliveryReview,
  | "workspace_id"
  | "branch_id"
  | "source_id"
  | "platform"
  | "reviewed_at"
  | "rating_overall"
  | "classification"
>;

export type DeliveryDailyMetricInsert = Omit<DeliveryDailyMetrics, "id" | "created_at">;

export interface BuildDeliveryDailyMetricsInput {
  workspaceId: string;
  branchId: string;
  sourceId?: string | null;
  platform: DeliveryPlatform;
  metricDate: string;
  orders: DeliveryOrderMetricInput[];
  reviews: DeliveryReviewMetricInput[];
}

const CANCEL_STATUS_PATTERNS = ["cancel", "cancelled", "canceled", "iptal"];

export function buildDeliveryDailyMetrics(input: BuildDeliveryDailyMetricsInput): DeliveryDailyMetricInsert {
  const orders = input.orders.filter((order) => matchesMetricScope({
    rowWorkspaceId: order.workspace_id,
    rowBranchId: order.branch_id,
    rowSourceId: order.source_id,
    rowPlatform: order.platform,
    rowTimestamp: order.ordered_at,
    input,
  }));
  const reviews = input.reviews.filter((review) => matchesMetricScope({
    rowWorkspaceId: review.workspace_id,
    rowBranchId: review.branch_id,
    rowSourceId: review.source_id,
    rowPlatform: review.platform,
    rowTimestamp: review.reviewed_at,
    input,
  }));
  const badReviews = reviews.filter(isBadReview);

  return {
    workspace_id: input.workspaceId,
    branch_id: input.branchId,
    source_id: input.sourceId ?? null,
    platform: input.platform,
    metric_date: input.metricDate,
    order_count: orders.length,
    cancel_count: orders.filter((order) => isCancelledStatus(order.status)).length,
    cancel_rate: rate(orders.filter((order) => isCancelledStatus(order.status)).length, orders.length),
    gross_amount: roundMoney(sumNumbers(orders.map((order) => order.gross_amount))),
    net_amount: roundMoney(sumNumbers(orders.map((order) => order.net_amount))),
    discount_amount: roundMoney(sumNumbers(orders.map((order) => order.discount_amount))),
    avg_rating: averageNumbers(reviews.map((review) => review.rating_overall)),
    bad_review_count: badReviews.length,
    avg_prep_duration_minutes: averageNumbers(orders.map((order) => order.prep_duration_minutes)),
    avg_delivery_duration_minutes: averageNumbers(orders.map((order) => order.delivery_duration_minutes)),
    dominant_topics: countDominantTopics(badReviews),
  };
}

function matchesMetricScope(args: {
  rowWorkspaceId: string;
  rowBranchId: string;
  rowSourceId?: string | null;
  rowPlatform: DeliveryPlatform;
  rowTimestamp: string;
  input: BuildDeliveryDailyMetricsInput;
}) {
  return (
    args.rowWorkspaceId === args.input.workspaceId &&
    args.rowBranchId === args.input.branchId &&
    args.rowPlatform === args.input.platform &&
    sameSource(args.rowSourceId, args.input.sourceId) &&
    isoDate(args.rowTimestamp) === args.input.metricDate
  );
}

function sameSource(rowSourceId: string | null | undefined, inputSourceId: string | null | undefined) {
  return (rowSourceId ?? null) === (inputSourceId ?? null);
}

function isoDate(value: string) {
  return value.slice(0, 10);
}

function isCancelledStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return CANCEL_STATUS_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isBadReview(review: DeliveryReviewMetricInput) {
  return (
    review.classification.sentiment === "negative" ||
    review.classification.actionable === true ||
    (typeof review.rating_overall === "number" && review.rating_overall <= 2)
  );
}

function countDominantTopics(reviews: DeliveryReviewMetricInput[]): DeliveryDailyTopic[] {
  const counts = new Map<string, { count: number; confidenceTotal: number; confidenceCount: number }>();

  for (const review of reviews) {
    for (const topic of review.classification.topics ?? []) {
      const current = counts.get(topic) ?? { count: 0, confidenceTotal: 0, confidenceCount: 0 };
      current.count += 1;
      if (typeof review.classification.topic_confidence === "number") {
        current.confidenceTotal += review.classification.topic_confidence;
        current.confidenceCount += 1;
      }
      counts.set(topic, current);
    }
  }

  return [...counts.entries()]
    .map(([topic, value]) => ({
      topic,
      count: value.count,
      confidence: value.confidenceCount > 0
        ? roundMetric(value.confidenceTotal / value.confidenceCount)
        : undefined,
    }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, 5);
}

function sumNumbers(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function averageNumbers(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return roundMetric(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function rate(count: number, total: number) {
  return total > 0 ? roundMetric(count / total) : 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}
