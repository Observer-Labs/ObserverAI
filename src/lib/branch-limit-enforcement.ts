import { getSupabaseAdmin } from "./supabase";

type ActiveBranchRow = {
  id: string;
  created_at: string | null;
};

export type BranchLimitEnforcementResult = {
  branchLimit: number | null;
  activeCount: number;
  pausedBranchIds: string[];
};

export async function enforceWorkspaceBranchLimit(
  workspaceId: string,
  branchLimit: number | null,
): Promise<BranchLimitEnforcementResult> {
  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const activeBranches = (data ?? []) as ActiveBranchRow[];
  const activeCount = activeBranches.length;
  if (branchLimit === null) {
    return { branchLimit, activeCount, pausedBranchIds: [] };
  }

  const allowedActiveCount = Math.max(1, branchLimit);
  if (activeCount <= allowedActiveCount) {
    return { branchLimit, activeCount, pausedBranchIds: [] };
  }

  const pausedBranchIds = activeBranches
    .slice(allowedActiveCount)
    .map((branch) => branch.id);

  const { error: updateError } = await getSupabaseAdmin()
    .from("branches")
    .update({ status: "paused" })
    .eq("workspace_id", workspaceId)
    .in("id", pausedBranchIds);

  if (updateError) throw updateError;

  return { branchLimit, activeCount, pausedBranchIds };
}
