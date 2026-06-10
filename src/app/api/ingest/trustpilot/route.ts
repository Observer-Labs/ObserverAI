export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchTrustpilotSignals } from "@/lib/trustpilot";
import { getWorkspace, insertSignals, supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    let wid: string;
    try { wid = await getAuthenticatedWorkspaceId(); }
    catch { return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); }

    const workspace = await getWorkspace(wid);
    const config = workspace.integrations_config?.trustpilot;

    if (!config?.enabled)
      return NextResponse.json({ error: "Trustpilot not enabled" }, { status: 400 });
    if (!config.business_unit_id || !config.api_key)
      return NextResponse.json({ error: "Missing business_unit_id or api_key" }, { status: 400 });

    const items = await fetchTrustpilotSignals(config, config.last_sync);
    if (items.length === 0)
      return NextResponse.json({ ingested: 0, message: "No new Trustpilot signals" });

    const signals = items.map((s) => ({
      workspace_id: wid,
      source: "trustpilot" as const,
      channel: s.channel,
      sender: s.sender,
      content: s.content,
      timestamp: s.timestamp,
      sentiment: s.sentiment,
      reviewed: false,
    }));

    const inserted = await insertSignals(signals as Parameters<typeof insertSignals>[0]);

    // Update last_sync
    await supabaseAdmin
      .from("workspaces")
      .update({
        integrations_config: {
          ...workspace.integrations_config,
          trustpilot: { ...config, last_sync: new Date().toISOString() },
        },
      })
      .eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
