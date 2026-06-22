import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  selected?: string;
  filters: Array<[column: string, value: unknown]>;
  notFilters: Array<[column: string, operator: string, value: unknown]>;
};

const calls: QueryCall[] = [];
let rows: unknown[] = [];
let queryError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [], notFilters: [] };
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
    gte: vi.fn((column: string, value: unknown) => {
      call.filters.push([`${column}>=`, value]);
      return query;
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      call.notFilters.push([column, operator, value]);
      return query;
    }),
    then(resolve: (value: { data: unknown[]; error: Error | null }) => void) {
      resolve({ data: rows, error: queryError });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadCooldownModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./notification-cooldown");
}

describe("notification cooldown helpers", () => {
  beforeEach(() => {
    calls.length = 0;
    rows = [];
    queryError = null;
  });

  it("extracts the topic from deterministic candidate keys", async () => {
    const { topicFromCandidateKey } = await loadCooldownModule();

    expect(topicFromCandidateKey("daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:delivery_cancel_delay:delivery_delay")).toBe("delivery_delay");
    expect(topicFromCandidateKey("bad-key")).toBe("");
  });

  it("normalizes recent candidate clusters into previous notification inputs", async () => {
    const { normalizeRecentCandidateNotifications } = await loadCooldownModule();

    expect(normalizeRecentCandidateNotifications([
      {
        workspace_id: "workspace-1",
        branch_id: "branch-1",
        candidate_key: "daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:sales_drop_review:cold_food",
        created_at: "2026-06-20T08:00:00.000Z",
      },
      {
        workspace_id: "workspace-1",
        branch_id: "branch-1",
        candidate_key: null,
        created_at: "2026-06-20T08:00:00.000Z",
      },
    ])).toEqual([{
      workspaceId: "workspace-1",
      branchId: "branch-1",
      topic: "cold_food",
      sentAt: "2026-06-20T08:00:00.000Z",
    }]);
  });

  it("queries recent clusters scoped to workspace and branch", async () => {
    rows = [{
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      candidate_key: "daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:payment_problem:payment_failed",
      created_at: "2026-06-20T08:00:00.000Z",
    }];
    const { fetchRecentCandidateNotifications } = await loadCooldownModule();

    await expect(fetchRecentCandidateNotifications({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      since: new Date("2026-06-20T00:00:00.000Z"),
    })).resolves.toEqual([{
      workspaceId: "workspace-1",
      branchId: "branch-1",
      topic: "payment_failed",
      sentAt: "2026-06-20T08:00:00.000Z",
    }]);

    expect(calls[0]).toMatchObject({
      table: "clusters",
      filters: [
        ["workspace_id", "workspace-1"],
        ["branch_id", "branch-1"],
        ["created_at>=", "2026-06-20T00:00:00.000Z"],
      ],
      notFilters: [["candidate_key", "is", null]],
    });
  });
});
