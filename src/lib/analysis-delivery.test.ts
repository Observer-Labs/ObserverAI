import { describe, expect, it } from "vitest";
import { selectTopAnalysisCluster, shouldSendInitialWhatsApp } from "./analysis-delivery";
import type { Cluster } from "./types";

function cluster(input: Partial<Cluster> & Pick<Cluster, "id" | "title" | "severity">): Cluster {
  return {
    workspace_id: "workspace-1",
    branch_id: "branch-1",
    severity_label: "low",
    confidence: 1,
    evidence_count: 1,
    source_breakdown: {
      slack: 0,
      email: 0,
      whatsapp: 0,
      googlereviews: 1,
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
    business_case: "",
    recommended_action: "",
    status: "active",
    created_at: "2026-06-27T00:00:00.000Z",
    updated_at: "2026-06-27T00:00:00.000Z",
    ...input,
  };
}

describe("analysis delivery", () => {
  it("allows the initial WhatsApp analysis exactly until it is marked sent", () => {
    expect(shouldSendInitialWhatsApp({
      includeDemo: false,
      enabled: true,
      recipientNumbers: ["+905000000000"],
    })).toBe(true);

    expect(shouldSendInitialWhatsApp({
      includeDemo: false,
      initialAnalysisSentAt: "2026-06-27T00:00:00.000Z",
      enabled: true,
      recipientNumbers: ["+905000000000"],
    })).toBe(false);
  });

  it("does not send initial analysis for demo data or without a recipient", () => {
    expect(shouldSendInitialWhatsApp({
      includeDemo: true,
      enabled: true,
      recipientNumbers: ["+905000000000"],
    })).toBe(false);
    expect(shouldSendInitialWhatsApp({
      includeDemo: false,
      enabled: true,
      recipientNumbers: [],
    })).toBe(false);
  });

  it("prefers the highest-severity actionable cluster over a general summary", () => {
    const result = selectTopAnalysisCluster([
      cluster({
        id: "summary",
        title: "Genel Yorum Özeti",
        severity: 20,
        candidate_key: "general_review_summary:source-1",
      }),
      cluster({ id: "issue-low", title: "Issue low", severity: 25 }),
      cluster({ id: "issue-high", title: "Issue high", severity: 60 }),
    ]);

    expect(result?.id).toBe("issue-high");
  });
});
