export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getWorkspace, supabaseAdmin } from "@/lib/supabase";
import { createJiraIssue } from "@/lib/jira-output";
import type { Cluster } from "@/lib/types";

/**
 * POST /api/output/jira
 * Body: { clusterIds?: string[] } , defaults to top 10 active clusters
 *
 * Creates a Jira issue for each cluster using the workspace's JiraOutputConfig.
 */
export async function POST(req: NextRequest) {
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { clusterIds } = await req.json().catch(() => ({})) as { clusterIds?: string[] };

  const workspace = await getWorkspace(wid);
  const config = workspace.output_config?.jira;

  if (!config?.enabled) {
    return NextResponse.json({ error: "Jira output not enabled. Configure it in Connect → Outputs." }, { status: 400 });
  }

  // Fetch clusters
  const ids = clusterIds ?? [];
  const { data: clusters } = ids.length > 0
    ? await supabaseAdmin.from("clusters").select("*").in("id", ids).eq("workspace_id", wid)
    : await supabaseAdmin
        .from("clusters")
        .select("*")
        .eq("workspace_id", wid)
        .eq("status", "active")
        .order("severity", { ascending: false })
        .limit(10);

  if (!clusters || clusters.length === 0) {
    return NextResponse.json({ error: "No clusters found" }, { status: 400 });
  }

  const results: { cluster_id: string; jira_key?: string; error?: string }[] = [];

  for (const cluster of clusters) {
    try {
      const issue = await createJiraIssue(config, cluster as Cluster);
      results.push({ cluster_id: cluster.id, jira_key: issue.key });
    } catch (err) {
      results.push({ cluster_id: cluster.id, error: (err as Error).message });
    }
  }

  const succeeded = results.filter((r) => r.jira_key).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({ succeeded, failed, results });
}
