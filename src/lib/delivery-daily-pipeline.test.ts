import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  selected?: string;
  operation?: "upsert";
  filters: Array<[column: string, value: unknown]>;
  nullFilters: Array<[column: string, value: null]>;
  upsertPayload?: Record<string, unknown>;
  upsertOptions?: unknown;
  limitValue?: number;
};

const calls: QueryCall[] = [];
let tableErrors: Partial<Record<string, Error>> = {};

const orderRows = [
  ...Array.from({ length: 40 }, (_, index) => ({
    workspace_id: "workspace-1",
    branch_id: "branch-1",
    source_id: "source-1",
    platform: "trendyol",
    status: index < 6 ? "Cancelled" : "Delivered",
    ordered_at: `2026-06-19T10:${String(index).padStart(2, "0")}:00.000Z`,
    gross_amount: 100,
    net_amount: index < 6 ? 0 : 90,
    discount_amount: 0,
    prep_duration_minutes: 24,
    delivery_duration_minutes: 38,
  })),
];

const reviewRows = Array.from({ length: 5 }, () => ({
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  reviewed_at: "2026-06-19T12:00:00.000Z",
  rating_overall: 1,
  classification: {
    sentiment: "negative",
    topics: ["delivery_delay"],
    topic_confidence: 0.9,
    actionable: true,
  },
}));

const historyRows = [
  { metric_date: "2026-06-18", order_count: 120, cancel_rate: 0.02, net_amount: 12000, bad_review_count: 1, avg_rating: 4.1, avg_prep_duration_minutes: 18 },
  { metric_date: "2026-06-17", order_count: 122, cancel_rate: 0.021, net_amount: 12100, bad_review_count: 1, avg_rating: 4.2, avg_prep_duration_minutes: 18 },
  { metric_date: "2026-06-16", order_count: 118, cancel_rate: 0.019, net_amount: 11900, bad_review_count: 1, avg_rating: 4.1, avg_prep_duration_minutes: 17 },
  { metric_date: "2026-06-15", order_count: 121, cancel_rate: 0.02, net_amount: 12050, bad_review_count: 2, avg_rating: 4.0, avg_prep_duration_minutes: 18 },
  { metric_date: "2026-06-14", order_count: 119, cancel_rate: 0.022, net_amount: 12020, bad_review_count: 1, avg_rating: 4.2, avg_prep_duration_minutes: 19 },
];

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [], nullFilters: [] };
  calls.push(call);

  const query = {
    select: vi.fn((columns?: string) => {
      call.selected = columns;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    is: vi.fn((column: string, value: null) => {
      call.nullFilters.push([column, value]);
      return query;
    }),
    gte: vi.fn((column: string, value: unknown) => {
      call.filters.push([`${column}>=`, value]);
      return query;
    }),
    lt: vi.fn((column: string, value: unknown) => {
      call.filters.push([`${column}<`, value]);
      return query;
    }),
    order: vi.fn(() => query),
    limit: vi.fn((value: number) => {
      call.limitValue = value;
      return query;
    }),
    upsert: vi.fn((payload: Record<string, unknown>, options?: unknown) => {
      call.operation = "upsert";
      call.upsertPayload = payload;
      call.upsertOptions = options;
      return query;
    }),
    single: vi.fn(async () => {
      if (tableErrors[table]) return { data: null, error: tableErrors[table] };
      return {
        data: {
          id: "metric-1",
          created_at: "2026-06-20T00:00:00.000Z",
          ...call.upsertPayload,
        },
        error: null,
      };
    }),
    then(resolve: (value: { data: unknown[]; error: Error | null }) => void) {
      if (tableErrors[table]) {
        resolve({ data: [], error: tableErrors[table] ?? null });
        return;
      }
      if (table === "delivery_orders") {
        resolve({ data: orderRows, error: null });
        return;
      }
      if (table === "delivery_reviews") {
        resolve({ data: reviewRows, error: null });
        return;
      }
      if (table === "delivery_daily_metrics") {
        resolve({ data: historyRows, error: null });
        return;
      }
      resolve({ data: [], error: null });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadPipelineModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./delivery-daily-pipeline");
}

describe("delivery daily pipeline", () => {
  beforeEach(() => {
    calls.length = 0;
    tableErrors = {};
  });

  it("reads normalized rows, upserts daily metrics, builds a baseline, and returns candidates", async () => {
    const { runDeliveryDailyPipeline } = await loadPipelineModule();

    const result = await runDeliveryDailyPipeline({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      platform: "trendyol",
      metricDate: "2026-06-19",
      signalOptions: { now: new Date("2026-06-20T05:00:00.000Z") },
    });

    expect(result.metrics).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      platform: "trendyol",
      metric_date: "2026-06-19",
      order_count: 40,
      cancel_count: 6,
      bad_review_count: 5,
    });
    expect(result.baseline).toMatchObject({
      cancelRate: 0.02,
      netAmount: 12020,
    });
    expect(result.candidates.some((candidate) => (
      candidate.kind === "delivery_cancel_delay" &&
      candidate.topic === "delivery_delay" &&
      candidate.shouldNotify
    ))).toBe(true);

    const orderCall = calls.find((call) => call.table === "delivery_orders");
    expect(orderCall?.filters).toEqual(expect.arrayContaining([
      ["workspace_id", "workspace-1"],
      ["branch_id", "branch-1"],
      ["platform", "trendyol"],
      ["ordered_at>=", "2026-06-19T00:00:00.000Z"],
      ["ordered_at<", "2026-06-20T00:00:00.000Z"],
      ["source_id", "source-1"],
    ]));

    const upsertCall = calls.find((call) => call.table === "delivery_daily_metrics" && call.operation === "upsert");
    expect(upsertCall?.upsertOptions).toEqual({
      onConflict: "workspace_id,branch_id,source_id,platform,metric_date",
    });
  });

  it("uses a null source filter when the source id is omitted", async () => {
    const { runDeliveryDailyPipeline } = await loadPipelineModule();

    await runDeliveryDailyPipeline({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      platform: "trendyol",
      metricDate: "2026-06-19",
    });

    expect(calls.find((call) => call.table === "delivery_orders")?.nullFilters).toContainEqual(["source_id", null]);
    expect(calls.find((call) => call.table === "delivery_reviews")?.nullFilters).toContainEqual(["source_id", null]);
    expect(calls.find((call) => call.table === "delivery_daily_metrics" && !call.operation)?.nullFilters).toContainEqual(["source_id", null]);
  });

  it("surfaces normalized table read errors", async () => {
    tableErrors.delivery_orders = new Error("orders read failed");
    const { runDeliveryDailyPipeline } = await loadPipelineModule();

    await expect(runDeliveryDailyPipeline({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      platform: "trendyol",
      metricDate: "2026-06-19",
    })).rejects.toThrow("orders read failed");
  });
});
