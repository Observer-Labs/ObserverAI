export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

const workspaceFields =
  "id, name, plan, branch_limit, trial_ends_at, analysis_count, analysis_count_reset_at, polar_status, polar_renews_at, slack_team_id, slack_monitored_channels, slack_token, slack_bot_token, gmail_token, whatsapp_config, distribution_config, integrations_config, output_config";

const legacyWorkspaceFields =
  "id, name, plan, trial_ends_at, analysis_count, analysis_count_reset_at, polar_status, polar_renews_at, slack_team_id, slack_monitored_channels, slack_token, slack_bot_token, gmail_token, whatsapp_config, distribution_config, integrations_config, output_config";

export async function GET(_req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select(workspaceFields)
    .eq("id", workspaceId)
    .single();

  if (error && error.message.includes("branch_limit")) {
    const { data: legacyData, error: legacyError } = await supabaseAdmin
      .from("workspaces")
      .select(legacyWorkspaceFields)
      .eq("id", workspaceId)
      .single();

    if (legacyError) return NextResponse.json({ error: legacyError.message }, { status: 500 });
    return NextResponse.json({ workspace: { ...legacyData, branch_limit: 1 } });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}

export async function PATCH(req: NextRequest) {
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { updates } = await req.json();

  // Allowlist updatable fields to prevent overwriting user_id or id
  const allowed = [
    "slack_monitored_channels",
    "whatsapp_config",
    "distribution_config",
    "integrations_config",
    "output_config",
    "name",
  ];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates ?? {}).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .update(safeUpdates)
    .eq("id", wid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}
