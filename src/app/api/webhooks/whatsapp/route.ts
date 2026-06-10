export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  extractWhatsAppDeliveryStatuses,
  isWhatsAppConsentReply,
  normalizeWhatsAppNumber,
  parseInboundWhatsApp,
  verifyMetaSignature,
  verifyMetaWebhookToken,
} from "@/lib/whatsapp";
import { getSupabaseAdmin } from "@/lib/supabase";

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
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const payload = JSON.parse(rawBody) as Parameters<typeof parseInboundWhatsApp>[0];
  const messages = parseInboundWhatsApp(payload);
  const statuses = extractWhatsAppDeliveryStatuses(payload);
  const explicitWorkspaceId = req.nextUrl.searchParams.get("workspaceId");
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

    if (isWhatsAppConsentReply(message.content)) {
      await markWhatsAppOptIn(workspace, message.sender, message.timestamp);
    }
  }

  return NextResponse.json({ received: true, processed: messages.length });
}
