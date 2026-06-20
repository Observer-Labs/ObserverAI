import type { DailyBaselineMetrics } from "./daily-signal-rules";
import type { DeliveryDailyMetrics } from "./types";

export type DeliveryBaselineMetricInput = Pick<
  DeliveryDailyMetrics,
  | "metric_date"
  | "order_count"
  | "cancel_rate"
  | "net_amount"
  | "bad_review_count"
  | "avg_rating"
  | "avg_prep_duration_minutes"
>;

export interface BuildDeliveryBaselineOptions {
  sameWeekdayLimit: number;
  rollingLimit: number;
  minSameWeekdaySamples: number;
  minRollingSamples: number;
}

export const DEFAULT_DELIVERY_BASELINE_OPTIONS: BuildDeliveryBaselineOptions = {
  sameWeekdayLimit: 4,
  rollingLimit: 14,
  minSameWeekdaySamples: 3,
  minRollingSamples: 5,
};

export function buildDeliveryBaseline(
  history: DeliveryBaselineMetricInput[],
  targetDate: string,
  options: Partial<BuildDeliveryBaselineOptions> = {},
): DailyBaselineMetrics | null {
  const resolved = { ...DEFAULT_DELIVERY_BASELINE_OPTIONS, ...options };
  const target = parseMetricDate(targetDate);
  if (!target) return null;

  const previous = history
    .filter((metric) => {
      const date = parseMetricDate(metric.metric_date);
      return date && date < target;
    })
    .sort((a, b) => b.metric_date.localeCompare(a.metric_date));

  const sameWeekday = previous
    .filter((metric) => parseMetricDate(metric.metric_date)?.getUTCDay() === target.getUTCDay())
    .slice(0, resolved.sameWeekdayLimit);

  if (sameWeekday.length >= resolved.minSameWeekdaySamples) {
    return baselineFromSamples(sameWeekday);
  }

  const rolling = previous.slice(0, resolved.rollingLimit);
  if (rolling.length >= resolved.minRollingSamples) {
    return baselineFromSamples(rolling);
  }

  return null;
}

function baselineFromSamples(samples: DeliveryBaselineMetricInput[]): DailyBaselineMetrics {
  return {
    orderCount: median(samples.map((sample) => sample.order_count)),
    cancelRate: median(samples.map((sample) => sample.cancel_rate)),
    netAmount: median(samples.map((sample) => sample.net_amount)),
    badReviewCount: median(samples.map((sample) => sample.bad_review_count)),
    avgRating: nullableMedian(samples.map((sample) => sample.avg_rating)),
    avgPrepDurationMinutes: nullableMedian(samples.map((sample) => sample.avg_prep_duration_minutes)),
  };
}

function parseMetricDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nullableMedian(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return valid.length > 0 ? median(valid) : undefined;
}

function median(values: number[]) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(4));
}
