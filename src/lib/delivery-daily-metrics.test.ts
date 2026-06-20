import { describe, expect, it } from "vitest";
import {
  buildDeliveryDailyMetrics,
  type DeliveryOrderMetricInput,
  type DeliveryReviewMetricInput,
} from "./delivery-daily-metrics";

const baseOrder: DeliveryOrderMetricInput = {
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  status: "Delivered",
  ordered_at: "2026-06-19T10:00:00.000Z",
  gross_amount: 100,
  net_amount: 90,
  discount_amount: 10,
  prep_duration_minutes: 18,
  delivery_duration_minutes: 32,
};

const baseReview: DeliveryReviewMetricInput = {
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  reviewed_at: "2026-06-19T12:00:00.000Z",
  rating_overall: 2,
  classification: {
    sentiment: "negative",
    topics: ["delivery_delay"],
    topic_confidence: 0.92,
    actionable: true,
  },
};

describe("delivery daily metrics", () => {
  it("aggregates order totals, cancel rate, review quality, and dominant topics", () => {
    const metrics = buildDeliveryDailyMetrics({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      platform: "trendyol",
      metricDate: "2026-06-19",
      orders: [
        baseOrder,
        {
          ...baseOrder,
          status: "Cancelled",
          gross_amount: 80,
          net_amount: 0,
          discount_amount: 0,
          prep_duration_minutes: 24,
          delivery_duration_minutes: null,
        },
        {
          ...baseOrder,
          status: "Delivered",
          ordered_at: "2026-06-18T23:59:00.000Z",
          gross_amount: 999,
          net_amount: 999,
        },
      ],
      reviews: [
        baseReview,
        {
          ...baseReview,
          rating_overall: 4,
          classification: {
            sentiment: "positive",
            topics: ["packaging"],
            topic_confidence: 0.71,
          },
        },
        {
          ...baseReview,
          rating_overall: 1,
          classification: {
            sentiment: "negative",
            topics: ["delivery_delay", "cold_food"],
            topic_confidence: 0.84,
          },
        },
      ],
    });

    expect(metrics).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      platform: "trendyol",
      metric_date: "2026-06-19",
      order_count: 2,
      cancel_count: 1,
      cancel_rate: 0.5,
      gross_amount: 180,
      net_amount: 90,
      discount_amount: 10,
      avg_rating: 2.3333,
      bad_review_count: 2,
      avg_prep_duration_minutes: 21,
      avg_delivery_duration_minutes: 32,
    });
    expect(metrics.dominant_topics).toEqual([
      { topic: "delivery_delay", count: 2, confidence: 0.88 },
      { topic: "cold_food", count: 1, confidence: 0.84 },
    ]);
  });

  it("filters rows by workspace, branch, source, platform, and metric date", () => {
    const metrics = buildDeliveryDailyMetrics({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      platform: "getir",
      metricDate: "2026-06-19",
      orders: [
        { ...baseOrder, platform: "getir", status: "iptal edildi" },
        { ...baseOrder, platform: "trendyol", status: "Cancelled" },
        { ...baseOrder, platform: "getir", branch_id: "branch-2" },
        { ...baseOrder, platform: "getir", source_id: "source-2" },
        { ...baseOrder, platform: "getir", workspace_id: "workspace-2" },
      ],
      reviews: [
        { ...baseReview, platform: "getir" },
        { ...baseReview, platform: "getir", reviewed_at: "2026-06-20T00:00:00.000Z" },
      ],
    });

    expect(metrics.order_count).toBe(1);
    expect(metrics.cancel_count).toBe(1);
    expect(metrics.cancel_rate).toBe(1);
    expect(metrics.bad_review_count).toBe(1);
  });

  it("returns empty metric defaults when no rows match", () => {
    const metrics = buildDeliveryDailyMetrics({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: null,
      platform: "yemeksepeti",
      metricDate: "2026-06-19",
      orders: [],
      reviews: [],
    });

    expect(metrics).toMatchObject({
      source_id: null,
      order_count: 0,
      cancel_count: 0,
      cancel_rate: 0,
      gross_amount: 0,
      net_amount: 0,
      discount_amount: 0,
      avg_rating: null,
      bad_review_count: 0,
      avg_prep_duration_minutes: null,
      avg_delivery_duration_minutes: null,
      dominant_topics: [],
    });
  });
});
