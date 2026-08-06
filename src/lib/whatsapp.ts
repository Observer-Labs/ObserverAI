import crypto from "crypto";
import type { Cluster } from "./types";
import { requireEnvGroup } from "@/env";
import { getTranslations } from "next-intl/server";

const DEFAULT_GRAPH_VERSION = "v23.0";

export type WhatsAppInbound = {
  sender: string;
  content: string;
  channel: "whatsapp";
  timestamp: string;
  messageId?: string;
};

type MetaTextMessage = {
  id: string;
};

type MetaMessagesResponse = {
  messages?: MetaTextMessage[];
};

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function toMetaRecipient(value: string) {
  return normalizeWhatsAppNumber(value).replace(/^\+/, "");
}

function getGraphBaseUrl() {
  const version = process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

async function sendMetaTextMessage(toNumber: string, body: string) {
  const env = requireEnvGroup("whatsapp");
  const recipient = toMetaRecipient(toNumber);
  if (!recipient) throw new Error("Invalid WhatsApp recipient number");

  const res = await fetch(`${getGraphBaseUrl()}/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: true,
        body,
      },
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as MetaMessagesResponse & {
    error?: { message?: string; code?: number };
  };

  if (!res.ok) {
    const detail = payload.error?.message ?? `Meta WhatsApp API returned ${res.status}`;
    throw new Error(detail);
  }

  return payload;
}

export async function sendWhatsAppTextMessage(toNumber: string, body: string) {
  return sendMetaTextMessage(toNumber, body);
}

type MetaTemplateBodyParam = { type: "text"; text: string };

async function sendMetaTemplateMessage(
  toNumber: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[] = [],
) {
  const env = requireEnvGroup("whatsapp");
  const recipient = toMetaRecipient(toNumber);
  if (!recipient) throw new Error("Invalid WhatsApp recipient number");

  const res = await fetch(`${getGraphBaseUrl()}/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(bodyParams.length > 0
          ? {
              components: [
                {
                  type: "body",
                  parameters: bodyParams.map((text): MetaTemplateBodyParam => ({ type: "text", text })),
                },
              ],
            }
          : {}),
      },
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as MetaMessagesResponse & {
    error?: { message?: string; code?: number };
  };

  if (!res.ok) {
    const detail = payload.error?.message ?? `Meta WhatsApp API returned ${res.status}`;
    throw new Error(detail);
  }

  return payload;
}

export async function sendWhatsAppConsentRequest(toNumber: string, locale = "tr") {
  const templateName = process.env.META_WHATSAPP_CONSENT_TEMPLATE_NAME?.trim() || "hello_world";
  const languageCode =
    process.env.META_WHATSAPP_CONSENT_TEMPLATE_LANGUAGE?.trim() ||
    (templateName === "hello_world" ? "en_US" : locale === "tr" ? "tr" : "en_US");

  return sendMetaTemplateMessage(toNumber, templateName, languageCode);
}

export async function sendWhatsAppWelcomeMessage(toNumber: string, locale = "tr") {
  const body =
    locale === "tr"
      ? "ObserverAI'a hoş geldiniz! Bundan sonra önemli müşteri sinyalleri ve aksiyon önerileri her zaman cebinizde."
      : "Welcome to ObserverAI. From now on, important customer signals and action suggestions are always in your pocket.";

  return sendMetaTextMessage(toNumber, body);
}

type WhatsAppAlertOptions = {
  locale?: string;
  branchName?: string | null;
};

function alertLabels(locale: string) {
  if (locale === "tr") {
    return {
      alertTitle: "Observer Uyarısı",
      severityHigh: "YÜKSEK",
      severityMedium: "ORTA",
      severityLow: "DÜŞÜK",
      what: "Ne oluyor",
      rootCause: "Kök neden",
      action: "Ne yapmalı",
      impact: "Maliyet",
      evidence: "Kanıt",
      view: "Görüntüle",
      reply: "Yanıtla: 1 detaylar · 2 hallettim · 3 geç",
      customerSignal: "müşteri sinyali",
      fallbackRootCause: "Aynı şube ve zaman penceresinde birden fazla kaynak aynı sorunu işaret ediyor.",
    };
  }

  return {
    alertTitle: "Observer Alert",
    severityHigh: "HIGH",
    severityMedium: "MEDIUM",
    severityLow: "LOW",
    what: "What is happening",
    rootCause: "Root cause",
    action: "What to do",
    impact: "Impact",
    evidence: "Evidence",
    view: "View",
    reply: "Reply: 1 details · 2 on it · 3 skip",
    customerSignal: "customer signal",
    fallbackRootCause: "Multiple sources point to the same issue in the same branch and time window.",
  };
}

export function buildWhatsAppAlertBody(
  cluster: Cluster,
  input: {
    baseUrl: string;
    locale?: string;
    branchName?: string | null;
  },
) {
  const locale = input.locale ?? "tr";
  const labels = alertLabels(locale);
  const severityEmoji = cluster.severity >= 70 ? "🔴" : cluster.severity >= 40 ? "🟡" : "🟢";
  const severityLabel =
    cluster.severity >= 70 ? labels.severityHigh : cluster.severity >= 40 ? labels.severityMedium : labels.severityLow;
  const branchLabel = input.branchName?.trim() || (locale === "tr" ? "Şube" : "Branch");
  const signalSuffix = cluster.evidence_count === 1 ? "" : locale === "tr" ? "" : "s";
  const viewUrl = `${input.baseUrl}/dashboard?gap=${cluster.id}&branch=${cluster.branch_id}`;
  const impactLine = cluster.projected_impact ? `\n${labels.impact}: ${cluster.projected_impact}` : "";

  return `${severityEmoji} *${branchLabel}* · ${severityLabel}
*${cluster.title}*

${labels.what}: ${cluster.business_case}
${labels.rootCause}: ${cluster.root_cause || labels.fallbackRootCause}${impactLine}
${labels.action}: ${cluster.recommended_action}

${labels.evidence}: ${cluster.evidence_count} ${labels.customerSignal}${signalSuffix}
${labels.view}: ${viewUrl}

${labels.reply}`;
}

/**
 * Meta template parameters must be single-line (no newlines/tabs, no 4+
 * consecutive spaces), otherwise the API rejects the send.
 */
function sanitizeTemplateParam(value: string) {
  return value.replace(/\s+/g, " ").trim() || "-";
}

export function isWhatsAppAlertTemplateConfigured() {
  return Boolean(process.env.META_WHATSAPP_ALERT_TEMPLATE_NAME?.trim());
}

/**
 * Body parameter contract for the approved proactive alert template.
 * The Meta template must declare exactly these positional params:
 * {{1}} branch · {{2}} severity label · {{3}} title · {{4}} what is happening
 * {{5}} root cause · {{6}} action · {{7}} dashboard URL
 * The reply instructions (1 details · 2 on it · 3 skip) live in the
 * template's fixed text.
 */
export function buildWhatsAppAlertTemplateParams(
  cluster: Cluster,
  input: { baseUrl: string; locale?: string; branchName?: string | null },
): string[] {
  const locale = input.locale ?? "tr";
  const labels = alertLabels(locale);
  const severityLabel =
    cluster.severity >= 70 ? labels.severityHigh : cluster.severity >= 40 ? labels.severityMedium : labels.severityLow;
  const branchLabel = input.branchName?.trim() || (locale === "tr" ? "Şube" : "Branch");
  const impactSuffix = cluster.projected_impact ? ` (${labels.impact}: ${cluster.projected_impact})` : "";

  return [
    branchLabel,
    severityLabel,
    cluster.title,
    `${cluster.business_case}${impactSuffix}`,
    cluster.root_cause || labels.fallbackRootCause,
    cluster.recommended_action,
    `${input.baseUrl}/dashboard?gap=${cluster.id}&branch=${cluster.branch_id}`,
  ].map(sanitizeTemplateParam);
}

export async function sendWhatsAppAlert(
  toNumber: string,
  cluster: Cluster,
  localeOrOptions: string | WhatsAppAlertOptions = "tr",
) {
  const coreEnv = requireEnvGroup("core");
  const options = typeof localeOrOptions === "string" ? { locale: localeOrOptions } : localeOrOptions;
  const locale = options.locale ?? "tr";
  await getTranslations({ locale, namespace: "whatsapp" });

  // Proactive sends outside Meta's 24h customer-service window require an
  // approved template. Use it when configured; otherwise fall back to free
  // text, which Meta only delivers inside the 24h window.
  const templateName = process.env.META_WHATSAPP_ALERT_TEMPLATE_NAME?.trim();
  if (templateName) {
    const languageCode =
      process.env.META_WHATSAPP_ALERT_TEMPLATE_LANGUAGE?.trim() || (locale === "tr" ? "tr" : "en_US");
    const params = buildWhatsAppAlertTemplateParams(cluster, {
      baseUrl: coreEnv.NEXTAUTH_URL,
      locale,
      branchName: options.branchName,
    });
    return sendMetaTemplateMessage(toNumber, templateName, languageCode, params);
  }

  const body = buildWhatsAppAlertBody(cluster, {
    baseUrl: coreEnv.NEXTAUTH_URL,
    locale,
    branchName: options.branchName,
  });

  return sendMetaTextMessage(toNumber, body);
}

export function verifyMetaWebhookToken(token: string | null) {
  return Boolean(token && token === process.env.META_WHATSAPP_VERIFY_TOKEN);
}

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const provided = signatureHeader;
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          text?: { body?: string };
          type?: string;
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          recipient_id?: string;
          timestamp?: string;
          errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
        }>;
      };
    }>;
  }>;
};

export function extractWhatsAppDeliveryStatuses(payload: MetaWebhookPayload) {
  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []),
  );
}

export function parseInboundWhatsApp(payload: MetaWebhookPayload): WhatsAppInbound[] {
  const messages: WhatsAppInbound[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const content = message.text?.body?.trim();
        const sender = message.from ? normalizeWhatsAppNumber(message.from) : "";
        if (!content || !sender) continue;

        messages.push({
          sender,
          content,
          channel: "whatsapp",
          timestamp: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          messageId: message.id,
        });
      }
    }
  }

  return messages;
}

export type WhatsAppDecisionReply = "details" | "approve" | "dismiss";

/**
 * Parses the "1 detaylar · 2 hallettim · 3 geç" reply promised in every
 * alert message. Only unambiguous single tokens are accepted so normal
 * conversation never triggers a decision.
 */
export function parseWhatsAppDecisionReply(content: string): WhatsAppDecisionReply | null {
  const normalized = content
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[.!?]+$/g, "")
    .trim();

  if (["1", "detay", "detaylar", "details"].includes(normalized)) return "details";
  if (["2", "hallettim", "done"].includes(normalized)) return "approve";
  if (["3", "geç", "gec", "skip"].includes(normalized)) return "dismiss";
  return null;
}

export function isWhatsAppConsentReply(content: string) {
  const normalized = content
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[.!?]/g, "");

  return [
    "onay",
    "onayliyorum",
    "onaylıyorum",
    "evet",
    "tamam",
    "approve",
    "approved",
    "yes",
    "ok",
  ].includes(normalized);
}
