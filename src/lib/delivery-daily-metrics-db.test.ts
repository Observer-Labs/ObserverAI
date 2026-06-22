import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryDailyMetricInsert } from "./delivery-daily-metrics";

type QueryCall = {
  table: string;
  upsertPayload?: unknown;
  upsertOptions?: unknown;
  selected?: string;
};

const calls: QueryCall[] = [];
let upsertError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table };
  calls.push(call);

  const query = {
    upsert: vi.fn((payload: unknown, options?: unknown) => {
      call.upsertPayload = payload;
      call.upsertOptions = options;
      return query;
    }),
    select: vi.fn((columns?: string) => {
      call.selected = columns;
      return query;
    }),
    single: vi.fn(async () => {
      if (upsertError) return { data: null, error: upsertError };
      return {
        data: {
          id: "metric-1",
          created_at: "2026-06-20T00:00:00.000Z",
          ...(call.upsertPayload as Record<string, unknown>),
        },
        error: null,
      };
    }),
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadDeliveryDailyMetricsModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./delivery-daily-metrics");
}

const metric: DeliveryDailyMetricInsert = {
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  metric_date: "2026-06-19",
  order_count: 40,
  cancel_count: 6,
  cancel_rate: 0.15,
  gross_amount: 4000,
  net_amount: 3060,
  discount_amount: 100,
  avg_rating: 2.1,
  bad_review_count: 5,
  avg_prep_duration_minutes: 24,
  avg_delivery_duration_minutes: 38,
  dominant_topics: [{ topic: "delivery_delay", count: 5, confidence: 0.9 }],
};

describe("delivery daily metrics persistence", () => {
  beforeEach(() => {
    calls.length = 0;
    upsertError = null;
  });

  it("upserts delivery daily metrics with the source-scoped idempotency key", async () => {
    const { upsertDeliveryDailyMetrics } = await loadDeliveryDailyMetricsModule();

    await expect(upsertDeliveryDailyMetrics(metric)).resolves.toMatchObject({
      id: "metric-1",
      workspace_id: "workspace-1",
      source_id: "source-1",
      platform: "trendyol",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: "delivery_daily_metrics",
      upsertPayload: metric,
      upsertOptions: {
        onConflict: "workspace_id,branch_id,source_id,platform,metric_date",
      },
      selected: "*",
    });
  });

  it("builds and persists aggregate metrics in one pipeline step", async () => {
    const { buildAndUpsertDeliveryDailyMetrics } = await loadDeliveryDailyMetricsModule();

    await buildAndUpsertDeliveryDailyMetrics({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      platform: "trendyol",
      metricDate: "2026-06-19",
      orders: [
        {
          workspace_id: "workspace-1",
          branch_id: "branch-1",
          source_id: "source-1",
          platform: "trendyol",
          status: "Cancelled",
          ordered_at: "2026-06-19T10:00:00.000Z",
          gross_amount: 100,
          net_amount: 0,
          discount_amount: 0,
          prep_duration_minutes: 22,
          delivery_duration_minutes: null,
        },
      ],
      reviews: [],
    });

    expect(calls[0].upsertPayload).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      platform: "trendyol",
      metric_date: "2026-06-19",
      order_count: 1,
      cancel_count: 1,
      cancel_rate: 1,
    });
  });

  it("surfaces persistence errors", async () => {
    upsertError = new Error("upsert failed");
    const { upsertDeliveryDailyMetrics } = await loadDeliveryDailyMetricsModule();

    await expect(upsertDeliveryDailyMetrics(metric)).rejects.toThrow("upsert failed");
  });
});
