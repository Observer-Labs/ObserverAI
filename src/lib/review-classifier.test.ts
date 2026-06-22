import { describe, expect, it } from "vitest";
import {
  buildReviewClassificationPrompt,
  classifyReviewText,
  classifyReviewTextDeterministic,
  parseReviewClassification,
} from "./review-classifier";

describe("review classifier", () => {
  it("classifies delay, cold food, and actionable negative sentiment deterministically", () => {
    expect(classifyReviewTextDeterministic({
      text: "Sipariş çok geç geldi ve yemek buz gibi soğuktu.",
      rating: 1,
    })).toMatchObject({
      sentiment: "negative",
      topics: expect.arrayContaining(["delivery_delay", "cold_food"]),
      severity_hint: "high",
      critical_topic: false,
      actionable: true,
    });
  });

  it("marks payment system down as a critical actionable topic", () => {
    expect(classifyReviewTextDeterministic({
      text: "POS çalışmıyor, ödeme sistemi tamamen kapalı.",
      rating: 2,
    })).toMatchObject({
      sentiment: "negative",
      topics: expect.arrayContaining(["payment_failed", "payment_system_down"]),
      severity_hint: "critical",
      critical_topic: true,
      actionable: true,
    });
  });

  it("parses model JSON with zod defaults and strips code fences", () => {
    expect(parseReviewClassification(`\`\`\`json
{"sentiment":"negative","topics":["foreign_object"],"topic_confidence":0.91,"severity_hint":"critical","critical_topic":true,"actionable":true}
\`\`\``)).toEqual({
      sentiment: "negative",
      topics: ["foreign_object"],
      topic_confidence: 0.91,
      severity_hint: "critical",
      critical_topic: true,
      actionable: true,
    });
  });

  it("falls back safely when model output is malformed", async () => {
    const result = await classifyReviewText({
      text: "Yemek geç geldi.",
      rating: 2,
    }, {
      createMessage: async () => ({
        content: [{ type: "text", text: "not-json" }],
        usage: { input_tokens: 30, output_tokens: 5 },
      }),
    });

    expect(result.usedFallback).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 5 });
    expect(result.classification.topics).toContain("delivery_delay");
  });

  it("builds a constrained prompt without secret material", () => {
    const prompt = buildReviewClassificationPrompt({
      text: "Ödeme hatası aldım.",
      rating: 1,
    });

    expect(prompt).toContain("allowed_topics");
    expect(prompt).toContain("payment_system_down");
    expect(prompt).not.toContain("ANTHROPIC_API_KEY");
  });
});
