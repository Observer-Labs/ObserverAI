export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/deliveries
 * Returns recent deliveries for the workspace, joined with cluster title + severity.
 */
export async function GET() {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get all cluster IDs for this workspace
  const { data: clusters } = await supabase
    .from("clusters")
    .select("id, title, severity")
    .eq("workspace_id", workspaceId);

  if (!clusters || clusters.length === 0) {
    return NextResponse.json({ deliveries: [] });
  }

  const clusterMap = new Map(clusters.map((c) => [c.id, c]));
  const clusterIds = clusters.map((c) => c.id);

  const { data: deliveries, error } = await supabase
    .from("deliveries")
    .select("id, cluster_id, channel, recipient, sent_at, status, response")
    .in("cluster_id", clusterIds)
    .order("sent_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (deliveries ?? []).map((d) => {
    const cluster = clusterMap.get(d.cluster_id);
    return {
      id: d.id,
      cluster_id: d.cluster_id,
      cluster_title: cluster?.title ?? "Unknown signal",
      severity: cluster?.severity ?? 0,
      channel: d.channel,
      recipient: d.recipient,
      status: d.status,
      sent_at: d.sent_at,
    };
  });

  return NextResponse.json({ deliveries: enriched });
}
