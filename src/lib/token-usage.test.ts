import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = {
  table: string;
  insertPayload?: unknown;
};

const calls: QueryCall[] = [];
let insertError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table };
  calls.push(call);

  return {
    insert: vi.fn((payload: unknown) => {
      call.insertPayload = payload;
      return { error: insertError };
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadTokenUsageModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./token-usage");
}

describe("token usage audit", () => {
  beforeEach(() => {
    calls.length = 0;
    insertError = null;
  });

  it("records token usage with estimated Claude cost", async () => {
    const { recordTokenUsage } = await loadTokenUsageModule();

    await recordTokenUsage({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      table: "token_usage",
      insertPayload: {
        workspace_id: "workspace-1",
        branch_id: "branch-1",
        input_tokens: 1000,
        output_tokens: 500,
        cost: 0.0105,
      },
    });
  });

  it("skips zero-usage rows", async () => {
    const { recordTokenUsage } = await loadTokenUsageModule();

    await recordTokenUsage({
      workspaceId: "workspace-1",
      branchId: "branch-1",
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(calls).toHaveLength(0);
  });

  it("surfaces insert errors", async () => {
    insertError = new Error("usage insert failed");
    const { recordTokenUsage } = await loadTokenUsageModule();

    await expect(recordTokenUsage({
      workspaceId: "workspace-1",
      inputTokens: 1,
      outputTokens: 1,
    })).rejects.toThrow("usage insert failed");
  });
});
