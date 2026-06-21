import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryPartnerHttpClient, DeliveryPartnerHttpRequest } from "./delivery-partner-ingest";
import type { DeliveryPartnerSyncPlan } from "./delivery-partner-sync";

const trendyolPlan: DeliveryPartnerSyncPlan = {
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  provider: "trendyol",
  displayName: "Trendyol Go",
  externalStoreId: "store-1",
  config: { supplier_id: "supplier-1", store_id: "store-1" },
  auth: {
    vaultRef: "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000",
    requiredFields: ["apiKey", "apiSecretKey"],
    providedFields: ["apiKey", "apiSecretKey"],
    missingFields: [],
    status: "ready",
  },
  window: {
    start: "2026-06-18T00:00:00.000Z",
    end: "2026-06-21T00:00:00.000Z",
  },
  endpoints: [],
};

const loadDeliveryPartnerSyncPlan = vi.fn();

vi.mock("./delivery-partner-sync", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delivery-partner-sync")>();
  return {
    ...original,
    loadDeliveryPartnerSyncPlan,
  };
});

describe("delivery source connection test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDeliveryPartnerSyncPlan.mockResolvedValue(trendyolPlan);
  });

  it("tests Trendyol review stats without exposing auth material", async () => {
    const { testDeliverySourceConnection } = await import("./delivery-source-connection-test");
    const resolver = {
      resolve: vi.fn(async () => ({
        apiKey: "example-api-key",
        apiSecretKey: "example-api-secret",
      })),
    };
    const requestMock = vi.fn(async (_request: DeliveryPartnerHttpRequest) => ({ overall: 4.2, restaurantName: "Moda Store" }));
    const http: DeliveryPartnerHttpClient = {
      async request<T = unknown>(request: DeliveryPartnerHttpRequest) {
        return await requestMock(request) as T;
      },
    };

    await expect(testDeliverySourceConnection({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver,
      http,
      checkedAt: "2026-06-21T12:00:00.000Z",
    })).resolves.toEqual({
      status: "ready",
      provider: "trendyol",
      sourceId: "source-1",
      checkedAt: "2026-06-21T12:00:00.000Z",
      checks: [{ id: "review_stats", status: "ok" }],
      store_candidates: [{ external_id: "store-1", name: "Moda Store" }],
    });

    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      path: "/integrator/review/meal/suppliers/supplier-1/stores/store-1/reviews/stats",
      headers: expect.objectContaining({
        "User-Agent": "ObserverAI/1.0",
      }),
    }));
    expect(JSON.stringify(await testDeliverySourceConnection({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver,
      http,
      checkedAt: "2026-06-21T12:00:00.000Z",
    }))).not.toContain("example-api-secret");
  });

  it("tests Getir auth and restaurant list", async () => {
    loadDeliveryPartnerSyncPlan.mockResolvedValue({
      ...trendyolPlan,
      provider: "getir",
      displayName: "Getir Moda",
      externalStoreId: "restaurant-1",
      config: { restaurant_id: "restaurant-1" },
      auth: {
        vaultRef: "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000",
        requiredFields: ["appSecretKey", "restaurantSecretKey"],
        providedFields: ["appSecretKey", "restaurantSecretKey"],
        missingFields: [],
        status: "ready",
      },
    });
    const { testDeliverySourceConnection } = await import("./delivery-source-connection-test");
    const resolver = {
      resolve: vi.fn(async () => ({
        appSecretKey: "example-app-secret",
        restaurantSecretKey: "example-restaurant-secret",
      })),
    };
    const requestMock = vi.fn(async (request: DeliveryPartnerHttpRequest) => {
        if (request.path === "/auth/login") return { token: "example-session-token" };
        return { restaurants: [{ id: "restaurant-1", name: "Getir Moda", status: "open" }] };
    });
    const http: DeliveryPartnerHttpClient = {
      async request<T = unknown>(request: DeliveryPartnerHttpRequest) {
        return await requestMock(request) as T;
      },
    };

    await expect(testDeliverySourceConnection({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver,
      http,
      checkedAt: "2026-06-21T12:00:00.000Z",
    })).resolves.toMatchObject({
      status: "ready",
      provider: "getir",
      checks: [
        { id: "auth", status: "ok" },
        { id: "restaurants", status: "ok", item_count: 1 },
      ],
      store_candidates: [{ external_id: "restaurant-1", name: "Getir Moda", status: "open" }],
    });
  });
});
