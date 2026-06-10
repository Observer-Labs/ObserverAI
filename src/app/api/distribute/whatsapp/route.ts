export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppAlert } from "@/lib/whatsapp";
import { getWorkspace, logDelivery, supabaseAdmin } from "@/lib/supabase";
import type { Cluster } from "@/lib/types";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { clusterId, recipientOverride } = await req.json();

  const workspace = await getWorkspace(wid);
  const config = workspace.distribution_config?.whatsapp;

  if (!config?.enabled) {
    return NextResponse.json({ error: "WhatsApp distribution not enabled" }, { status: 400 });
  }

  const { data: cluster } = await supabaseAdmin
    .from("clusters")
    .select("*")
    .eq("id", clusterId)
    .eq("workspace_id", wid)
    .single();

  if (!cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  // Critical-only filter
  if (config.critical_only && (cluster as Cluster).severity < 70) {
    return NextResponse.json({ skipped: true, reason: "Not critical severity" });
  }

  const recipients = recipientOverride ? [recipientOverride] : config.recipient_numbers ?? [];
  const deliveries = [];

  for (const number of recipients) {
    try {
      await sendWhatsAppAlert(number, cluster as Cluster);
      const delivery = await logDelivery({
        cluster_id: clusterId,
        channel: "whatsapp",
        recipient: number,
        sent_at: new Date().toISOString(),
        status: "sent",
      });
      deliveries.push(delivery);
    } catch (err) {
      const error = err as Error;
      await logDelivery({
        cluster_id: clusterId,
        channel: "whatsapp",
        recipient: number,
        sent_at: new Date().toISOString(),
        status: "failed",
        response: error.message,
      });
    }
  }

  return NextResponse.json({ delivered: deliveries.length, recipients });
}
