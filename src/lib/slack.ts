import { WebClient } from "@slack/web-api";
import type { Cluster } from "./types";

export function getSlackClient(token: string) {
  return new WebClient(token);
}

export async function fetchSlackMessages(token: string, channelIds: string[], daysBack = 7) {
  const client = getSlackClient(token);
  const signals: { channel: string; sender: string; content: string; timestamp: string }[] = [];
  const oldest = String(Math.floor(Date.now() / 1000) - daysBack * 86400);

  for (const channelId of channelIds) {
    try {
      const history = await client.conversations.history({
        channel: channelId,
        oldest,
        limit: 200,
      });

      for (const msg of history.messages ?? []) {
        // Skip bots and system messages
        if (msg.bot_id || msg.subtype || !msg.text?.trim()) continue;
        signals.push({
          channel: channelId,
          sender: msg.user ?? "unknown",
          content: msg.text,
          timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
        });
      }
    } catch {
      console.error(`Failed to fetch messages for channel ${channelId}`);
    }
  }

  return signals;
}

export async function getChannelList(token: string) {
  const client = getSlackClient(token);
  const result = await client.conversations.list({ types: "public_channel,private_channel", limit: 200 });
  return result.channels?.map((c) => ({ id: c.id!, name: c.name! })) ?? [];
}

export function buildSlackBlocks(cluster: Cluster) {
  const severityEmoji = cluster.severity >= 70 ? "🔴" : cluster.severity >= 40 ? "🟡" : "🟢";
  const severityLabel = cluster.severity >= 70 ? "HIGH" : cluster.severity >= 40 ? "MEDIUM" : "LOW";

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${severityEmoji} Observer, Intent Gap Detected`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${cluster.title}*\n${cluster.business_case}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "View Full Brief" },
        url: `${process.env.NEXTAUTH_URL}/dashboard?gap=${cluster.id}`,
        action_id: "view_brief",
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Severity*\n${severityLabel} (${cluster.severity}/100)` },
        { type: "mrkdwn", text: `*Confidence*\n${Math.round(cluster.confidence * 100)}%` },
        { type: "mrkdwn", text: `*Evidence*\n${cluster.evidence_count} signals` },
        { type: "mrkdwn", text: `*Sources*\nSlack: ${cluster.source_breakdown.slack} · Email: ${cluster.source_breakdown.email} · WhatsApp: ${cluster.source_breakdown.whatsapp}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommended Action*\n${cluster.recommended_action}`,
      },
    },
    ...(cluster.customer_quote
      ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `> _"${cluster.customer_quote}"_`,
          },
        }]
      : []),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Approve" },
          style: "primary",
          action_id: "approve_gap",
          value: cluster.id,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Reject" },
          style: "danger",
          action_id: "reject_gap",
          value: cluster.id,
        },
      ],
    },
    { type: "divider" },
  ];
}

export async function postToSlack(token: string, channelId: string, cluster: Cluster) {
  const client = getSlackClient(token);
  return client.chat.postMessage({
    channel: channelId,
    blocks: buildSlackBlocks(cluster),
    text: `Observer: Intent Gap, ${cluster.title}`,
  });
}
