import Anthropic from "@anthropic-ai/sdk";
import type { Signal, AnalysisResult, VerticalType } from "./types";
import { buildSystemPrompt } from "./industry-presets";
import { requireEnvGroup } from "@/env";

function getClient() {
  const env = requireEnvGroup("core");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export interface AnalyzeUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AnalyzeOutput {
  results: AnalysisResult[];
  usage: AnalyzeUsage;
}

export async function analyzeSignals(signals: Signal[], vertical: VerticalType = "auto"): Promise<AnalyzeOutput> {
  const signalTexts = signals
    .map((s) => `[${s.source.toUpperCase()}][${s.channel}] ${s.content}`)
    .join("\n");

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: buildSystemPrompt(vertical),
    messages: [
      {
        role: "user",
        content: `Analyze these ${signals.length} signals and identify intent gaps:\n\n${signalTexts}`,
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "[]";

  // Strip markdown code fences Claude sometimes wraps the JSON in
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: AnalysisResult[];
  try {
    parsed = JSON.parse(text) as AnalysisResult[];
  } catch (parseErr) {
    console.error("[analyzeSignals] Failed to parse Claude response as JSON:", parseErr, "\nRaw response:", rawText);
    throw new Error("AI returned an unexpected format, please try the analysis again.");
  }

  return {
    results: parsed,
    usage: {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    },
  };
}

export async function generateIntentSnapshot(cluster: import("./types").Cluster) {
  const message = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: "You are a senior product manager. Generate a precise intent snapshot for the given product gap. Return valid JSON only.",
    messages: [
      {
        role: "user",
        content: `Generate an intent snapshot for this product gap:
Title: ${cluster.title}
Business Case: ${cluster.business_case}
Recommended Action: ${cluster.recommended_action}
Evidence Count: ${cluster.evidence_count}
Customer Quote: "${cluster.customer_quote}"

Return JSON with: problem_statement, recommended_solution, acceptance_criteria (array of strings), success_metrics (array of strings), effort_estimate (string like "S/M/L - X sprints")`,
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function generateSlackBrief(cluster: import("./types").Cluster) {
  const message = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Write a concise Slack message brief for this product gap. 2-3 sentences max. Include severity emoji (🔴 high, 🟡 medium, 🟢 low).
Title: ${cluster.title}
Business Case: ${cluster.business_case}
Severity: ${cluster.severity}/100`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}
