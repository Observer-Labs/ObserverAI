import { describe, expect, it } from "vitest";
import { buildWhatsAppAlertBody } from "./whatsapp";
import type { Cluster } from "./types";

const cluster: Cluster = {
  id: "cluster-1",
  workspace_id: "workspace-1",
  branch_id: "branch-1",
  title: "Delivery delays increased",
  severity: 82,
  severity_label: "critical",
  confidence: 0.91,
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
  business_case: "Cancellations are up while customers mention slow delivery.",
  recommended_action: "Add one person to packing before the evening rush.",
  root_cause: "Packing is backing up during peak hours.",
  customer_quote: "My order was late.",
  projected_impact: "Cancellation risk remains elevated.",
  status: "active",
  created_at: "2026-06-22T00:00:00.000Z",
  updated_at: "2026-06-22T00:00:00.000Z",
};

describe("buildWhatsAppAlertBody", () => {
  it("builds a branch-scoped action brief without internal scores", () => {
    const body = buildWhatsAppAlertBody(cluster, {
      baseUrl: "https://observerai.app",
      locale: "en",
      branchName: "Kadikoy",
    });

    expect(body).toContain("*Kadikoy*");
    expect(body).toContain("HIGH");
    expect(body).toContain("Root cause: Packing is backing up during peak hours.");
    expect(body).toContain("What to do: Add one person to packing before the evening rush.");
    expect(body).toContain("Evidence: 4 customer signals");
    expect(body).toContain("https://observerai.app/dashboard?gap=cluster-1&branch=branch-1");
    expect(body).not.toContain("82/100");
    expect(body).not.toContain("91%");
  });
});
