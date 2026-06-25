import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryPartnerAuthRefRow, DeliveryPartnerSourceRow } from "./delivery-partner-sync";

type QueryCall = {
  table: string;
  selected?: string;
  filters: Array<[column: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let sourceRow: DeliveryPartnerSourceRow | null = null;
let authRefRow: DeliveryPartnerAuthRefRow | null = null;
let sourceError: Error | null = null;
let authRefError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [] };
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
    single: vi.fn(async () => {
      if (table === "sources") return { data: sourceRow, error: sourceError };
      if (table === "source_auth_refs") return { data: authRefRow, error: authRefError };
      return { data: null, error: null };
    }),
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadDeliveryPartnerSyncModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./delivery-partner-sync");
}

describe("delivery partner sync shell", () => {
  beforeEach(() => {
    calls.length = 0;
    sourceError = null;
    authRefError = null;
    sourceRow = {
      id: "source-1",
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      type: "trendyol",
      display_name: "Trendyol Go",
      status: "pending",
      config: {
        supplier_id: "supplier-1",
        store_id: "store-1",
        sync_window_days: 7,
      },
    };
    authRefRow = {
      id: "auth-ref-1",
      workspace_id: "workspace-1",
      source_id: "source-1",
      provider: "trendyol",
      vault_ref: "vault://sources/source-1/trendyol",
      required_fields: ["apiKey", "apiSecretKey"],
      provided_fields: ["apiKey", "apiSecretKey"],
      status: "ready",
      last_verified_at: "2026-06-21T07:00:00.000Z",
    };
  });

  it("loads a ready delivery source sync plan without auth values", async () => {
    const { loadDeliveryPartnerSyncPlan } = await loadDeliveryPartnerSyncModule();

    await expect(loadDeliveryPartnerSyncPlan({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      now: new Date("2026-06-21T10:00:00.000Z"),
    })).resolves.toMatchObject({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      provider: "trendyol",
      externalStoreId: "store-1",
      auth: {
        vaultRef: "vault://sources/source-1/trendyol",
        requiredFields: ["apiKey", "apiSecretKey"],
        providedFields: ["apiKey", "apiSecretKey"],
        missingFields: [],
        status: "ready",
      },
      window: {
        start: "2026-06-14T10:00:00.000Z",
        end: "2026-06-21T10:00:00.000Z",
      },
    });

    const sourceCall = calls.find((call) => call.table === "sources");
    expect(sourceCall?.filters).toEqual([
      ["id", "source-1"],
      ["workspace_id", "workspace-1"],
    ]);

    const authCall = calls.find((call) => call.table === "source_auth_refs");
    expect(authCall?.filters).toEqual([
      ["workspace_id", "workspace-1"],
      ["source_id", "source-1"],
      ["provider", "trendyol"],
    ]);
  });

  it("builds Getir plans with restaurant id fallback and bounded sync windows", async () => {
    const { buildDeliveryPartnerSyncPlan } = await loadDeliveryPartnerSyncModule();

    sourceRow = {
      ...sourceRow!,
      type: "getir",
      config: {
        restaurant_ids: ["restaurant-1"],
        sync_window_days: 90,
      },
    };
    authRefRow = {
      ...authRefRow!,
      provider: "getir",
      vault_ref: "vault://sources/source-1/getir",
      required_fields: ["appSecretKey", "restaurantSecretKey"],
      provided_fields: ["appSecretKey", "restaurantSecretKey"],
    };

    expect(buildDeliveryPartnerSyncPlan({
      source: sourceRow,
      authRef: authRefRow,
      provider: "getir",
      now: new Date("2026-06-21T00:00:00.000Z"),
    })).toMatchObject({
      provider: "getir",
      externalStoreId: "restaurant-1",
      window: {
        start: "2026-05-22T00:00:00.000Z",
        end: "2026-06-21T00:00:00.000Z",
      },
    });
  });

  it("allows connection discovery plans before a delivery store is mapped", async () => {
    const { buildDeliveryPartnerSyncPlan, DeliveryPartnerSyncError } = await loadDeliveryPartnerSyncModule();
    sourceRow = {
      ...sourceRow!,
      config: {
        supplier_id: "supplier-1",
        sync_window_days: 7,
      },
    };

    expect(() => buildDeliveryPartnerSyncPlan({
      source: sourceRow!,
      authRef: authRefRow!,
      provider: "trendyol",
      now: new Date("2026-06-21T00:00:00.000Z"),
    })).toThrow(DeliveryPartnerSyncError);

    expect(buildDeliveryPartnerSyncPlan({
      source: sourceRow!,
      authRef: authRefRow!,
      provider: "trendyol",
      now: new Date("2026-06-21T00:00:00.000Z"),
      requireExternalStoreId: false,
    })).toMatchObject({
      provider: "trendyol",
      externalStoreId: "",
      config: {
        supplier_id: "supplier-1",
      },
    });
  });

  it("blocks sync plans when auth refs are incomplete", async () => {
    const { buildDeliveryPartnerSyncPlan, DeliveryPartnerSyncError } = await loadDeliveryPartnerSyncModule();
    authRefRow = {
      ...authRefRow!,
      provided_fields: ["apiKey"],
      status: "pending",
    };

    expect(() => buildDeliveryPartnerSyncPlan({
      source: sourceRow!,
      authRef: authRefRow!,
      provider: "trendyol",
      now: new Date("2026-06-21T00:00:00.000Z"),
    })).toThrow(DeliveryPartnerSyncError);
  });

  it("resolves auth material only through an injected resolver", async () => {
    const { loadDeliveryPartnerSyncPlan, resolveDeliveryAuthMaterial } = await loadDeliveryPartnerSyncModule();
    const plan = await loadDeliveryPartnerSyncPlan({
      workspaceId: "workspace-1",
      sourceId: "source-1",
      now: new Date("2026-06-21T10:00:00.000Z"),
    });
    const resolver = {
      resolve: vi.fn(async () => ({
        apiKey: "placeholder-api-key",
        apiSecretKey: "placeholder-api-secret",
      })),
    };

    await expect(resolveDeliveryAuthMaterial(plan, resolver)).resolves.toEqual({
      apiKey: "placeholder-api-key",
      apiSecretKey: "placeholder-api-secret",
    });
    expect(resolver.resolve).toHaveBeenCalledWith({
      vaultRef: "vault://sources/source-1/trendyol",
      fields: ["apiKey", "apiSecretKey"],
    });
  });

  it("rejects missing sources", async () => {
    sourceRow = null;
    const { loadDeliveryPartnerSyncPlan, DeliveryPartnerSyncNotFoundError } = await loadDeliveryPartnerSyncModule();

    await expect(loadDeliveryPartnerSyncPlan({
      workspaceId: "workspace-1",
      sourceId: "missing-source",
    })).rejects.toBeInstanceOf(DeliveryPartnerSyncNotFoundError);
  });
});
