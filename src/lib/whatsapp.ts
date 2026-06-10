import twilio from "twilio";
import type { Cluster } from "./types";
import { requireEnvGroup } from "@/env";
import { getTranslations } from 'next-intl/server';

export function getTwilioClient() {
  const env = requireEnvGroup("whatsapp");
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export async function sendWhatsAppAlert(toNumber: string, cluster: Cluster, locale = 'tr') {
  const client = getTwilioClient();
  const env = requireEnvGroup("whatsapp");
  const coreEnv = requireEnvGroup("core");
  const t = await getTranslations({ locale, namespace: 'whatsapp' });
  const severityEmoji = cluster.severity >= 70 ? "🔴" : cluster.severity >= 40 ? "🟡" : "🟢";
  const severityLabel = cluster.severity >= 70 ? t('severityHigh') : cluster.severity >= 40 ? t('severityMedium') : t('severityLow');

  const body = `${severityEmoji} *${t('alertTitle')}*
*${cluster.title}*
${severityLabel} (${cluster.severity}/100)

${cluster.business_case}

${t('actionLabel')}: ${cluster.recommended_action}

${t('evidenceLabel')}: ${cluster.evidence_count}
${t('viewLabel')}: ${coreEnv.NEXTAUTH_URL}/dashboard?gap=${cluster.id}`;

  return client.messages.create({
    body,
    from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${toNumber}`,
  });
}

export function parseInboundWhatsApp(body: Record<string, string>) {
  return {
    sender: body.From?.replace("whatsapp:", "") ?? "unknown",
    content: body.Body ?? "",
    channel: "whatsapp",
    timestamp: new Date().toISOString(),
  };
}

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const client = twilio;
  return client.validateRequest(authToken, signature, url, params);
}
