import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "select" | "upsert" | "update";

type QueryCall = {
  table: string;
  operation?: QueryOperation;
  selected?: string;
  upsertPayload?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
  upsertOptions?: Record<string, unknown>;
  filters: Array<[column: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let sourceLookup: { id: string; workspace_id: string } | null = {
  id: "source-1",
  workspace_id: "workspace-1",
};
let sourceError: Error | null = null;
let authError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [] };
  calls.push(call);

  const query = {
    select: vi.fn((columns?: string) => {
      call.operation = call.operation ?? "select";
      call.selected = columns;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    upsert: vi.fn((payload: Record<string, unknown>, options?: Record<string, unknown>) => {
      call.operation = "upsert";
      call.upsertPayload = payload;
      call.upsertOptions = options;
      return query;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      call.operation = "update";
      call.updatePayload = payload;
      return query;
    }),
    single: vi.fn(async () => {
      if (table === "sources" && call.operation !== "update") {
        return { data: sourceLookup, error: sourceError };
      }

      if (table === "source_auth_refs") {
        if (authError) return { data: null, error: authError };
        return {
          data: {
            id: "auth-ref-1",
            created_at: "2026-06-21T00:00:00.000Z",
            ...call.upsertPayload,
          },
          error: null,
        };
      }

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

async function loadSourceAuthRefsModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./source-auth-refs");
}

describe("source auth refs", () => {
  beforeEach(() => {
    calls.length = 0;
    sourceLookup = { id: "source-1", workspace_id: "workspace-1" };
    sourceError = null;
    authError = null;
  });

  it("builds delivery auth summaries from connector required fields", async () => {
    const { buildSourceAuthSummary } = await loadSourceAuthRefsModule();

    expect(buildSourceAuthSummary({
      provider: "trendyol",
      vaultRef: "vault://sources/source-1/trendyol",
      providedFields: ["apiKey"],
    })).toEqual({
      mode: "vault_ref",
      provider: "trendyol",
      vault_ref: "vault://sources/source-1/trendyol",
      required_fields: ["apiKey", "apiSecretKey"],
      provided_fields: ["apiKey"],
      status: "pending",
    });
  });

  it("marks summaries ready when all required fields are present", async () => {
    const { buildSourceAuthSummary } = await loadSourceAuthRefsModule();

    expect(buildSourceAuthSummary({
      provider: "getir",
      vaultRef: "supabase-vault://source-auth/getir-source-1",
      providedFields: ["appSecretKey", "restaurantSecretKey", "ignored"],
    })).toMatchObject({
      status: "ready",
      required_fields: ["appSecretKey", "restaurantSecretKey"],
      provided_fields: ["appSecretKey", "restaurantSecretKey"],
    });
  });

  it("rejects refs that are not opaque vault references", async () => {
    const { sanitizeVaultRef, SourceAuthRefError } = await loadSourceAuthRefsModule();

    expect(() => sanitizeVaultRef("raw=value")).toThrow(SourceAuthRefError);
    expect(() => sanitizeVaultRef("vault://sources/source 1/getir")).toThrow(SourceAuthRefError);
    expect(() => sanitizeVaultRef("vault://sources/source-1/getir")).not.toThrow();
  });

  it("upserts auth ref rows and mirrors only metadata to source credentials", async () => {
    const { upsertSourceAuthRef } = await loadSourceAuthRefsModule();

    await expect(upsertSourceAuthRef("workspace-1", {
      sourceId: "source-1",
      provider: "trendyol",
      vaultRef: "vercel://env/TRENDYOL_SOURCE_1",
      providedFields: ["apiKey", "apiSecretKey"],
      lastVerifiedAt: "2026-06-21T07:30:00.000Z",
    })).resolves.toMatchObject({
      authRef: {
        id: "auth-ref-1",
        workspace_id: "workspace-1",
        source_id: "source-1",
        provider: "trendyol",
        vault_ref: "vercel://env/TRENDYOL_SOURCE_1",
        status: "ready",
      },
      sourceCredentials: {
        mode: "vault_ref",
        provider: "trendyol",
        vault_ref: "vercel://env/TRENDYOL_SOURCE_1",
        status: "ready",
      },
    });

    const sourceSelect = calls.find((call) => call.table === "sources" && call.selected === "id, workspace_id");
    expect(sourceSelect?.filters).toEqual([
      ["id", "source-1"],
      ["workspace_id", "workspace-1"],
    ]);

    const authUpsert = calls.find((call) => call.table === "source_auth_refs" && call.operation === "upsert");
    expect(authUpsert?.upsertOptions).toEqual({ onConflict: "source_id,provider" });
    expect(authUpsert?.upsertPayload).toEqual({
      workspace_id: "workspace-1",
      source_id: "source-1",
      provider: "trendyol",
      vault_ref: "vercel://env/TRENDYOL_SOURCE_1",
      required_fields: ["apiKey", "apiSecretKey"],
      provided_fields: ["apiKey", "apiSecretKey"],
      status: "ready",
      last_verified_at: "2026-06-21T07:30:00.000Z",
    });

    const sourceUpdate = calls.find((call) => call.table === "sources" && call.operation === "update");
    expect(sourceUpdate?.updatePayload).toEqual({
      credentials: {
        mode: "vault_ref",
        provider: "trendyol",
        vault_ref: "vercel://env/TRENDYOL_SOURCE_1",
        required_fields: ["apiKey", "apiSecretKey"],
        provided_fields: ["apiKey", "apiSecretKey"],
        status: "ready",
      },
    });
  });

  it("rejects auth refs for sources outside the workspace", async () => {
    sourceLookup = null;
    const { upsertSourceAuthRef, SourceAuthRefNotFoundError } = await loadSourceAuthRefsModule();

    await expect(upsertSourceAuthRef("workspace-1", {
      sourceId: "missing-source",
      provider: "getir",
      vaultRef: "vault://sources/missing-source/getir",
      providedFields: [],
    })).rejects.toBeInstanceOf(SourceAuthRefNotFoundError);
  });
});
