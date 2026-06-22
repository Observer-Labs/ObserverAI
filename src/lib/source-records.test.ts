import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "insert" | "update";

type QueryCall = {
  table: string;
  operation?: QueryOperation;
  selected?: string;
  insertPayload?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
  filters: Array<[column: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let branchLookup: { id: string; status: "active" | "paused" } | null = {
  id: "branch-1",
  status: "active",
};
let branchError: Error | null = null;
let sourceError: Error | null = null;
let existingSource: { id: string } | null = null;

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
    insert: vi.fn((payload: Record<string, unknown>) => {
      call.operation = "insert";
      call.insertPayload = payload;
      return query;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      call.operation = "update";
      call.updatePayload = payload;
      return query;
    }),
    maybeSingle: vi.fn(async () => {
      if (table === "sources") {
        return { data: existingSource, error: null };
      }

      return { data: null, error: null };
    }),
    single: vi.fn(async () => {
      if (table === "branches") {
        return { data: branchLookup, error: branchError };
      }

      if (table === "sources" && call.operation === "insert") {
        if (sourceError) return { data: null, error: sourceError };
        return {
          data: {
            id: "source-1",
            created_at: "2026-06-20T00:00:00.000Z",
            ...call.insertPayload,
          },
          error: null,
        };
      }

      if (table === "sources" && call.operation === "update") {
        if (sourceError) return { data: null, error: sourceError };
        return {
          data: {
            id: existingSource?.id ?? "source-existing",
            created_at: "2026-06-20T00:00:00.000Z",
            ...call.updatePayload,
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

async function loadSourceRecordsModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./source-records");
}

describe("source record helpers", () => {
  beforeEach(() => {
    calls.length = 0;
    branchLookup = { id: "branch-1", status: "active" };
    branchError = null;
    sourceError = null;
    existingSource = null;
  });

  it("sanitizes Trendyol source config and keeps delivery sources pending", async () => {
    const { parseSourceInput } = await loadSourceRecordsModule();

    expect(parseSourceInput({
      branch_id: " branch-1 ",
      type: "trendyol",
      display_name: " Trendyol Go ",
      config: {
        supplier_id: " supplier-1 ",
        store_id: " store-1 ",
        sync_window_days: 14,
        ignored_note: "drop-me",
      },
    })).toEqual({
      branch_id: "branch-1",
      type: "trendyol",
      display_name: "Trendyol Go",
      status: "pending",
      config: {
        supplier_id: "supplier-1",
        store_id: "store-1",
        sync_window_days: 14,
      },
    });
  });

  it("rejects credential-like fields in nested source config", async () => {
    const { parseSourceInput, SourceValidationError } = await loadSourceRecordsModule();

    expect(() => parseSourceInput({
      branch_id: "branch-1",
      type: "getir",
      display_name: "Getir",
      config: {
        restaurant_id: "restaurant-1",
        auth: { apiKey: "placeholder" },
      },
    })).toThrow(SourceValidationError);
  });

  it("keeps only non-sensitive Yemeksepeti setup fields", async () => {
    const { parseSourceInput } = await loadSourceRecordsModule();

    expect(parseSourceInput({
      branch_id: "branch-1",
      type: "yemeksepeti",
      display_name: "Yemeksepeti",
      config: {
        vendor_id: " vendor-1 ",
        store_id: " store-2 ",
        sync_window_days: 7,
        callback_url: "https://example.com/callback",
      },
    }).config).toEqual({
      vendor_id: "vendor-1",
      store_id: "store-2",
      sync_window_days: 7,
    });
  });

  it("sanitizes GA4 config and rejects service account key fields", async () => {
    const { parseSourceInput, SourceValidationError } = await loadSourceRecordsModule();

    expect(parseSourceInput({
      branch_id: "branch-1",
      type: "googleanalytics",
      display_name: "GA4 Website",
      config: {
        property_id: " property-1 ",
        event_filter: "purchase, page_view",
        service_account_email: "viewer@example.com",
      },
    }).config).toEqual({
      property_id: "property-1",
      event_filter: "purchase, page_view",
    });

    expect(() => parseSourceInput({
      branch_id: "branch-1",
      type: "ga4",
      display_name: "GA4 Website",
      config: {
        property_id: "property-1",
        service_account_key: "placeholder",
      },
    })).toThrow(SourceValidationError);
  });

  it("sanitizes Google Reviews and POS setup fields", async () => {
    const { parseSourceInput } = await loadSourceRecordsModule();

    expect(parseSourceInput({
      branch_id: "branch-1",
      type: "googlereviews",
      display_name: "Google Reviews",
      config: {
        sync_window_days: 30,
        business_name: "ignored",
        admin_email: "owner@example.com",
      },
    }).config).toEqual({
      sync_window_days: 30,
    });

    expect(parseSourceInput({
      branch_id: "branch-1",
      type: "pos",
      display_name: "POS",
      config: {
        system_name: " Simpra ",
        sync_mode: "csv",
        raw_export: "drop-me",
      },
    }).config).toEqual({
      system_name: "Simpra",
      sync_mode: "csv",
    });
  });

  it("creates CSV sources as connected manual upload records", async () => {
    const { parseSourceInput } = await loadSourceRecordsModule();

    expect(parseSourceInput({
      branch_id: "branch-1",
      type: "csv",
      display_name: "Manual CSV",
      config: { mode: "ignored" },
    })).toMatchObject({
      status: "connected",
      config: { mode: "manual_upload" },
    });
  });

  it("creates source records inside an active branch without storing credentials", async () => {
    const { createSourceRecord } = await loadSourceRecordsModule();

    await expect(createSourceRecord("workspace-1", {
      branch_id: "branch-1",
      type: "getir",
      display_name: "Getir Moda",
      config: {
        restaurant_id: "restaurant-1",
        sync_window_days: 3,
        extra: "drop-me",
      },
    })).resolves.toMatchObject({
      id: "source-1",
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      type: "getir",
      status: "pending",
      credentials: null,
      config: {
        restaurant_id: "restaurant-1",
        sync_window_days: 3,
      },
    });

    const branchCall = calls.find((call) => call.table === "branches");
    expect(branchCall?.filters).toEqual([
      ["id", "branch-1"],
      ["workspace_id", "workspace-1"],
    ]);

    const insertCall = calls.find((call) => call.table === "sources" && call.operation === "insert");
    expect(insertCall?.insertPayload).toEqual({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      type: "getir",
      display_name: "Getir Moda",
      status: "pending",
      config: {
        restaurant_id: "restaurant-1",
        sync_window_days: 3,
      },
      credentials: null,
    });
  });

  it("updates an existing source record without clearing auth metadata", async () => {
    existingSource = { id: "source-existing" };
    const { createSourceRecord } = await loadSourceRecordsModule();

    await expect(createSourceRecord("workspace-1", {
      branch_id: "branch-1",
      type: "trendyol",
      display_name: "Trendyol Go",
      config: {
        supplier_id: "supplier-1",
        store_id: "store-1",
      },
    })).resolves.toMatchObject({
      id: "source-existing",
      status: "pending",
      config: {
        supplier_id: "supplier-1",
        store_id: "store-1",
      },
    });

    expect(calls.some((call) => call.table === "sources" && call.operation === "insert")).toBe(false);
    const updateCall = calls.find((call) => call.table === "sources" && call.operation === "update");
    expect(updateCall?.updatePayload).toEqual({
      status: "pending",
      config: {
        supplier_id: "supplier-1",
        store_id: "store-1",
      },
    });
    expect(updateCall?.filters).toEqual([
      ["id", "source-existing"],
      ["workspace_id", "workspace-1"],
    ]);
  });

  it("rejects source creation for paused branches", async () => {
    branchLookup = { id: "branch-1", status: "paused" };
    const { createSourceRecord, SourceValidationError } = await loadSourceRecordsModule();

    await expect(createSourceRecord("workspace-1", {
      branch_id: "branch-1",
      type: "csv",
      display_name: "Manual CSV",
    })).rejects.toBeInstanceOf(SourceValidationError);

    expect(calls.some((call) => call.table === "sources" && call.operation === "insert")).toBe(false);
  });

  it("rejects source creation for missing branches", async () => {
    branchLookup = null;
    const { createSourceRecord, SourceNotFoundError } = await loadSourceRecordsModule();

    await expect(createSourceRecord("workspace-1", {
      branch_id: "missing-branch",
      type: "csv",
      display_name: "Manual CSV",
    })).rejects.toBeInstanceOf(SourceNotFoundError);
  });
});
