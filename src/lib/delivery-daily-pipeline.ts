import { buildDeliveryBaseline, type DeliveryBaselineMetricInput } from "./delivery-baselines";
import {
  buildAndUpsertDeliveryDailyMetrics,
  evaluateDeliveryDailyMetricCandidates,
  type DeliveryOrderMetricInput,
  type DeliveryReviewMetricInput,
} from "./delivery-daily-metrics";
import type {
  EvaluateDailySignalOptions,
  PreviousNotification,
  SignalCandidate,
} from "./daily-signal-rules";
import { getSupabaseAdmin } from "./supabase";
import type { DeliveryDailyMetrics, DeliveryPlatform } from "./types";

export interface RunDeliveryDailyPipelineInput {
  workspaceId: string;
  branchId: string;
  sourceId?: string | null;
  platform: DeliveryPlatform;
  metricDate: string;
  historyDays?: number;
  previousNotifications?: PreviousNotification[];
  signalOptions?: Partial<EvaluateDailySignalOptions>;
}

export interface DeliveryDailyPipelineResult {
  metrics: DeliveryDailyMetrics;
  baseline: ReturnType<typeof buildDeliveryBaseline>;
  candidates: SignalCandidate[];
}

const DEFAULT_HISTORY_DAYS = 42;

export async function runDeliveryDailyPipeline(
  input: RunDeliveryDailyPipelineInput,
): Promise<DeliveryDailyPipelineResult> {
  const [orders, reviews, history] = await Promise.all([
    fetchDeliveryOrders(input),
    fetchDeliveryReviews(input),
    fetchDeliveryMetricHistory(input),
  ]);

  const metrics = await buildAndUpsertDeliveryDailyMetrics({
    workspaceId: input.workspaceId,
    branchId: input.branchId,
    sourceId: input.sourceId ?? null,
    platform: input.platform,
    metricDate: input.metricDate,
    orders,
    reviews,
  });
  const baseline = buildDeliveryBaseline(history, input.metricDate);
  const candidates = evaluateDeliveryDailyMetricCandidates(
    metrics,
    baseline,
    input.previousNotifications ?? [],
    input.signalOptions ?? {},
  );

  return { metrics, baseline, candidates };
}

async function fetchDeliveryOrders(input: RunDeliveryDailyPipelineInput): Promise<DeliveryOrderMetricInput[]> {
  const range = metricDateRange(input.metricDate);
  let query = getSupabaseAdmin()
    .from("delivery_orders")
    .select([
      "workspace_id",
      "branch_id",
      "source_id",
      "platform",
      "status",
      "ordered_at",
      "gross_amount",
      "net_amount",
      "discount_amount",
      "prep_duration_minutes",
      "delivery_duration_minutes",
    ].join(","))
    .eq("workspace_id", input.workspaceId)
    .eq("branch_id", input.branchId)
    .eq("platform", input.platform)
    .gte("ordered_at", range.start)
    .lt("ordered_at", range.end);

  query = applySourceFilter(query, input.sourceId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DeliveryOrderMetricInput[];
}

async function fetchDeliveryReviews(input: RunDeliveryDailyPipelineInput): Promise<DeliveryReviewMetricInput[]> {
  const range = metricDateRange(input.metricDate);
  let query = getSupabaseAdmin()
    .from("delivery_reviews")
    .select([
      "workspace_id",
      "branch_id",
      "source_id",
      "platform",
      "reviewed_at",
      "rating_overall",
      "classification",
    ].join(","))
    .eq("workspace_id", input.workspaceId)
    .eq("branch_id", input.branchId)
    .eq("platform", input.platform)
    .gte("reviewed_at", range.start)
    .lt("reviewed_at", range.end);

  query = applySourceFilter(query, input.sourceId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DeliveryReviewMetricInput[];
}

async function fetchDeliveryMetricHistory(input: RunDeliveryDailyPipelineInput): Promise<DeliveryBaselineMetricInput[]> {
  let query = getSupabaseAdmin()
    .from("delivery_daily_metrics")
    .select([
      "metric_date",
      "order_count",
      "cancel_rate",
      "net_amount",
      "bad_review_count",
      "avg_rating",
      "avg_prep_duration_minutes",
    ].join(","))
    .eq("workspace_id", input.workspaceId)
    .eq("branch_id", input.branchId)
    .eq("platform", input.platform)
    .lt("metric_date", input.metricDate)
    .order("metric_date", { ascending: false })
    .limit(input.historyDays ?? DEFAULT_HISTORY_DAYS);

  query = applySourceFilter(query, input.sourceId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DeliveryBaselineMetricInput[];
}

function applySourceFilter<Query extends { eq: (column: string, value: unknown) => Query; is: (column: string, value: null) => Query }>(
  query: Query,
  sourceId: string | null | undefined,
) {
  return sourceId ? query.eq("source_id", sourceId) : query.is("source_id", null);
}

function metricDateRange(metricDate: string) {
  const start = new Date(`${metricDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("metricDate must be an ISO date string");
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
