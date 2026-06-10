export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchAppStoreReviews } from "@/lib/appstore";
import { getWorkspace, insertSignals, getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    let wid: string;
    try {
      wid = await getAuthenticatedWorkspaceId();
    } catch {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const workspace = await getWorkspace(wid);
    const config = workspace.integrations_config?.appstore;

    if (!config?.enabled) {
      return NextResponse.json({ error: "App Store not enabled" }, { status: 400 });
    }
    if (!config.app_id_ios && !config.app_id_android) {
      return NextResponse.json({ error: "Missing App Store configuration (app_id_ios or app_id_android required)" }, { status: 400 });
    }

    const items = await fetchAppStoreReviews(config);
    if (items.length === 0) {
      return NextResponse.json({ ingested: 0, message: "No new reviews found" });
    }

    const signals = items.map((m) => ({
      workspace_id: wid,
      source: "appstore" as const,
      channel: m.channel,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
      reviewed: false,
    }));

    const inserted = await insertSignals(signals);

    const newConfig = {
      ...workspace.integrations_config,
      appstore: { ...config, last_sync: new Date().toISOString() },
    };
    await getSupabaseAdmin().from("workspaces").update({ integrations_config: newConfig }).eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
