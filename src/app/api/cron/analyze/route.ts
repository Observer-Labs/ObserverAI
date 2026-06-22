export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type WorkspaceRow = {
  id: string;
  plan?: string | null;
  polar_status?: string | null;
  trial_ends_at?: string | null;
};

type BranchRow = {
  id: string;
  workspace_id: string;
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, plan, polar_status, trial_ends_at");

  if (workspaceError) {
    return NextResponse.json({ error: workspaceError.message }, { status: 500 });
  }

  const activeWorkspaceIds = ((workspaces ?? []) as WorkspaceRow[])
    .filter(isWorkspaceActive)
    .map((workspace) => workspace.id);

  if (activeWorkspaceIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, branches: 0, summary: [] });
  }

  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, workspace_id")
    .in("workspace_id", activeWorkspaceIds)
    .eq("status", "active");

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "https://observerai.app";

  const summary: Array<{
    workspace_id: string;
    branch_id: string;
    pending: number;
    status: "skipped" | "analyzed" | "failed";
    http_status?: number;
  }> = [];

  for (const branch of (branches ?? []) as BranchRow[]) {
    try {
      const pending = await countPendingSignals(branch.workspace_id, branch.id);
      if (pending === 0) {
        summary.push({
          workspace_id: branch.workspace_id,
          branch_id: branch.id,
          pending,
          status: "skipped",
        });
        continue;
      }

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": cronSecret,
          "x-cron-workspace-id": branch.workspace_id,
        },
        body: JSON.stringify({ branch_id: branch.id }),
      });

      summary.push({
        workspace_id: branch.workspace_id,
        branch_id: branch.id,
        pending,
        status: res.ok ? "analyzed" : "failed",
        http_status: res.status,
      });
    } catch (error) {
      console.error(`[cron/analyze] ${branch.workspace_id}/${branch.id} failed:`, error);
      summary.push({
        workspace_id: branch.workspace_id,
        branch_id: branch.id,
        pending: 0,
        status: "failed",
        http_status: 0,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: summary.filter((item) => item.status === "analyzed").length,
    branches: summary.length,
    summary,
  });
}

function isWorkspaceActive(workspace: WorkspaceRow) {
  if (workspace.plan === "trial" && workspace.trial_ends_at && new Date(workspace.trial_ends_at) < new Date()) {
    return false;
  }
  if (workspace.plan === "pro" && workspace.polar_status && !["active", "past_due"].includes(workspace.polar_status)) {
    return false;
  }
  return true;
}

async function countPendingSignals(workspaceId: string, branchId: string) {
  const { count, error } = await getSupabaseAdmin()
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("reviewed", false)
    .neq("channel", "demo") as unknown as CountResult;

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}
