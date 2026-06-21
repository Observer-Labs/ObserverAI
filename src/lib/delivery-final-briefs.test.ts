import { describe, expect, it } from "vitest";
import {
  buildDeliveryFinalBriefPrompt,
  generateDeliveryFinalBrief,
  parseDeliveryFinalBrief,
} from "./delivery-final-briefs";
import type { SignalCandidate } from "./daily-signal-rules";

const candidate: SignalCandidate = {
  kind: "delivery_cancel_delay",
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  platform: "trendyol",
  topic: "delivery_delay",
  severity: 84,
  severityLabel: "critical",
  evidenceCount: 9,
  businessImpact: "Cancel rate is 5.0x baseline.",
  evidence: ["6 cancellations from 40 orders.", "5 bad reviews mention delay."],
  shouldNotify: true,
};

describe("delivery final briefs", () => {
  it("builds a structured prompt without hidden scores", () => {
    const prompt = buildDeliveryFinalBriefPrompt(candidate, "2026-06-19");

    expect(prompt).toContain("2026-06-19");
    expect(prompt).toContain("delivery_cancel_delay");
    expect(prompt).toContain("required_json_shape");
    expect(prompt).not.toContain("severity");
    expect(prompt).not.toContain("confidence");
  });

  it("parses valid JSON and strips code fences", () => {
    expect(parseDeliveryFinalBrief(`\`\`\`json
{"title":"Gecikme artışı","business_case":"İptaller arttı.","recommended_action":"Paket hattını kontrol et.","root_cause":"Paketleme yavaş.","projected_impact":"İptal riski sürüyor."}
\`\`\``)).toEqual({
      title: "Gecikme artışı",
      business_case: "İptaller arttı.",
      recommended_action: "Paket hattını kontrol et.",
      root_cause: "Paketleme yavaş.",
      projected_impact: "İptal riski sürüyor.",
    });
  });

  it("returns null for malformed model output", () => {
    expect(parseDeliveryFinalBrief("not-json")).toBeNull();
    expect(parseDeliveryFinalBrief("{}")).toBeNull();
  });

  it("uses injected model output to enrich the cluster and returns usage", async () => {
    const result = await generateDeliveryFinalBrief(candidate, "2026-06-19", {
      createMessage: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify({
            title: "Trendyol Go gecikmeleri iptali artırıyor",
            business_case: "İptal oranı bazın üstünde ve yorumlar gecikmeye işaret ediyor.",
            recommended_action: "Yoğun saat öncesi paketleme hattına bir kişi ekle.",
            root_cause: "Paketleme akışı teslimatı yavaşlatıyor.",
            projected_impact: "İptal ve kötü yorum riski devam eder.",
          }),
        }],
        usage: { input_tokens: 120, output_tokens: 80 },
      }),
    });

    expect(result.usedFallback).toBe(false);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 80 });
    expect(result.cluster).toMatchObject({
      title: "Trendyol Go gecikmeleri iptali artırıyor",
      recommended_action: "Yoğun saat öncesi paketleme hattına bir kişi ekle.",
      candidate_key: "daily:2026-06-19:workspace-1:branch-1:source-1:trendyol:delivery_cancel_delay:delivery_delay",
    });
  });

  it("falls back to deterministic cluster text when the model is unavailable or invalid", async () => {
    const unavailable = await generateDeliveryFinalBrief(candidate, "2026-06-19", {
      createMessage: null,
    });
    const invalid = await generateDeliveryFinalBrief(candidate, "2026-06-19", {
      createMessage: async () => ({
        content: [{ type: "text", text: "not-json" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });

    expect(unavailable.usedFallback).toBe(true);
    expect(invalid.usedFallback).toBe(true);
    expect(invalid.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(invalid.cluster.title).toBe("Delivery cancellations and delay complaints spiked");
  });
});
