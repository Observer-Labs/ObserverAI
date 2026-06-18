import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = "insert" | "update";

type QueryCall = {
  table: string;
  operation?: QueryOperation;
  selected?: string;
  selectOptions?: unknown;
  insertPayload?: unknown;
  updatePayload?: unknown;
  filters: Array<[column: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let workspaceBranchLimit: number | null = 1;
let activeBranchCount = 1;
let branchLookup = { id: "branch-1", status: "active" };
let branchCreate = { id: "branch-created", name: "Kadıköy", status: "active" };
let branchUpdate = { id: "branch-1", name: "Moda", status: "active" };
let branchWriteError: { code: string; message: string } | null = null;
let branchRows: Array<{ id: string; name: string; status: "active" | "paused" }> = [
  { id: "branch-1", name: "Moda", status: "active" },
];
let sourceRows: Array<{ branch_id: string; status: "connected" | "pending" | "error"; last_sync_at: string | null }> = [];

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [] };
  calls.push(call);

  const query = {
    select: vi.fn((columns?: string, options?: unknown) => {
      call.selected = columns;
      call.selectOptions = options;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    order: vi.fn(() => query),
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
    single: vi.fn(async () => {
      if (table === "workspaces") {
        return { data: { branch_limit: workspaceBranchLimit }, error: null };
      }
      if (table === "branches" && call.operation === "insert") {
        if (branchWriteError) return { data: null, error: branchWriteError };
        return { data: branchCreate, error: null };
      }
      if (table === "branches" && call.operation === "update") {
        if (branchWriteError) return { data: null, error: branchWriteError };
        return { data: branchUpdate, error: null };
      }
      if (table === "branches") {
        return { data: branchLookup, error: null };
      }
      return { data: null, error: null };
    }),
    then(resolve: (value: { data: unknown[]; error: Error | null; count?: number }) => void) {
      if (table === "branches" && call.selected === "id" && call.selectOptions) {
        resolve({ data: [], error: null, count: activeBranchCount });
        return;
      }
      if (table === "branches") {
        resolve({ data: branchRows, error: null });
        return;
      }
      if (table === "sources") {
        resolve({ data: sourceRows, error: null });
        return;
      }
      resolve({ data: [{ id: `${table}-row` }], error: null });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadBranchesModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./branches");
}

describe("branch management helpers", () => {
  beforeEach(() => {
    calls.length = 0;
    workspaceBranchLimit = 1;
    activeBranchCount = 1;
    branchLookup = { id: "branch-1", status: "active" };
    branchCreate = { id: "branch-created", name: "Kadıköy", status: "active" };
    branchUpdate = { id: "branch-1", name: "Moda", status: "active" };
    branchWriteError = null;
    branchRows = [{ id: "branch-1", name: "Moda", status: "active" }];
    sourceRows = [];
  });

  it("lists branches with source counts and latest sync", async () => {
    branchRows = [
      { id: "branch-1", name: "Moda", status: "active" },
      { id: "branch-2", name: "Kadıköy", status: "paused" },
    ];
    sourceRows = [
      { branch_id: "branch-1", status: "connected", last_sync_at: "2026-06-15T10:00:00.000Z" },
      { branch_id: "branch-1", status: "pending", last_sync_at: "2026-06-15T12:00:00.000Z" },
      { branch_id: "branch-2", status: "error", last_sync_at: null },
    ];
    const { listBranches } = await loadBranchesModule();

    await expect(listBranches("workspace-1")).resolves.toMatchObject([
      {
        id: "branch-1",
        source_count: 2,
        connected_source_count: 1,
        last_sync_at: "2026-06-15T12:00:00.000Z",
      },
      {
        id: "branch-2",
        source_count: 1,
        connected_source_count: 0,
        last_sync_at: null,
      },
    ]);
  });

  it("rejects branch creation when active branches reached branch_limit", async () => {
    const { BranchLimitError, createBranch } = await loadBranchesModule();

    await expect(createBranch("workspace-1", { name: "Moda" })).rejects.toBeInstanceOf(BranchLimitError);

    expect(calls.find((call) => call.operation === "insert")).toBeUndefined();
  });

  it("creates an active branch with defaults when there is room", async () => {
    activeBranchCount = 0;
    const { createBranch } = await loadBranchesModule();

    await expect(createBranch("workspace-1", { name: " Moda " })).resolves.toEqual(branchCreate);

    const insertCall = calls.find((call) => call.table === "branches" && call.operation === "insert");
    expect(insertCall?.insertPayload).toEqual({
      workspace_id: "workspace-1",
      name: "Moda",
      brand: null,
      district: null,
      city: null,
      timezone: "Europe/Istanbul",
      status: "active",
    });
  });

  it("treats null branch_limit as unlimited", async () => {
    workspaceBranchLimit = null;
    activeBranchCount = 24;
    const { createBranch } = await loadBranchesModule();

    await createBranch("workspace-1", { name: "Unlimited" });

    expect(calls.some((call) => call.table === "branches" && call.operation === "insert")).toBe(true);
  });

  it("maps duplicate branch names to a conflict error", async () => {
    activeBranchCount = 0;
    branchWriteError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const { BranchConflictError, createBranch } = await loadBranchesModule();

    await expect(createBranch("workspace-1", { name: "Moda" })).rejects.toBeInstanceOf(BranchConflictError);
  });

  it("updates only the requested branch inside the authenticated workspace", async () => {
    const { updateBranch } = await loadBranchesModule();

    await updateBranch("workspace-1", "branch-1", { name: " Moda ", city: " İstanbul " });

    const updateCall = calls.find((call) => call.table === "branches" && call.operation === "update");
    expect(updateCall?.updatePayload).toEqual({ name: "Moda", city: "İstanbul" });
    expect(updateCall?.filters).toEqual([
      ["id", "branch-1"],
      ["workspace_id", "workspace-1"],
    ]);
  });

  it("enforces branch_limit when reactivating a paused branch", async () => {
    branchLookup = { id: "branch-1", status: "paused" };
    activeBranchCount = 1;
    const { BranchLimitError, updateBranch } = await loadBranchesModule();

    await expect(updateBranch("workspace-1", "branch-1", { status: "active" })).rejects.toBeInstanceOf(BranchLimitError);

    expect(calls.find((call) => call.operation === "update")).toBeUndefined();
  });

  it("reactivates a paused branch when active branch capacity remains", async () => {
    branchLookup = { id: "branch-1", status: "paused" };
    activeBranchCount = 0;
    const { updateBranch } = await loadBranchesModule();

    await updateBranch("workspace-1", "branch-1", { status: "active" });

    const updateCall = calls.find((call) => call.table === "branches" && call.operation === "update");
    expect(updateCall?.updatePayload).toEqual({ status: "active" });
  });

  it("does not pause the last active branch", async () => {
    const { pauseBranch } = await loadBranchesModule();

    await expect(pauseBranch("workspace-1", "branch-1")).rejects.toThrow("At least one active branch");

    expect(calls.find((call) => call.operation === "update")).toBeUndefined();
  });

  it("pauses a branch when another active branch remains", async () => {
    activeBranchCount = 2;
    branchUpdate = { id: "branch-1", name: "Moda", status: "paused" };
    const { pauseBranch } = await loadBranchesModule();

    await expect(pauseBranch("workspace-1", "branch-1")).resolves.toEqual(branchUpdate);

    const updateCall = calls.find((call) => call.table === "branches" && call.operation === "update");
    expect(updateCall?.updatePayload).toEqual({ status: "paused" });
  });
});
