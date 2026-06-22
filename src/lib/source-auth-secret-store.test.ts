import { beforeEach, describe, expect, it, vi } from "vitest";

type RpcCall = {
  name: string;
  args: Record<string, unknown>;
};

const rpcCalls: RpcCall[] = [];
let rpcData: unknown = "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000";
let rpcError: Error | null = null;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { data: rpcData, error: rpcError };
    }),
  })),
}));

async function loadSecretStoreModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./source-auth-secret-store");
}

describe("source auth secret store", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    rpcData = "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000";
    rpcError = null;
  });

  it("normalizes only required source auth fields", async () => {
    const { normalizeAuthMaterial } = await loadSecretStoreModule();

    expect(normalizeAuthMaterial("trendyol", {
      apiKey: " example-key ",
      apiSecretKey: " example-secret ",
      supplierid: "not-secret-config",
    })).toEqual({
      material: {
        apiKey: "example-key",
        apiSecretKey: "example-secret",
      },
      requiredFields: ["apiKey", "apiSecretKey"],
      providedFields: ["apiKey", "apiSecretKey"],
    });

    expect(normalizeAuthMaterial("ga4", {
      serviceAccountJson: " {\"type\":\"service_account\"} ",
      service_account_email: "drop-me@example.com",
    })).toEqual({
      material: {
        serviceAccountJson: "{\"type\":\"service_account\"}",
      },
      requiredFields: ["serviceAccountJson"],
      providedFields: ["serviceAccountJson"],
    });
  });

  it("stores complete auth material and returns only a vault reference summary", async () => {
    const { storeSourceAuthMaterial } = await loadSecretStoreModule();

    await expect(storeSourceAuthMaterial("workspace-1", {
      sourceId: "source-1",
      provider: "getir",
      material: {
        appSecretKey: "example-app-secret",
        restaurantSecretKey: "example-restaurant-secret",
        ignored: "drop-me",
      },
    })).resolves.toEqual({
      vaultRef: "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000",
      requiredFields: ["appSecretKey", "restaurantSecretKey"],
      providedFields: ["appSecretKey", "restaurantSecretKey"],
    });

    expect(rpcCalls).toEqual([{
      name: "source_auth_vault_store",
      args: {
        p_workspace_id: "workspace-1",
        p_source_id: "source-1",
        p_provider: "getir",
        p_secret: {
          appSecretKey: "example-app-secret",
          restaurantSecretKey: "example-restaurant-secret",
        },
      },
    }]);
  });

  it("rejects incomplete auth material before calling the secret store", async () => {
    const { storeSourceAuthMaterial, SourceAuthSecretStoreError } = await loadSecretStoreModule();

    await expect(storeSourceAuthMaterial("workspace-1", {
      sourceId: "source-1",
      provider: "trendyol",
      material: { apiKey: "example-key" },
    })).rejects.toBeInstanceOf(SourceAuthSecretStoreError);

    expect(rpcCalls).toEqual([]);
  });

  it("resolves only requested fields from a Supabase Vault ref", async () => {
    rpcData = {
      apiKey: "example-key",
      apiSecretKey: "example-secret",
      ignored: "drop-me",
    };
    const { resolveSourceAuthMaterialFromVault } = await loadSecretStoreModule();

    await expect(resolveSourceAuthMaterialFromVault({
      vaultRef: "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000",
      fields: ["apiKey", "apiSecretKey"],
    })).resolves.toEqual({
      apiKey: "example-key",
      apiSecretKey: "example-secret",
    });

    expect(rpcCalls[0]).toEqual({
      name: "source_auth_vault_read",
      args: {
        p_vault_ref: "supabase-vault://source-auth/123e4567-e89b-12d3-a456-426614174000",
      },
    });
  });
});
