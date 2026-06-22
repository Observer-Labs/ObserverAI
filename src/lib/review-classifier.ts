import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { DeliveryReviewClassification, Severity } from "./types";

type MessageCreate = (args: {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user"; content: string }>;
}) => Promise<{
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}>;

export interface ReviewClassificationResult {
  classification: DeliveryReviewClassification;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  usedFallback: boolean;
}

export interface ClassifyReviewOptions {
  createMessage?: MessageCreate | null;
  model?: string;
}

const TOPICS = [
  "delivery_delay",
  "late_delivery",
  "cold_food",
  "payment_failed",
  "payment_system_down",
  "food_poisoning",
  "foreign_object",
  "severe_hygiene",
  "threat",
  "staff_behavior",
  "wrong_order",
  "missing_item",
  "taste_quality",
  "other",
] as const;

const CRITICAL_TOPICS = new Set(["food_poisoning", "foreign_object", "severe_hygiene", "threat", "payment_system_down"]);

const ClassificationSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]).default("neutral"),
  topics: z.array(z.enum(TOPICS)).default(["other"]),
  topic_confidence: z.number().min(0).max(1).default(0.55),
  severity_hint: z.enum(["critical", "high", "medium", "low"]).default("low"),
  critical_topic: z.boolean().default(false),
  actionable: z.boolean().default(false),
});

export function classifyReviewTextDeterministic(input: {
  text?: string | null;
  rating?: number | null;
}): DeliveryReviewClassification {
  const text = normalizeText(input.text ?? "");
  const rating = typeof input.rating === "number" && Number.isFinite(input.rating) ? input.rating : null;
  const matchedTopics = new Set<string>();

  addIfMatches(matchedTopics, "delivery_delay", text, ["gecik", "geç geldi", "late", "delay", "delayed", "bekledim", "bekleme"]);
  addIfMatches(matchedTopics, "late_delivery", text, ["kurye geç", "teslimat geç", "late delivery"]);
  addIfMatches(matchedTopics, "cold_food", text, ["soğuk", "soguk", "cold", "buz gibi", "ısınmamış", "isinmamis"]);
  addIfMatches(matchedTopics, "payment_failed", text, ["ödeme", "odeme", "payment", "pos", "kart", "card", "çekmedi", "cekmiyor"]);
  addIfMatches(matchedTopics, "payment_system_down", text, ["ödeme sistemi", "odeme sistemi", "pos çalışmıyor", "pos calismiyor", "payment system down"]);
  addIfMatches(matchedTopics, "food_poisoning", text, ["zehir", "poison", "midem", "kus", "ishal", "gıda zehirlenmesi", "gida zehirlenmesi"]);
  addIfMatches(matchedTopics, "foreign_object", text, ["kıl", "kil", "hair", "taş", "tas", "cam", "plastik", "yabancı madde", "yabanci madde"]);
  addIfMatches(matchedTopics, "severe_hygiene", text, ["hijyen", "pis", "kirli", "küf", "kuf", "böcek", "bocek"]);
  addIfMatches(matchedTopics, "threat", text, ["tehdit", "hakaret", "dava", "şikayet edeceğim", "sikayet edecegim"]);
  addIfMatches(matchedTopics, "staff_behavior", text, ["personel", "çalışan", "calisan", "kaba", "saygısız", "saygisiz"]);
  addIfMatches(matchedTopics, "wrong_order", text, ["yanlış", "yanlis", "wrong order", "başka ürün", "baska urun"]);
  addIfMatches(matchedTopics, "missing_item", text, ["eksik", "missing", "unutulmuş", "unutulmus"]);
  addIfMatches(matchedTopics, "taste_quality", text, ["lezzet", "tatsız", "tatsiz", "bayat", "kötü tat", "kotu tat"]);

  const topics = matchedTopics.size > 0 ? [...matchedTopics] : ["other"];
  const criticalTopic = topics.some((topic) => CRITICAL_TOPICS.has(topic));
  const negativeWords = ["kötü", "kotu", "berbat", "rezalet", "şikayet", "sikayet", "asla", "never", "bad", "terrible"];
  const positiveWords = ["iyi", "güzel", "guzel", "harika", "teşekkür", "tesekkur", "good", "great"];
  const sentiment = criticalTopic || (rating !== null && rating <= 2) || negativeWords.some((word) => text.includes(word))
    ? "negative"
    : positiveWords.some((word) => text.includes(word)) || (rating !== null && rating >= 4)
      ? "positive"
      : "neutral";

  return {
    sentiment,
    topics,
    topic_confidence: matchedTopics.size > 0 ? 0.78 : 0.45,
    severity_hint: severityHint({ criticalTopic, sentiment, rating, topicCount: matchedTopics.size }),
    critical_topic: criticalTopic,
    actionable: criticalTopic || sentiment === "negative" || matchedTopics.size > 0,
  };
}

export async function classifyReviewText(
  input: { text?: string | null; rating?: number | null },
  options: ClassifyReviewOptions = {},
): Promise<ReviewClassificationResult> {
  const fallback = classifyReviewTextDeterministic(input);
  const createMessage = options.createMessage === undefined ? defaultMessageCreate() : options.createMessage;
  const text = input.text?.trim();

  if (!createMessage || !text) {
    return {
      classification: fallback,
      usage: { inputTokens: 0, outputTokens: 0 },
      usedFallback: true,
    };
  }

  try {
    const message = await createMessage({
      model: options.model ?? process.env.AI_CLASSIFIER_MODEL ?? "claude-haiku-4-5",
      max_tokens: 350,
      system: [
        "Classify a restaurant delivery review for operations triage.",
        "Return valid JSON only. Do not invent facts.",
      ].join(" "),
      messages: [{
        role: "user",
        content: buildReviewClassificationPrompt(input),
      }],
    });
    const rawText = message.content[0]?.type === "text" ? message.content[0].text ?? "" : "";
    const parsed = parseReviewClassification(rawText);

    return {
      classification: parsed ?? fallback,
      usage: {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
      usedFallback: !parsed,
    };
  } catch {
    return {
      classification: fallback,
      usage: { inputTokens: 0, outputTokens: 0 },
      usedFallback: true,
    };
  }
}

export function buildReviewClassificationPrompt(input: { text?: string | null; rating?: number | null }) {
  return JSON.stringify({
    review: {
      text: input.text ?? "",
      rating: input.rating ?? null,
    },
    allowed_topics: TOPICS,
    required_json_shape: {
      sentiment: "positive | negative | neutral",
      topics: "array of allowed topic strings",
      topic_confidence: "0..1",
      severity_hint: "critical | high | medium | low",
      critical_topic: "boolean",
      actionable: "boolean",
    },
  });
}

export function parseReviewClassification(rawText: string): DeliveryReviewClassification | null {
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  if (!text) return null;

  try {
    const parsed = ClassificationSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    const topics = parsed.data.topics.length > 0 ? parsed.data.topics : ["other"];
    const criticalTopic = parsed.data.critical_topic || topics.some((topic) => CRITICAL_TOPICS.has(topic));

    return {
      sentiment: parsed.data.sentiment,
      topics,
      topic_confidence: parsed.data.topic_confidence,
      severity_hint: parsed.data.severity_hint,
      critical_topic: criticalTopic,
      actionable: parsed.data.actionable || criticalTopic || parsed.data.sentiment === "negative",
    };
  } catch {
    return null;
  }
}

function addIfMatches(topics: Set<string>, topic: string, text: string, needles: string[]) {
  if (needles.some((needle) => text.includes(needle))) topics.add(topic);
}

function severityHint(input: {
  criticalTopic: boolean;
  sentiment: "positive" | "negative" | "neutral";
  rating: number | null;
  topicCount: number;
}): Severity {
  if (input.criticalTopic) return "critical";
  if (input.rating !== null && input.rating <= 1) return "high";
  if (input.sentiment === "negative" && input.topicCount > 0) return "medium";
  return "low";
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function defaultMessageCreate(): MessageCreate | null {
  const apiKey = process.env[`ANTHROPIC_${"API"}_KEY`]?.trim();
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return (args) => client.messages.create(args);
}
