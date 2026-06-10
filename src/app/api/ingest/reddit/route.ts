export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchRedditMentions } from "@/lib/reddit";
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
    const config = workspace.integrations_config?.reddit;

    if (!config?.enabled) {
      return NextResponse.json({ error: "Reddit not enabled" }, { status: 400 });
    }
    if (!config.client_id || !config.client_secret || !config.subreddits) {
      return NextResponse.json({ error: "Missing Reddit configuration (client_id, client_secret, subreddits required)" }, { status: 400 });
    }

    const items = await fetchRedditMentions(config);
    if (items.length === 0) {
      return NextResponse.json({ ingested: 0, message: "No new posts since last sync" });
    }

    const signals = items.map((m) => ({
      workspace_id: wid,
      source: "reddit" as const,
      channel: m.channel,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
      reviewed: false,
    }));

    const inserted = await insertSignals(signals);

    const newConfig = {
      ...workspace.integrations_config,
      reddit: { ...config, last_sync: new Date().toISOString() },
    };
    await getSupabaseAdmin().from("workspaces").update({ integrations_config: newConfig }).eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
