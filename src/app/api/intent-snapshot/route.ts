export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateIntentSnapshot } from "@/lib/anthropic";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import type { Cluster } from "@/lib/types";

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { clusterId } = await req.json();

  const { data: cluster } = await supabaseAdmin
    .from("clusters")
    .select("*")
    .eq("id", clusterId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  const snapshot = await generateIntentSnapshot(cluster as Cluster);
  return NextResponse.json({ snapshot, cluster });
}
