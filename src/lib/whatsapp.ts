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

async function sendMetaTemplateMessage(toNumber: string, templateName: string, languageCode: string) {
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

export async function sendWhatsAppAlert(toNumber: string, cluster: Cluster, locale = "tr") {
  const coreEnv = requireEnvGroup("core");
  const t = await getTranslations({ locale, namespace: "whatsapp" });
  const severityEmoji = cluster.severity >= 70 ? "🔴" : cluster.severity >= 40 ? "🟡" : "🟢";
  const severityLabel =
    cluster.severity >= 70 ? t("severityHigh") : cluster.severity >= 40 ? t("severityMedium") : t("severityLow");

  const body = `${severityEmoji} *${t("alertTitle")}*
*${cluster.title}*
${severityLabel}

${cluster.business_case}

${t("actionLabel")}: ${cluster.recommended_action}

${t("evidenceLabel")}: ${cluster.evidence_count}
${t("viewLabel")}: ${coreEnv.NEXTAUTH_URL}/dashboard?gap=${cluster.id}

${t("replyHint")}`;

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
