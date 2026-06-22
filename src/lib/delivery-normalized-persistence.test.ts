import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryOrderInsert, DeliveryReviewInsert } from "./delivery-normalized-persistence";

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
    then: undefined,
  };

  Object.assign(query, {
    select: vi.fn(async (columns?: string) => {
      call.selected = columns;
      if (upsertError) return { data: null, error: upsertError };
      return { data: call.upsertPayload, error: null };
    }),
  });

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadPersistenceModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./delivery-normalized-persistence");
}

const order: DeliveryOrderInsert = {
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  external_order_id: "order-1",
  external_store_id: "store-1",
  status: "Delivered",
  ordered_at: "2026-06-21T08:00:00.000Z",
  updated_at: "2026-06-21T09:00:00.000Z",
  gross_amount: 100,
  net_amount: 90,
  discount_amount: 10,
  payment_type: "card",
  payment_provider: null,
  cancel_reason: null,
  prep_duration_minutes: 20,
  delivery_duration_minutes: null,
  raw_ref: {},
};

const review: DeliveryReviewInsert = {
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  source_id: "source-1",
  platform: "trendyol",
  external_review_id: "review-1",
  external_order_id: "order-1",
  external_store_id: "store-1",
  reviewed_at: "2026-06-21T10:00:00.000Z",
  rating_overall: 2,
  rating_food: 2,
  rating_service: 2,
  rating_delivery: 1,
  comment_text: "Late delivery.",
  answer_status: null,
  classification: {},
  raw_ref: {},
};

describe("delivery normalized persistence", () => {
  beforeEach(() => {
    calls.length = 0;
    upsertError = null;
  });

  it("upserts normalized orders by source-independent external order identity", async () => {
    const { upsertDeliveryOrders } = await loadPersistenceModule();

    await expect(upsertDeliveryOrders([order])).resolves.toEqual([order]);
    expect(calls[0]).toMatchObject({
      table: "delivery_orders",
      upsertPayload: [order],
      upsertOptions: { onConflict: "workspace_id,platform,external_order_id" },
      selected: "*",
    });
  });

  it("upserts normalized reviews and skips rows without external review ids", async () => {
    const { upsertDeliveryReviews } = await loadPersistenceModule();

    await expect(upsertDeliveryReviews([
      review,
      { ...review, external_review_id: null },
    ])).resolves.toEqual([review]);
    expect(calls[0]).toMatchObject({
      table: "delivery_reviews",
      upsertPayload: [review],
      upsertOptions: { onConflict: "workspace_id,platform,external_review_id" },
      selected: "*",
    });
  });

  it("does not query when rows are empty", async () => {
    const { upsertDeliveryOrders, upsertDeliveryReviews } = await loadPersistenceModule();

    await expect(upsertDeliveryOrders([])).resolves.toEqual([]);
    await expect(upsertDeliveryReviews([])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("surfaces persistence errors", async () => {
    upsertError = new Error("delivery upsert failed");
    const { upsertDeliveryOrders } = await loadPersistenceModule();

    await expect(upsertDeliveryOrders([order])).rejects.toThrow("delivery upsert failed");
  });
});
