import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  operation?: "delete" | "insert" | "update";
  insertPayload?: unknown;
  updatePayload?: unknown;
  filters: Array<[column: string, value: unknown]>;
  negativeFilters: Array<[column: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let branchLookupResult: { data: { id: string } | null; error: Error | null } = {
  data: { id: "branch-existing" },
  error: null,
};
let branchCreateResult: { data: { id: string }; error: Error | null } = {
  data: { id: "branch-created" },
  error: null,
};
let clusterLookupResult: { data: { branch_id: string }; error: Error | null } = {
  data: { branch_id: "branch-from-cluster" },
  error: null,
};

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [], negativeFilters: [] };
  calls.push(call);

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    neq: vi.fn((column: string, value: unknown) => {
      call.negativeFilters.push([column, value]);
      return query;
    }),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(() => query),
    delete: vi.fn(() => {
      call.operation = "delete";
      return query;
    }),
    insert: vi.fn((payload: unknown) => {
      call.operation = "insert";
      call.insertPayload = payload;
      return query;
    }),
    update: vi.fn((payload: unknown) => {
      call.operation = "update";
      call.updatePayload = payload;
      return query;
    }),
    maybeSingle: vi.fn(async () => {
      if (table === "branches") return branchLookupResult;
      return { data: null, error: null };
    }),
    single: vi.fn(async () => {
      if (table === "branches") return branchCreateResult;
      if (table === "clusters") return clusterLookupResult;
      return { data: { id: `${table}-row`, branch_id: "branch-existing" }, error: null };
    }),
    then(resolve: (value: { data: unknown[]; error: Error | null; count?: number }) => void) {
      resolve({ data: [{ id: `${table}-row` }], error: null });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
    auth: { admin: { listUsers: vi.fn() } },
  })),
}));

async function loadSupabaseModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./supabase");
}

describe("branch-scoped Supabase helpers", () => {
  beforeEach(() => {
    calls.length = 0;
    branchLookupResult = { data: { id: "branch-existing" }, error: null };
    branchCreateResult = { data: { id: "branch-created" }, error: null };
    clusterLookupResult = { data: { branch_id: "branch-from-cluster" }, error: null };
  });

  it("returns the first active branch for a workspace", async () => {
    const { getDefaultBranchId } = await loadSupabaseModule();

    await expect(getDefaultBranchId("workspace-1")).resolves.toBe("branch-existing");

    expect(calls[0]).toMatchObject({
      table: "branches",
      filters: [
        ["workspace_id", "workspace-1"],
        ["status", "active"],
      ],
    });
  });

  it("creates Ana Şube when a workspace has no branch yet", async () => {
    branchLookupResult = { data: null, error: null };
    const { getDefaultBranchId } = await loadSupabaseModule();

    await expect(getDefaultBranchId("workspace-1")).resolves.toBe("branch-created");

    const insertCall = calls.find((call) => call.table === "branches" && call.operation === "insert");
    expect(insertCall?.insertPayload).toEqual({
      workspace_id: "workspace-1",
      name: "Ana Şube",
      timezone: "Europe/Istanbul",
      status: "active",
    });
  });

  it("adds default branch_id and source_type when inserting signals", async () => {
    const { insertSignals } = await loadSupabaseModule();

    await insertSignals([
      {
        workspace_id: "workspace-1",
        source: "pos",
        channel: "csv",
        content: "Sales down 18%",
        timestamp: "2026-06-15T10:00:00.000Z",
        reviewed: false,
      },
    ]);

    const insertCall = calls.find((call) => call.table === "signals" && call.operation === "insert");
    expect(insertCall?.insertPayload).toMatchObject([
      {
        workspace_id: "workspace-1",
        branch_id: "branch-existing",
        source: "pos",
        source_type: "pos",
      },
    ]);
  });

  it("replaces active clusters only inside the target branch", async () => {
    const { upsertClusters } = await loadSupabaseModule();

    await upsertClusters([
      {
        workspace_id: "workspace-1",
        branch_id: "branch-explicit",
        title: "Prep time spike",
        severity: 82,
        severity_label: "critical",
        confidence: 0.9,
        evidence_count: 4,
        source_breakdown: {
          slack: 0,
          email: 0,
          whatsapp: 0,
          zendesk: 0,
          intercom: 0,
          jira: 0,
          appstore: 0,
          googleplay: 0,
          googleanalytics: 0,
          github: 0,
          reddit: 0,
          shopify: 0,
          trustpilot: 0,
        },
        business_case: "Kitchen is backed up.",
        recommended_action: "Move one person to packing.",
        status: "active",
      },
    ]);

    const deleteCall = calls.find((call) => call.table === "clusters" && call.operation === "delete");
    expect(deleteCall?.filters).toEqual([
      ["workspace_id", "workspace-1"],
      ["branch_id", "branch-explicit"],
      ["status", "active"],
    ]);

    const insertCall = calls.find((call) => call.table === "clusters" && call.operation === "insert");
    expect(insertCall?.insertPayload).toMatchObject([
      { workspace_id: "workspace-1", branch_id: "branch-explicit" },
    ]);
  });

  it("derives delivery branch_id from cluster when it is omitted", async () => {
    const { logDelivery } = await loadSupabaseModule();

    await logDelivery({
      cluster_id: "cluster-1",
      channel: "whatsapp",
      recipient: "recipient-placeholder",
      sent_at: "2026-06-15T10:00:00.000Z",
      status: "sent",
    });

    const insertCall = calls.find((call) => call.table === "deliveries" && call.operation === "insert");
    expect(insertCall?.insertPayload).toMatchObject({
      cluster_id: "cluster-1",
      branch_id: "branch-from-cluster",
    });
  });

  it("filters pending signals by branch and excludes demo by default", async () => {
    const { getPendingSignals } = await loadSupabaseModule();

    await getPendingSignals("workspace-1", 25, "branch-1");

    expect(calls[0]).toMatchObject({
      table: "signals",
      filters: [
        ["workspace_id", "workspace-1"],
        ["reviewed", false],
        ["branch_id", "branch-1"],
      ],
      negativeFilters: [["channel", "demo"]],
    });
  });

  it("includes demo pending signals only when explicitly requested", async () => {
    const { getPendingSignals } = await loadSupabaseModule();

    await getPendingSignals("workspace-1", 25, "branch-1", { includeDemo: true });

    expect(calls[0]).toMatchObject({
      table: "signals",
      filters: [
        ["workspace_id", "workspace-1"],
        ["reviewed", false],
        ["branch_id", "branch-1"],
      ],
      negativeFilters: [],
    });
  });
});
