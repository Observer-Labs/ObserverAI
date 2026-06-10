export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/clusters/:id/decision
 * Body: { action: "approve" | "reject" }
 * Persists the in-app approve/reject decision. Mirrors the email flow
 * in /api/respond, but cookie-authenticated and tied to the workspace.
 *
 * Uses cluster.status: "approved" → ship it; "dismissed" → discarded.
 * Idempotent: re-calling with the same action is safe; calling with the
 * opposite action flips the decision (audit trail in updated_at).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verify the cluster belongs to this workspace (multi-tenant guard)
  const { data: cluster, error: lookupErr } = await supabase
    .from("clusters")
    .select("id, workspace_id, status")
    .eq("id", id)
    .single();

  if (lookupErr || !cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  if (cluster.workspace_id !== workspaceId) {
    // Don't leak the existence of other workspaces' clusters
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  const newStatus = action === "approve" ? "approved" : "dismissed";

  const { error: updateErr } = await supabase
    .from("clusters")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cluster_id: id,
    status: newStatus,
  });
}
