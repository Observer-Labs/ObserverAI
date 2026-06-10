export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { buildSlackBlocks } from "@/lib/slack";
import type { Cluster } from "@/lib/types";

// ── Verify Slack request signature ───────────────────────────────────────────

function verifySlackSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // skip in dev if not set

  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  // Reject stale requests (>5 min)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends interactive payloads as URL-encoded `payload` field
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return NextResponse.json({ error: "No payload" }, { status: 400 });
  }

  let payload: {
    type: string;
    actions?: { action_id: string; value: string }[];
    user?: { id: string; name: string };
    response_url?: string;
    channel?: { id: string };
  };

  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Only handle block_actions (interactive button clicks)
  if (payload.type !== "block_actions" || !payload.actions?.length) {
    return NextResponse.json({ ok: true });
  }

  const action = payload.actions[0];
  const { action_id, value: clusterId } = action;

  if (!["approve_gap", "reject_gap"].includes(action_id) || !clusterId) {
    return NextResponse.json({ ok: true });
  }

  const status = action_id === "approve_gap" ? "approved" : "rejected";
  const actorName = payload.user?.name ?? "unknown";

  // Update delivery status in Supabase
  try {
    await supabaseAdmin
      .from("deliveries")
      .update({
        status,
        response: `${status} by @${actorName} via Slack`,
      })
      .eq("cluster_id", clusterId)
      .eq("channel", "slack")
      .order("sent_at", { ascending: false })
      .limit(1);

    // Also update cluster status
    await supabaseAdmin
      .from("clusters")
      .update({ status: status === "approved" ? "approved" : "dismissed" })
      .eq("id", clusterId);
  } catch (err) {
    console.error("Supabase update failed:", err);
  }

  // Fetch cluster to build updated message
  const { data: cluster } = await supabaseAdmin
    .from("clusters")
    .select("*")
    .eq("id", clusterId)
    .single();

  // Build updated Slack message with status banner
  const statusColor = status === "approved" ? "#46e6a6" : "#ff5c7a";
  const statusEmoji = status === "approved" ? "✅" : "❌";
  const statusLabel = status === "approved" ? "Approved" : "Rejected";

  const baseBlocks = cluster ? buildSlackBlocks(cluster as Cluster) : [];

  // Replace the actions block with a status block
  const updatedBlocks = [
    ...baseBlocks.filter((b) => b.type !== "actions"),
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusEmoji} *${statusLabel}* by @${actorName}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `This intent gap was ${statusLabel.toLowerCase()} · <${process.env.NEXTAUTH_URL}/dashboard?gap=${clusterId}|View in Observer>`,
        },
      ],
    },
  ];

  // Respond to Slack to update the original message
  if (payload.response_url) {
    try {
      await fetch(payload.response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace_original: true,
          attachments: [
            {
              color: statusColor,
              blocks: updatedBlocks,
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Slack response_url failed:", err);
    }
  }

  // Acknowledge immediately (Slack requires <3s response)
  return NextResponse.json({ ok: true });
}
