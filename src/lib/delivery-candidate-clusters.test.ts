import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SignalCandidate } from "./daily-signal-rules";

type QueryCall = {
  table: string;
  operation?: "delete" | "insert";
  insertPayload?: unknown;
  selected?: string;
  filters: Array<[column: string, value: unknown]>;
  inFilters: Array<[column: string, value: unknown[]]>;
};

const calls: QueryCall[] = [];
let deleteError: Error | null = null;
let insertError: Error | null = null;

function createQuery(table: string) {
  const call: QueryCall = { table, filters: [], inFilters: [] };
  calls.push(call);

  const query = {
    delete: vi.fn(() => {
      call.operation = "delete";
      return query;
    }),
    insert: vi.fn((payload: unknown) => {
      call.operation = "insert";
      call.insertPayload = payload;
      return query;
    }),
    select: vi.fn((columns?: string) => {
      call.selected = columns;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value]);
      return query;
    }),
    in: vi.fn((column: string, value: unknown[]) => {
      call.inFilters.push([column, value]);
      return query;
    }),
    then(resolve: (value: { data?: unknown[]; error: Error | null }) => void) {
      if (call.operation === "delete") {
        resolve({ data: [], error: deleteError });
        return;
      }
      if (call.operation === "insert") {
        resolve({
          data: (call.insertPayload as Array<Record<string, unknown>>).map((row, index) => ({
            id: `cluster-${index + 1}`,
            created_at: "2026-06-20T00:00:00.000Z",
            updated_at: "2026-06-20T00:00:00.000Z",
            ...row,
          })),
          error: insertError,
        });
        return;
      }
      resolve({ data: [], error: null });
    },
  };

  return query;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQuery(table)),
  })),
}));

async function loadCandidateClustersModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "placeholder-anon";
  process.env[`SUPABASE_${"SERVICE"}_KEY`] = "placeholder-service";
  return import("./delivery-candidate-clusters");
}

const candidate: SignalCandidate = {
  kind: "delivery_cancel_delay",
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  platform: "trendyol",
  topic: "delivery_delay",
  severity: 86,
  severityLabel: "critical",
  evidenceCount: 11,
  businessImpact: "Cancel rate is 7.5x baseline.",
  evidence: [
    "6 cancellations from 40 orders (15%).",
    "5 of 5 bad reviews mention delivery delay.",
  ],
  shouldNotify: true,
};

describe("delivery candidate clusters", () => {
  beforeEach(() => {
    calls.length = 0;
    deleteError = null;
    insertError = null;
  });

  it("maps deterministic signal candidates into active clusters", async () => {
    const { candidateToCluster } = await loadCandidateClustersModule();

    expect(candidateToCluster(candidate, "2026-06-19")).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      title: "Delivery cancellations and delay complaints spiked",
      severity: 86,
      severity_label: "critical",
      evidence_count: 11,
      business_case: "Cancel rate is 7.5x baseline.",
      recommended_action: "Check kitchen prep and packing flow for this branch before the next delivery peak.",
      root_cause: "Delivery delay complaints and cancellation rate moved together.",
      customer_quote: "6 cancellations from 40 orders (15%).",
      projected_impact: "Cancel rate is 7.5x baseline.",
      candidate_key: "daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:delivery_cancel_delay:delivery_delay",
      status: "active",
    });
  });

  it("uses winter heating action for cold-food sales drop candidates", async () => {
    const { candidateToCluster } = await loadCandidateClustersModule();
    const coldCandidate: SignalCandidate = {
      ...candidate,
      kind: "sales_drop_review",
      topic: "cold_food",
      severity: 72,
      severityLabel: "high",
      evidenceCount: 4,
      businessImpact: "Net sales are down 18% vs baseline.",
      evidence: ["4 reviews mention cold_food."],
    };

    expect(candidateToCluster(coldCandidate, "2026-01-15")).toMatchObject({
      root_cause: "Customer comfort or food temperature complaints coincided with lower net sales.",
      recommended_action: "Increase dining room heating and check food holding temperature before the next rush.",
    });
  });

  it("uses summer cooling action for cold-food sales drop candidates", async () => {
    const { candidateToCluster } = await loadCandidateClustersModule();
    const coldCandidate: SignalCandidate = {
      ...candidate,
      kind: "sales_drop_review",
      topic: "cold_food",
      severity: 72,
      severityLabel: "high",
      evidenceCount: 4,
      businessImpact: "Net sales are down 18% vs baseline.",
      evidence: ["4 reviews mention cold_food."],
    };

    expect(candidateToCluster(coldCandidate, "2026-07-15")).toMatchObject({
      recommended_action: "Reduce excessive cooling in the dining room and check food holding temperature before the next rush.",
    });
  });

  it("refreshes active clusters by candidate key and preserves decided clusters", async () => {
    const { persistDeliveryCandidateClusters } = await loadCandidateClustersModule();

    await expect(persistDeliveryCandidateClusters({
      candidates: [candidate],
      metricDate: "2026-06-19",
    })).resolves.toMatchObject([
      {
        id: "cluster-1",
        candidate_key: "daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:delivery_cancel_delay:delivery_delay",
      },
    ]);

    const deleteCall = calls.find((call) => call.operation === "delete");
    expect(deleteCall?.table).toBe("clusters");
    expect(deleteCall?.filters).toEqual([
      ["status", "active"],
      ["workspace_id", "workspace-1"],
      ["branch_id", "branch-1"],
    ]);
    expect(deleteCall?.inFilters).toEqual([
      ["candidate_key", ["daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:delivery_cancel_delay:delivery_delay"]],
    ]);

    const insertCall = calls.find((call) => call.operation === "insert");
    expect(insertCall?.insertPayload).toMatchObject([
      {
        workspace_id: "workspace-1",
        branch_id: "branch-1",
        status: "active",
      },
    ]);
  });

  it("does not touch the database when there are no candidates", async () => {
    const { persistDeliveryCandidateClusters } = await loadCandidateClustersModule();

    await expect(persistDeliveryCandidateClusters({
      candidates: [],
      metricDate: "2026-06-19",
    })).resolves.toEqual([]);

    expect(calls).toHaveLength(0);
  });

  it("surfaces insert errors", async () => {
    insertError = new Error("insert failed");
    const { persistDeliveryCandidateClusters } = await loadCandidateClustersModule();

    await expect(persistDeliveryCandidateClusters({
      candidates: [candidate],
      metricDate: "2026-06-19",
    })).rejects.toThrow("insert failed");
  });
});
