import { getSupabaseAdmin } from "./supabase";
import type { PreviousNotification } from "./daily-signal-rules";

type RecentClusterRow = {
  workspace_id: string;
  branch_id: string;
  candidate_key?: string | null;
  created_at?: string | null;
};

export async function fetchRecentCandidateNotifications(input: {
  workspaceId: string;
  branchId: string;
  since: Date;
}): Promise<PreviousNotification[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("clusters")
    .select("workspace_id, branch_id, candidate_key, created_at")
    .eq("workspace_id", input.workspaceId)
    .eq("branch_id", input.branchId)
    .gte("created_at", input.since.toISOString())
    .not("candidate_key", "is", null);

  if (error) throw error;
  return normalizeRecentCandidateNotifications((data ?? []) as RecentClusterRow[]);
}

export function normalizeRecentCandidateNotifications(rows: RecentClusterRow[]): PreviousNotification[] {
  const seen = new Set<string>();
  const notifications: PreviousNotification[] = [];

  for (const row of rows) {
    const topic = topicFromCandidateKey(row.candidate_key);
    if (!topic || !row.created_at) continue;
    const key = `${row.workspace_id}:${row.branch_id}:${topic}:${row.created_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notifications.push({
      workspaceId: row.workspace_id,
      branchId: row.branch_id,
      topic,
      sentAt: row.created_at,
    });
  }

  return notifications;
}

export function topicFromCandidateKey(candidateKey: string | null | undefined) {
  if (!candidateKey) return "";
  const parts = candidateKey.split(":").filter(Boolean);
  return parts.length >= 8 ? parts[parts.length - 1] : "";
}
