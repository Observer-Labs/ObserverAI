import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  operation?: "update";
  selected?: string;
  updatePayload?: unknown;
  filters: Array<[column: string, value: unknown]>;
  inFilters: Array<[column: string, values: unknown[]]>;
};

const calls: QueryCall[] = [];
let activeBranches: Array<{ id: string; created_at: string | null }> = [];

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [], inFilters: [] };
  calls.push(call);

  const query = {
    select: vi.fn((columns?: string) => {
      call.selected = columns;
      return query;
    }),
    update: vi.fn((payload: unknown) => {
      call.operation = "update";
      call.updatePayload = payload;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      call.inFilters.push([column, values]);
      return query;
    }),
    order: vi.fn(() => query),
    then(resolve: (value: { data: unknown[] | null; error: Error | null }) => void) {
      if (table === "branches" && call.operation === "update") {
        resolve({ data: null, error: null });
        return;
      }
      resolve({ data: activeBranches, error: null });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./branch-limit-enforcement");
}

describe("enforceWorkspaceBranchLimit", () => {
  beforeEach(() => {
    calls.length = 0;
    activeBranches = [
      { id: "branch-1", created_at: "2026-06-01T00:00:00.000Z" },
      { id: "branch-2", created_at: "2026-06-02T00:00:00.000Z" },
      { id: "branch-3", created_at: "2026-06-03T00:00:00.000Z" },
    ];
  });

  it("pauses active branches outside the new plan limit without deleting data", async () => {
    const { enforceWorkspaceBranchLimit } = await loadModule();

    await expect(enforceWorkspaceBranchLimit("workspace-1", 1)).resolves.toEqual({
      branchLimit: 1,
      activeCount: 3,
      pausedBranchIds: ["branch-2", "branch-3"],
    });

    const updateCall = calls.find((call) => call.operation === "update");
    expect(updateCall?.updatePayload).toEqual({ status: "paused" });
    expect(updateCall?.filters).toEqual([["workspace_id", "workspace-1"]]);
    expect(updateCall?.inFilters).toEqual([["id", ["branch-2", "branch-3"]]]);
  });

  it("does nothing for unlimited branch limits", async () => {
    const { enforceWorkspaceBranchLimit } = await loadModule();

    await expect(enforceWorkspaceBranchLimit("workspace-1", null)).resolves.toEqual({
      branchLimit: null,
      activeCount: 3,
      pausedBranchIds: [],
    });

    expect(calls.some((call) => call.operation === "update")).toBe(false);
  });

  it("keeps at least one branch active even if a bad limit is supplied", async () => {
    const { enforceWorkspaceBranchLimit } = await loadModule();

    await expect(enforceWorkspaceBranchLimit("workspace-1", 0)).resolves.toMatchObject({
      pausedBranchIds: ["branch-2", "branch-3"],
    });
  });
});
