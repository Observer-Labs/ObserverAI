import { describe, expect, it } from "vitest";
import { buildDeliveryBaseline, type DeliveryBaselineMetricInput } from "./delivery-baselines";

function metric(metric_date: string, overrides: Partial<DeliveryBaselineMetricInput> = {}): DeliveryBaselineMetricInput {
  return {
    metric_date,
    order_count: 100,
    cancel_rate: 0.02,
    net_amount: 10000,
    bad_review_count: 2,
    avg_rating: 4.2,
    avg_prep_duration_minutes: 18,
    ...overrides,
  };
}

describe("delivery baselines", () => {
  it("uses the median of the previous same weekdays when enough samples exist", () => {
    const baseline = buildDeliveryBaseline([
      metric("2026-05-23", { order_count: 90, cancel_rate: 0.01, net_amount: 9000, bad_review_count: 1 }),
      metric("2026-05-30", { order_count: 100, cancel_rate: 0.02, net_amount: 10000, bad_review_count: 2 }),
      metric("2026-06-06", { order_count: 110, cancel_rate: 0.03, net_amount: 11000, bad_review_count: 3 }),
      metric("2026-06-13", { order_count: 120, cancel_rate: 0.04, net_amount: 12000, bad_review_count: 4 }),
      metric("2026-06-19", { order_count: 999, cancel_rate: 0.9, net_amount: 999 }),
    ], "2026-06-20");

    expect(baseline).toEqual({
      orderCount: 105,
      cancelRate: 0.025,
      netAmount: 10500,
      badReviewCount: 2.5,
      avgRating: 4.2,
      avgPrepDurationMinutes: 18,
    });
  });

  it("falls back to rolling median when same weekday samples are insufficient", () => {
    const baseline = buildDeliveryBaseline([
      metric("2026-06-15", { net_amount: 8000 }),
      metric("2026-06-16", { net_amount: 9000 }),
      metric("2026-06-17", { net_amount: 10000 }),
      metric("2026-06-18", { net_amount: 11000 }),
      metric("2026-06-19", { net_amount: 12000 }),
    ], "2026-06-20");

    expect(baseline?.netAmount).toBe(10000);
  });

  it("returns null when there is not enough history", () => {
    expect(buildDeliveryBaseline([
      metric("2026-06-19"),
      metric("2026-06-18"),
    ], "2026-06-20")).toBeNull();
  });

  it("ignores target-day and future rows", () => {
    const baseline = buildDeliveryBaseline([
      metric("2026-06-13", { net_amount: 10000 }),
      metric("2026-06-06", { net_amount: 11000 }),
      metric("2026-05-30", { net_amount: 12000 }),
      metric("2026-06-20", { net_amount: 1 }),
      metric("2026-06-21", { net_amount: 1 }),
    ], "2026-06-20");

    expect(baseline?.netAmount).toBe(11000);
  });

  it("keeps optional averages undefined when no sample has a value", () => {
    const baseline = buildDeliveryBaseline([
      metric("2026-06-15", { avg_rating: null, avg_prep_duration_minutes: null }),
      metric("2026-06-16", { avg_rating: null, avg_prep_duration_minutes: null }),
      metric("2026-06-17", { avg_rating: null, avg_prep_duration_minutes: null }),
      metric("2026-06-18", { avg_rating: null, avg_prep_duration_minutes: null }),
      metric("2026-06-19", { avg_rating: null, avg_prep_duration_minutes: null }),
    ], "2026-06-20");

    expect(baseline).toMatchObject({
      avgRating: undefined,
      avgPrepDurationMinutes: undefined,
    });
  });
});
