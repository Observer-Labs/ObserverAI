import { describe, expect, it } from "vitest";
import {
  evaluateDailySignalCandidates,
  selectDailyDigestByWorkspace,
  selectDailyDigestCandidates,
  type DailyBaselineMetrics,
  type DailyDeliveryMetrics,
} from "./daily-signal-rules";
import { severityLabel } from "./plans";

const baseline: DailyBaselineMetrics = {
  orderCount: 130,
  cancelRate: 0.021,
  netAmount: 23000,
  badReviewCount: 2,
  avgRating: 4.2,
  avgPrepDurationMinutes: 18,
};

function metrics(overrides: Partial<DailyDeliveryMetrics> = {}): DailyDeliveryMetrics {
  return {
    workspaceId: "workspace-1",
    branchId: "branch-kadikoy",
    sourceId: "source-trendyol",
    platform: "trendyol",
    date: "2026-06-19",
    orderCount: 120,
    cancelCount: 9,
    netAmount: 18000,
    badReviewCount: 7,
    avgRating: 2.9,
    topicCounts: [
      { topic: "delivery_delay", count: 4, confidence: 0.92 },
      { topic: "cold_food", count: 2, confidence: 0.86 },
      { topic: "other", count: 1, confidence: 0.7 },
    ],
    ...overrides,
  };
}

describe("daily signal rules", () => {
  it("creates a delivery cancellation delay candidate when cancel rate and delay reviews spike", () => {
    const candidates = evaluateDailySignalCandidates(metrics(), baseline, [], {
      now: new Date("2026-06-20T05:00:00.000Z"),
    });

    const candidate = candidates.find((item) => item.kind === "delivery_cancel_delay");

    expect(candidate).toMatchObject({
      kind: "delivery_cancel_delay",
      branchId: "branch-kadikoy",
      topic: "delivery_delay",
      shouldNotify: true,
    });
    expect(candidate?.severity).toBeGreaterThanOrEqual(80);
    expect(candidate?.severityLabel).toBe("critical");
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining("9 cancellations"),
      expect.stringContaining("4 of 7 bad reviews"),
    ]));
  });

  it("does not create a cancellation alert when raw cancellations rise but cancel rate falls", () => {
    const candidates = evaluateDailySignalCandidates(
      metrics({
        orderCount: 100,
        cancelCount: 4,
        badReviewCount: 3,
        topicCounts: [{ topic: "delivery_delay", count: 3 }],
      }),
      {
        ...baseline,
        orderCount: 10,
        cancelRate: 0.1,
      },
    );

    expect(candidates.some((candidate) => candidate.kind === "delivery_cancel_delay")).toBe(false);
  });

  it("creates a sales drop candidate when revenue drops and bad reviews share one topic", () => {
    const candidates = evaluateDailySignalCandidates(
      metrics({
        cancelCount: 1,
        badReviewCount: 5,
        netAmount: 17000,
        topicCounts: [
          { topic: "cold_food", count: 4 },
          { topic: "other", count: 1 },
        ],
      }),
      baseline,
    );

    const candidate = candidates.find((item) => item.kind === "sales_drop_review");

    expect(candidate).toMatchObject({
      kind: "sales_drop_review",
      topic: "cold_food",
      shouldNotify: true,
    });
    expect(candidate?.businessImpact).toContain("down");
  });

  it("lets critical safety topics through even without a baseline", () => {
    const candidates = evaluateDailySignalCandidates(
      metrics({
        orderCount: 2,
        cancelCount: 0,
        netAmount: 300,
        badReviewCount: 1,
        topicCounts: [{ topic: "food_poisoning", count: 1, confidence: 0.91 }],
      }),
      null,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "critical_topic",
      topic: "food_poisoning",
      shouldNotify: true,
      severityLabel: "critical",
    });
  });

  it("lets payment system down through as a critical operational topic", () => {
    const candidates = evaluateDailySignalCandidates(
      metrics({
        orderCount: 3,
        cancelCount: 0,
        netAmount: 900,
        badReviewCount: 1,
        topicCounts: [{ topic: "payment_system_down", count: 1, confidence: 0.88 }],
      }),
      null,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "critical_topic",
      topic: "payment_system_down",
      shouldNotify: true,
      severityLabel: "critical",
    });
  });

  it("suppresses repeated branch-topic notifications during cooldown", () => {
    const candidates = evaluateDailySignalCandidates(
      metrics(),
      baseline,
      [{
        workspaceId: "workspace-1",
        branchId: "branch-kadikoy",
        topic: "delivery_delay",
        sentAt: "2026-06-20T04:00:00.000Z",
      }],
      {
        now: new Date("2026-06-20T05:00:00.000Z"),
        cooldownHours: 24,
      },
    );

    const candidate = candidates.find((item) => item.kind === "delivery_cancel_delay");

    expect(candidate).toMatchObject({
      shouldNotify: false,
      suppressReason: "cooldown",
    });
  });

  it("selects only the top daily digest candidates", () => {
    const branchA = evaluateDailySignalCandidates(metrics({ branchId: "branch-a", cancelCount: 11 }), baseline);
    const branchB = evaluateDailySignalCandidates(metrics({ branchId: "branch-b", netAmount: 12000 }), baseline);
    const branchC = evaluateDailySignalCandidates(metrics({ branchId: "branch-c", topicCounts: [{ topic: "payment_failed", count: 3 }] }), baseline);
    const branchD = evaluateDailySignalCandidates(metrics({ branchId: "branch-d", topicCounts: [{ topic: "cold_food", count: 5 }] }), baseline);

    const selected = selectDailyDigestCandidates([
      ...branchA,
      ...branchB,
      ...branchC,
      ...branchD,
    ], 3);

    expect(selected).toHaveLength(3);
    expect(selected.map((candidate) => candidate.severity)).toEqual(
      [...selected.map((candidate) => candidate.severity)].sort((a, b) => b - a),
    );
  });
});

describe("selectDailyDigestByWorkspace", () => {
  const makeItem = (
    workspaceId: string,
    severity: number,
    shouldNotify = true,
    evidenceCount = 1,
  ) => ({
    candidate: {
      kind: "delivery_cancel_delay" as const,
      workspaceId,
      branchId: `${workspaceId}-branch`,
      platform: "getir" as const,
      topic: `topic-${severity}-${evidenceCount}`,
      severity,
      severityLabel: severityLabel(severity),
      evidenceCount,
      businessImpact: "impact",
      evidence: [],
      shouldNotify,
    },
  });

  it("caps each workspace at 3 items ordered by severity", () => {
    const wsA = [72, 90, 45, 60, 81].map((severity) => makeItem("ws-a", severity));
    const wsB = [50, 55].map((severity) => makeItem("ws-b", severity));

    const digest = selectDailyDigestByWorkspace([...wsA, ...wsB]);

    expect(digest.get("ws-a")?.map((item) => item.candidate.severity)).toEqual([90, 81, 72]);
    expect(digest.get("ws-b")?.map((item) => item.candidate.severity)).toEqual([55, 50]);
  });

  it("drops suppressed candidates entirely", () => {
    const digest = selectDailyDigestByWorkspace([
      makeItem("ws-a", 88, false),
      makeItem("ws-a", 40, true),
    ]);

    expect(digest.get("ws-a")?.map((item) => item.candidate.severity)).toEqual([40]);
  });

  it("breaks severity ties by evidence count", () => {
    const digest = selectDailyDigestByWorkspace([
      makeItem("ws-a", 70, true, 2),
      makeItem("ws-a", 70, true, 9),
    ]);

    expect(digest.get("ws-a")?.map((item) => item.candidate.evidenceCount)).toEqual([9, 2]);
  });
});
