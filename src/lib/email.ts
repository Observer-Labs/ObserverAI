import nodemailer from "nodemailer";
import type { Cluster } from "./types";
import { EnvValidationError, requireEnvGroup } from "@/env";
import { getTranslations } from 'next-intl/server';

export function createTransport() {
  const env = requireEnvGroup("email");
  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: Number(env.EMAIL_PORT),
    secure: false,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
}

export function getEmailFrom() {
  const env = requireEnvGroup("email");
  return process.env.EMAIL_FROM ?? `Observer <${env.EMAIL_USER}>`;
}

export async function buildEmailHTML(
  clusters: Cluster[],
  deliveryIds?: Record<string, string>,
  locale = 'tr'
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'email' });

  const rows = clusters
    .map((c) => {
      const color = c.severity >= 70 ? "#ff5c7a" : c.severity >= 40 ? "#ffd166" : "#46e6a6";
      const label = c.severity >= 70 ? t('highLabel') : c.severity >= 40 ? t('mediumLabel') : t('lowLabel');
      const deliveryId = deliveryIds?.[c.id];
      const approveUrl = deliveryId
        ? `${process.env.NEXTAUTH_URL}/api/respond?id=${deliveryId}&action=approve`
        : null;
      const rejectUrl = deliveryId
        ? `${process.env.NEXTAUTH_URL}/api/respond?id=${deliveryId}&action=reject`
        : null;

      return `
      <tr>
        <td style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:700;text-transform:uppercase">${label}</span>
            <strong style="color:#ffffff;font-size:15px">${c.title}</strong>
          </div>
          <p style="color:#9aa3b2;margin:0 0 8px;font-size:13px">${c.business_case}</p>
          <p style="color:#6ea8ff;margin:0 0 12px;font-size:13px"><strong>${t('actionLabel')}:</strong> ${c.recommended_action}</p>
          <div style="display:flex;gap:16px;font-size:12px;color:#9aa3b2">
            <span>${t('signalsCount').replace('{n}', String(c.evidence_count))}</span>
            <span>${t('confidenceLabel')}: ${Math.round(c.confidence * 100)}%</span>
          </div>
          ${c.customer_quote ? `<blockquote style="border-left:3px solid #46e6a6;margin:12px 0 0;padding-left:12px;color:#9aa3b2;font-style:italic;font-size:13px">"${c.customer_quote}"</blockquote>` : ""}
          <div style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <a href="${process.env.NEXTAUTH_URL}/dashboard?gap=${c.id}" style="background:#46e6a6;color:#0b0c10;padding:7px 16px;border-radius:9999px;text-decoration:none;font-size:12px;font-weight:600">${t('viewBrief')}</a>
            ${approveUrl ? `<a href="${approveUrl}" style="background:rgba(70,230,166,0.12);color:#46e6a6;border:1px solid rgba(70,230,166,0.3);padding:7px 16px;border-radius:9999px;text-decoration:none;font-size:12px;font-weight:600">${t('approve')}</a>` : ""}
            ${rejectUrl ? `<a href="${rejectUrl}" style="background:rgba(255,92,122,0.12);color:#ff5c7a;border:1px solid rgba(255,92,122,0.3);padding:7px 16px;border-radius:9999px;text-decoration:none;font-size:12px;font-weight:600">${t('reject')}</a>` : ""}
          </div>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0c10;font-family:Inter,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0c10;min-height:100vh">
    <tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="padding:0 0 32px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:28px;height:28px;border-radius:50%;background:conic-gradient(from 0deg,#46e6a6,#6ea8ff,#a78bfa,#46e6a6)"></div>
            <strong style="color:#ffffff;font-size:18px">Observer</strong>
            <span style="color:#9aa3b2;font-size:13px">· Product Reality Layer</span>
          </div>
          <h1 style="color:#ffffff;font-size:24px;margin:24px 0 8px">Intent Gap Report</h1>
          <p style="color:#9aa3b2;margin:0;font-size:14px">${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </td></tr>
        <!-- Gaps -->
        <tr><td style="background:#121526;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0;text-align:center">
          <p style="color:#9aa3b2;font-size:12px;margin:0">
            Sent by Observer AI · <a href="${process.env.NEXTAUTH_URL}/settings/distribution" style="color:#46e6a6">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmailBrief(
  recipients: string[],
  clusters: Cluster[],
  deliveryIds?: Record<string, string>,
  locale = 'tr'
) {
  const transport = createTransport();
  const html = await buildEmailHTML(clusters, deliveryIds, locale);
  const t = await getTranslations({ locale, namespace: 'email' });

  await transport.sendMail({
    from: getEmailFrom(),
    to: recipients.join(", "),
    subject: t('digestSubject'),
    html,
  });
}

// Gmail OAuth helpers
export function getGmailAuthUrl(workspaceId: string) {
  const env = requireEnvGroup("gmail");
  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new EnvValidationError("Gmail OAuth", ["NEXTAUTH_URL"]);
  }
  const params = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    redirect_uri: `${siteUrl}/api/auth/gmail-callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    state: workspaceId,
  });
  return `https://accounts.google.com/o/oauth2/auth?${params}`;
}

export async function exchangeGmailCode(code: string) {
  const env = requireEnvGroup("gmail");
  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new EnvValidationError("Gmail OAuth", ["NEXTAUTH_URL"]);
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      redirect_uri: `${siteUrl}/api/auth/gmail-callback`,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function fetchGmailMessages(accessToken: string, maxResults = 100) {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const list = await listRes.json();
  const messages: { channel: string; sender: string; content: string; timestamp: string }[] = [];

  for (const msg of (list.messages ?? []).slice(0, 50)) {
    try {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await detail.json();
      const headers = data.payload?.headers ?? [];
      const subject = headers.find((h: { name: string; value: string }) => h.name === "Subject")?.value ?? "(no subject)";
      const from = headers.find((h: { name: string; value: string }) => h.name === "From")?.value ?? "unknown";
      const date = headers.find((h: { name: string; value: string }) => h.name === "Date")?.value;
      const body = data.snippet ?? "";

      messages.push({
        channel: "inbox",
        sender: from,
        content: `Subject: ${subject}\n${body}`,
        timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
      });
    } catch {
      // skip individual failures
    }
  }

  return messages;
}
