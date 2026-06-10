export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { sendEmailBrief } from "@/lib/email";
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

  const { clusterIds, recipientsOverride } = await req.json();

  const workspace = await getWorkspace(wid);
  const config = workspace.distribution_config?.email;

  if (!config?.enabled) {
    return NextResponse.json({ error: "Email distribution not enabled" }, { status: 400 });
  }

  // Get clusters (always scoped to workspace)
  const ids = clusterIds ?? [];
  const { data: clusters } = ids.length > 0
    ? await supabaseAdmin.from("clusters").select("*").in("id", ids).eq("workspace_id", wid)
    : await supabaseAdmin.from("clusters").select("*").eq("workspace_id", wid).eq("status", "active").order("severity", { ascending: false }).limit(10);

  if (!clusters || clusters.length === 0) {
    return NextResponse.json({ error: "No clusters to send" }, { status: 400 });
  }

  const recipients = recipientsOverride ?? config.recipients ?? [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients configured" }, { status: 400 });
  }

  try {
    // Log deliveries BEFORE sending so we have IDs for approve/reject links
    const deliveryIds: Record<string, string> = {};
    for (const cluster of clusters) {
      const delivery = await logDelivery({
        cluster_id: cluster.id,
        channel: "email",
        recipient: recipients.join(", "),
        sent_at: new Date().toISOString(),
        status: "sent",
      });
      if (delivery?.id) deliveryIds[cluster.id] = delivery.id;
    }

    await sendEmailBrief(recipients, clusters as Cluster[], deliveryIds);

    return NextResponse.json({ delivered: clusters.length, recipients });
  } catch (err) {
    const error = err as Error;
    // Log failure for each cluster so it appears in the delivery log
    for (const cluster of clusters) {
      await logDelivery({
        cluster_id: cluster.id,
        channel: "email",
        recipient: recipients.join(", "),
        sent_at: new Date().toISOString(),
        status: "failed",
        response: error.message,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
