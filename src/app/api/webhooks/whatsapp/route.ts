export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  buildWhatsAppAlertBody,
  extractWhatsAppDeliveryStatuses,
  isWhatsAppConsentReply,
  normalizeWhatsAppNumber,
  parseInboundWhatsApp,
  parseWhatsAppDecisionReply,
  sendWhatsAppTextMessage,
  sendWhatsAppWelcomeMessage,
  verifyMetaSignature,
  verifyMetaWebhookToken,
  type WhatsAppDecisionReply,
  type WhatsAppInbound,
} from "@/lib/whatsapp";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Cluster } from "@/lib/types";

type WorkspaceWithWhatsApp = {
  id: string;
  whatsapp_config?: {
    recipient_numbers?: string[];
    [key: string]: unknown;
  } | null;
  distribution_config?: {
    whatsapp?: {
      recipient_numbers?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyMetaWebhookToken(token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Invalid verify token", { status: 403 });
}

async function findWorkspaceForSender(sender: string, explicitWorkspaceId: string | null) {
  const supabase = getSupabaseAdmin();

  if (explicitWorkspaceId) {
    const { data } = await supabase
      .from("workspaces")
      .select("id, whatsapp_config, distribution_config")
      .eq("id", explicitWorkspaceId)
      .single();
    return (data as WorkspaceWithWhatsApp | null) ?? null;
  }

  const { data } = await supabase
    .from("workspaces")
    .select("id, whatsapp_config, distribution_config")
    .limit(1000);

  const normalizedSender = normalizeWhatsAppNumber(sender);
  return ((data as WorkspaceWithWhatsApp[] | null) ?? []).find((workspace) => {
    const whatsappNumbers = workspace.whatsapp_config?.recipient_numbers ?? [];
    const distributionNumbers = workspace.distribution_config?.whatsapp?.recipient_numbers ?? [];
    return [...whatsappNumbers, ...distributionNumbers]
      .map(normalizeWhatsAppNumber)
      .includes(normalizedSender);
  }) ?? null;
}

async function markWhatsAppOptIn(workspace: WorkspaceWithWhatsApp, sender: string, inboundAt: string) {
  const supabase = getSupabaseAdmin();
  const wasAlreadyOptedIn = workspace.whatsapp_config?.opted_in === true;
  const numbers = Array.from(
    new Set([...(workspace.whatsapp_config?.recipient_numbers ?? []), normalizeWhatsAppNumber(sender)]),
  );

  await supabase
    .from("workspaces")
    .update({
      whatsapp_config: {
        ...(workspace.whatsapp_config ?? {}),
        enabled: true,
        webhook_verified: true,
        recipient_numbers: numbers,
        opted_in: true,
        opted_in_at: inboundAt,
        verified: true,
        verified_at: inboundAt,
        last_inbound_at: inboundAt,
      },
      distribution_config: {
        ...(workspace.distribution_config ?? {}),
        whatsapp: {
          ...(workspace.distribution_config?.whatsapp ?? {}),
          enabled: true,
          recipient_numbers: numbers,
        },
      },
    })
    .eq("id", workspace.id);

  return { wasAlreadyOptedIn };
}

type AlertDeliveryRow = {
  id: string;
  cluster_id: string;
  recipient: string;
  sent_at: string;
  clusters: Cluster;
};

/**
 * The most recent WhatsApp alert sent to this sender in this workspace.
 * A bare "1/2/3" reply always refers to the latest alert.
 */
async function findLatestAlertDeliveryForSender(workspaceId: string, sender: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("deliveries")
    .select("id, cluster_id, recipient, sent_at, clusters!inner(*)")
    .eq("channel", "whatsapp")
    .eq("clusters.workspace_id", workspaceId)
    .order("sent_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("WhatsApp decision lookup failed", { workspaceId, error: error.message });
    return null;
  }

  const normalizedSender = normalizeWhatsAppNumber(sender);
  return (
    ((data ?? []) as unknown as AlertDeliveryRow[]).find(
      (row) => normalizeWhatsAppNumber(row.recipient) === normalizedSender,
    ) ?? null
  );
}

async function handleWhatsAppDecisionReply(
  workspaceId: string,
  message: WhatsAppInbound,
  decision: WhatsAppDecisionReply,
) {
  const supabase = getSupabaseAdmin();
  const delivery = await findLatestAlertDeliveryForSender(workspaceId, message.sender);
  if (!delivery) return; // no alert to act on; stay silent

  const cluster = delivery.clusters;

  if (decision === "details") {
    // Replying to an inbound message is always inside Meta's 24h window,
    // so the full free-text brief is deliverable here.
    let branchName: string | null = null;
    if (cluster.branch_id) {
      const { data: branch } = await supabase
        .from("branches")
        .select("name")
        .eq("id", cluster.branch_id)
        .single();
      branchName = (branch as { name?: string } | null)?.name ?? null;
    }
    const baseUrl =
      process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://observerai.app";
    await sendWhatsAppTextMessage(
      message.sender,
      buildWhatsAppAlertBody(cluster, { baseUrl, locale: "tr", branchName }),
    );
    return;
  }

  const newStatus = decision === "approve" ? "approved" : "dismissed";
  await supabase
    .from("clusters")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", cluster.id)
    .eq("workspace_id", workspaceId);
  await supabase
    .from("deliveries")
    .update({ decision: newStatus })
    .eq("id", delivery.id);

  const ack =
    decision === "approve"
      ? `✅ Not aldım — "${cluster.title}" hallettiniz olarak işaretlendi.`
      : `👍 Anlaşıldı — "${cluster.title}" geçildi. Dashboard'da geçmişte görebilirsiniz.`;
  await sendWhatsAppTextMessage(message.sender, ack);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const payload = JSON.parse(rawBody) as Parameters<typeof parseInboundWhatsApp>[0];
  const messages = parseInboundWhatsApp(payload);
  const statuses = extractWhatsAppDeliveryStatuses(payload);
  // workspaceId must not be taken from the URL (outside signature scope);
  // use number-based lookup which operates on signed payload data only.
  const explicitWorkspaceId: string | null = null;
  const supabase = getSupabaseAdmin();

  for (const status of statuses) {
    if (status.status === "failed") {
      console.warn("Meta WhatsApp delivery failed", {
        id: status.id,
        recipient_id: status.recipient_id,
        errors: status.errors?.map((error) => ({
          code: error.code,
          title: error.title,
          message: error.message,
          details: error.error_data?.details,
        })),
      });
    }
  }

  for (const message of messages) {
    const workspace = await findWorkspaceForSender(message.sender, explicitWorkspaceId);
    if (!workspace) continue;

    await supabase.from("signals").insert({
      workspace_id: workspace.id,
      source: "whatsapp",
      channel: "whatsapp",
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
      reviewed: false,
    });

    const decisionReply = parseWhatsAppDecisionReply(message.content);
    if (decisionReply) {
      try {
        await handleWhatsAppDecisionReply(workspace.id, message, decisionReply);
      } catch (error) {
        console.warn("WhatsApp decision reply handling failed", {
          workspaceId: workspace.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      continue;
    }

    if (isWhatsAppConsentReply(message.content)) {
      const { wasAlreadyOptedIn } = await markWhatsAppOptIn(workspace, message.sender, message.timestamp);
      if (!wasAlreadyOptedIn) {
        try {
          await sendWhatsAppWelcomeMessage(message.sender, "tr");
        } catch (error) {
          console.warn("Meta WhatsApp welcome message failed", {
            workspaceId: workspace.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true, processed: messages.length });
}
