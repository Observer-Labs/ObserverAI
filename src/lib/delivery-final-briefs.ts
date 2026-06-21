import Anthropic from "@anthropic-ai/sdk";
import { candidateToCluster, type CandidateClusterInsert } from "./delivery-candidate-clusters";
import type { SignalCandidate } from "./daily-signal-rules";

export interface DeliveryFinalBrief {
  title: string;
  business_case: string;
  recommended_action: string;
  root_cause?: string;
  projected_impact?: string;
}

export interface DeliveryFinalBriefResult {
  cluster: CandidateClusterInsert;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  usedFallback: boolean;
}

type MessageCreate = (args: {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user"; content: string }>;
}) => Promise<{
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}>;

export interface GenerateDeliveryFinalBriefOptions {
  createMessage?: MessageCreate | null;
}

const MODEL = "claude-sonnet-4-5";

export async function generateDeliveryFinalBrief(
  candidate: SignalCandidate,
  metricDate: string,
  options: GenerateDeliveryFinalBriefOptions = {},
): Promise<DeliveryFinalBriefResult> {
  const fallback = candidateToCluster(candidate, metricDate);
  const createMessage = options.createMessage === undefined
    ? defaultMessageCreate()
    : options.createMessage;

  if (!createMessage) {
    return {
      cluster: fallback,
      usage: { inputTokens: 0, outputTokens: 0 },
      usedFallback: true,
    };
  }

  try {
    const message = await createMessage({
      model: MODEL,
      max_tokens: 900,
      system: [
        "You are Observer's QSR operations analyst.",
        "Turn deterministic delivery anomaly evidence into a concise Turkish manager brief.",
        "Return valid JSON only. Do not include hidden scores or confidence.",
      ].join(" "),
      messages: [{
        role: "user",
        content: buildDeliveryFinalBriefPrompt(candidate, metricDate),
      }],
    });
    const rawText = message.content[0]?.type === "text" ? message.content[0].text ?? "" : "";
    const parsed = parseDeliveryFinalBrief(rawText);

    if (!parsed) {
      return {
        cluster: fallback,
        usage: {
          inputTokens: message.usage?.input_tokens ?? 0,
          outputTokens: message.usage?.output_tokens ?? 0,
        },
        usedFallback: true,
      };
    }

    return {
      cluster: {
        ...fallback,
        title: parsed.title,
        business_case: parsed.business_case,
        recommended_action: parsed.recommended_action,
        root_cause: parsed.root_cause ?? fallback.root_cause,
        projected_impact: parsed.projected_impact ?? fallback.projected_impact,
      },
      usage: {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
      usedFallback: false,
    };
  } catch {
    return {
      cluster: fallback,
      usage: { inputTokens: 0, outputTokens: 0 },
      usedFallback: true,
    };
  }
}

export function buildDeliveryFinalBriefPrompt(candidate: SignalCandidate, metricDate: string) {
  return JSON.stringify({
    metric_date: metricDate,
    candidate: {
      kind: candidate.kind,
      platform: candidate.platform,
      topic: candidate.topic,
      business_impact: candidate.businessImpact,
      evidence_count: candidate.evidenceCount,
      evidence: candidate.evidence,
    },
    required_json_shape: {
      title: "short Turkish title, max 90 chars",
      business_case: "what happened and why it matters, max 240 chars",
      recommended_action: "specific action for branch manager, max 220 chars",
      root_cause: "likely root cause, max 180 chars",
      projected_impact: "business impact summary, max 160 chars",
    },
  });
}

export function parseDeliveryFinalBrief(rawText: string): DeliveryFinalBrief | null {
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<DeliveryFinalBrief>;
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.business_case !== "string" ||
      typeof parsed.recommended_action !== "string"
    ) {
      return null;
    }

    return {
      title: parsed.title.trim(),
      business_case: parsed.business_case.trim(),
      recommended_action: parsed.recommended_action.trim(),
      root_cause: typeof parsed.root_cause === "string" ? parsed.root_cause.trim() : undefined,
      projected_impact: typeof parsed.projected_impact === "string" ? parsed.projected_impact.trim() : undefined,
    };
  } catch {
    return null;
  }
}

function defaultMessageCreate(): MessageCreate | null {
  const apiKey = process.env[`ANTHROPIC_${"API"}_KEY`]?.trim();
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return (args) => client.messages.create(args);
}
