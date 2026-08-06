import { describe, expect, it } from "vitest";
import {
  buildWhatsAppAlertBody,
  buildWhatsAppAlertTemplateParams,
  parseWhatsAppDecisionReply,
} from "./whatsapp";
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

describe("buildWhatsAppAlertTemplateParams", () => {
  it("produces the 7 positional params in contract order, single-line", () => {
    const params = buildWhatsAppAlertTemplateParams(
      { ...cluster, business_case: "Line one.\nLine two.   Extra   spaces." },
      { baseUrl: "https://observerai.app", locale: "en", branchName: "Kadikoy" },
    );

    expect(params).toHaveLength(7);
    expect(params[0]).toBe("Kadikoy");
    expect(params[1]).toBe("HIGH");
    expect(params[2]).toBe("Delivery delays increased");
    expect(params[3]).toContain("Line one. Line two. Extra spaces.");
    expect(params[3]).toContain("Impact: Cancellation risk remains elevated.");
    expect(params[4]).toBe("Packing is backing up during peak hours.");
    expect(params[5]).toBe("Add one person to packing before the evening rush.");
    expect(params[6]).toBe("https://observerai.app/dashboard?gap=cluster-1&branch=branch-1");
    // Meta rejects params containing newlines or runs of whitespace
    for (const param of params) {
      expect(param).not.toMatch(/\n|\t| {2,}/);
      expect(param.length).toBeGreaterThan(0);
    }
  });

  it("falls back to generic root cause and branch label when missing", () => {
    const params = buildWhatsAppAlertTemplateParams(
      { ...cluster, root_cause: undefined, projected_impact: undefined },
      { baseUrl: "https://observerai.app", locale: "tr", branchName: null },
    );

    expect(params[0]).toBe("Şube");
    expect(params[4]).toContain("birden fazla kaynak");
    expect(params[3]).not.toContain("Maliyet:");
  });
});

describe("parseWhatsAppDecisionReply", () => {
  it("parses 1/2/3 with surrounding noise", () => {
    expect(parseWhatsAppDecisionReply("1")).toBe("details");
    expect(parseWhatsAppDecisionReply(" 2 ")).toBe("approve");
    expect(parseWhatsAppDecisionReply("3.")).toBe("dismiss");
    expect(parseWhatsAppDecisionReply("3!!")).toBe("dismiss");
  });

  it("parses the word forms promised in the message", () => {
    expect(parseWhatsAppDecisionReply("Detaylar")).toBe("details");
    expect(parseWhatsAppDecisionReply("hallettim")).toBe("approve");
    expect(parseWhatsAppDecisionReply("Geç")).toBe("dismiss");
    expect(parseWhatsAppDecisionReply("skip")).toBe("dismiss");
  });

  it("never triggers on ordinary conversation or consent words", () => {
    expect(parseWhatsAppDecisionReply("tamam")).toBeNull();
    expect(parseWhatsAppDecisionReply("evet")).toBeNull();
    expect(parseWhatsAppDecisionReply("13")).toBeNull();
    expect(parseWhatsAppDecisionReply("1 tane daha sipariş geldi")).toBeNull();
    expect(parseWhatsAppDecisionReply("")).toBeNull();
  });
});
