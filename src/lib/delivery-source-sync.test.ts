import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryPartnerSyncPlan } from "./delivery-partner-sync";

const plan: DeliveryPartnerSyncPlan = {
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  provider: "trendyol",
  displayName: "Trendyol Go",
  externalStoreId: "store-1",
  config: { supplier_id: "supplier-1", store_id: "store-1" },
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

const loadDeliveryPartnerSyncPlan = vi.fn();
const syncDeliveryPartnerSource = vi.fn();

vi.mock("./delivery-partner-sync", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delivery-partner-sync")>();
  return {
    ...original,
    loadDeliveryPartnerSyncPlan,
  };
});

vi.mock("./delivery-partner-ingest", () => ({
  syncDeliveryPartnerSource,
}));

describe("delivery source sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDeliveryPartnerSyncPlan.mockResolvedValue(plan);
    syncDeliveryPartnerSource.mockResolvedValue({
      provider: "trendyol",
      sourceId: "source-1",
      fetchedOrders: 2,
      fetchedReviews: 1,
      persistedOrders: 2,
      persistedReviews: 1,
    });
  });

  it("loads a source sync plan and runs partner ingest", async () => {
    const { syncDeliverySource } = await import("./delivery-source-sync");
    const resolver = { resolve: vi.fn() };
    const http = { request: vi.fn() };

    await expect(syncDeliverySource({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver,
      http,
      observedAt: "2026-06-21T00:00:00.000Z",
    })).resolves.toEqual({
      status: "synced",
      provider: "trendyol",
      sourceId: "source-1",
      fetchedOrders: 2,
      fetchedReviews: 1,
      persistedOrders: 2,
      persistedReviews: 1,
    });

    expect(loadDeliveryPartnerSyncPlan).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      sourceId: "source-1",
    });
    expect(syncDeliveryPartnerSource).toHaveBeenCalledWith(expect.objectContaining({
      plan,
      resolver,
      http,
      observedAt: "2026-06-21T00:00:00.000Z",
    }));
  });

  it("skips sources without auth refs by default", async () => {
    const { DeliveryPartnerSyncNotFoundError } = await import("./delivery-partner-sync");
    loadDeliveryPartnerSyncPlan.mockRejectedValue(new DeliveryPartnerSyncNotFoundError("missing"));
    const { syncDeliverySource } = await import("./delivery-source-sync");

    await expect(syncDeliverySource({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver: { resolve: vi.fn() },
      http: { request: vi.fn() },
    })).resolves.toEqual({
      status: "skipped",
      sourceId: "source-1",
      reason: "missing_auth_ref",
    });
  });

  it("can fail hard when auth refs are required", async () => {
    const { DeliveryPartnerSyncNotFoundError } = await import("./delivery-partner-sync");
    loadDeliveryPartnerSyncPlan.mockRejectedValue(new DeliveryPartnerSyncNotFoundError("missing"));
    const { syncDeliverySource } = await import("./delivery-source-sync");

    await expect(syncDeliverySource({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      resolver: { resolve: vi.fn() },
      http: { request: vi.fn() },
      skipWhenAuthMissing: false,
    })).rejects.toBeInstanceOf(DeliveryPartnerSyncNotFoundError);
  });
});
