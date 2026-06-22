import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryPartnerSyncPlan } from "./delivery-partner-sync";

const plan: DeliveryPartnerSyncPlan = {
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  provider: "trendyol",
  displayName: "Trendyol Go",
  externalStoreId: "store-1",
  config: {
    supplier_id: "supplier-1",
    store_id: "store-1",
    sync_window_days: 3,
  },
  auth: {
    vaultRef: "vault://sources/source-1/trendyol",
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

const http = {
  request: vi.fn(),
};
const resolver = {
  resolve: vi.fn(),
};
const persister = {
  upsertOrders: vi.fn(),
  upsertReviews: vi.fn(),
};

describe("delivery partner ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolver.resolve.mockResolvedValue({
      apiKey: "example-api-key",
      apiSecretKey: "example-api-secret",
      appSecretKey: "example-app-secret",
      restaurantSecretKey: "example-restaurant-secret",
    });
    persister.upsertOrders.mockImplementation(async (rows) => rows);
    persister.upsertReviews.mockImplementation(async (rows) => rows);
  });

  it("fetches Trendyol packages and reviews, then persists normalized rows", async () => {
    http.request
      .mockResolvedValueOnce({
        content: [
          {
            id: "package-1",
            orderId: "order-1",
            storeId: "store-1",
            packageStatus: "Delivered",
            packageCreationDate: 1781956800000,
            totalPrice: 120,
            payment: { paymentType: "CARD" },
          },
        ],
      })
      .mockResolvedValueOnce({
        reviews: [
          {
            reviewId: "review-1",
            restaurantId: "store-1",
            orderParentId: "order-1",
            createdDate: 1781960400000,
            rating: { average: 2, deliveryScore: 1 },
            comment: { text: "Late delivery." },
          },
        ],
      });
    const { syncDeliveryPartnerSource } = await import("./delivery-partner-ingest");

    await expect(syncDeliveryPartnerSource({
      plan,
      resolver,
      http,
      persister,
      observedAt: "2026-06-21T00:00:00.000Z",
    })).resolves.toEqual({
      provider: "trendyol",
      sourceId: "source-1",
      fetchedOrders: 1,
      fetchedReviews: 1,
      persistedOrders: 1,
      persistedReviews: 1,
    });

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      path: "/integrator/order/meal/suppliers/supplier-1/packages",
      headers: expect.objectContaining({ "User-Agent": "ObserverAI/1.0" }),
      query: {
        startDate: "2026-06-18T00:00:00.000Z",
        endDate: "2026-06-21T00:00:00.000Z",
        storeId: "store-1",
      },
    }));
    expect(persister.upsertOrders).toHaveBeenCalledWith([
      expect.objectContaining({
        workspace_id: "workspace-1",
        branch_id: "branch-1",
        source_id: "source-1",
        platform: "trendyol",
        external_order_id: "order-1",
      }),
    ]);
    expect(persister.upsertReviews).toHaveBeenCalledWith([
      expect.objectContaining({
        platform: "trendyol",
        external_review_id: "review-1",
        comment_text: "Late delivery.",
      }),
    ]);
  });

  it("fetches Getir auth, order details, and reviews", async () => {
    http.request
      .mockResolvedValueOnce({ data: { token: "runtime-session-token" } })
      .mockResolvedValueOnce({
        data: [
          {
            id: "getir-order-1",
            status: "cancelled",
            restaurant: { id: "restaurant-1" },
            checkoutDate: "2026-06-20T08:00:00.000Z",
            totalPrice: 200,
            totalDiscountedPrice: 180,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "getir-review-1",
            foodOrderId: "getir-order-1",
            restaurantId: "restaurant-1",
            createdAt: "2026-06-20T09:00:00.000Z",
            rating: 1,
            comment: "Order was cancelled.",
          },
        ],
      });
    const { syncDeliveryPartnerSource } = await import("./delivery-partner-ingest");

    await expect(syncDeliveryPartnerSource({
      plan: {
        ...plan,
        provider: "getir",
        externalStoreId: "restaurant-1",
        config: { restaurant_id: "restaurant-1", sync_window_days: 3 },
        auth: {
          vaultRef: "vault://sources/source-1/getir",
          requiredFields: ["appSecretKey", "restaurantSecretKey"],
          providedFields: ["appSecretKey", "restaurantSecretKey"],
          missingFields: [],
          status: "ready",
        },
      },
      resolver,
      http,
      persister,
      observedAt: "2026-06-21T00:00:00.000Z",
    })).resolves.toMatchObject({
      provider: "getir",
      fetchedOrders: 1,
      fetchedReviews: 1,
    });

    expect(http.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: "POST",
      path: "/auth/login",
    }));
    expect(http.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      method: "GET",
      path: "/food-orders/report/details",
      query: expect.objectContaining({ restaurantIds: "restaurant-1" }),
    }));
    expect(persister.upsertOrders).toHaveBeenCalledWith([
      expect.objectContaining({
        platform: "getir",
        external_order_id: "getir-order-1",
        net_amount: 180,
      }),
    ]);
    expect(persister.upsertReviews).toHaveBeenCalledWith([
      expect.objectContaining({
        platform: "getir",
        external_review_id: "getir-review-1",
        rating_overall: 1,
      }),
    ]);
  });

  it("fails Getir sync when auth response has no runtime token", async () => {
    http.request.mockResolvedValueOnce({});
    const { syncDeliveryPartnerSource, DeliveryPartnerIngestError } = await import("./delivery-partner-ingest");

    await expect(syncDeliveryPartnerSource({
      plan: {
        ...plan,
        provider: "getir",
        externalStoreId: "restaurant-1",
        auth: {
          vaultRef: "vault://sources/source-1/getir",
          requiredFields: ["appSecretKey", "restaurantSecretKey"],
          providedFields: ["appSecretKey", "restaurantSecretKey"],
          missingFields: [],
          status: "ready",
        },
      },
      resolver,
      http,
      persister,
    })).rejects.toBeInstanceOf(DeliveryPartnerIngestError);
  });
});
