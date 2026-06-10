export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchZendeskTickets } from "@/lib/zendesk";
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
    const config = workspace.integrations_config?.zendesk;

    if (!config?.enabled) {
      return NextResponse.json({ error: "Zendesk not enabled" }, { status: 400 });
    }
    if (!config.subdomain || !config.email || !config.api_token) {
      return NextResponse.json({ error: "Missing Zendesk configuration (subdomain, email, api_token required)" }, { status: 400 });
    }

    const { signals: items, totalFetched, capped } = await fetchZendeskTickets(config);
    if (items.length === 0) {
      return NextResponse.json({
        ingested: 0,
        totalFetched,
        capped,
        message: totalFetched === 0
          ? "No new tickets since last sync"
          : `Found ${totalFetched} tickets but none matched your filters`,
      });
    }

    const signals = items.map((m) => ({
      workspace_id: wid,
      source: "zendesk" as const,
      channel: m.channel,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
      reviewed: false,
    }));

    const inserted = await insertSignals(signals);

    const newConfig = {
      ...workspace.integrations_config,
      zendesk: { ...config, last_sync: new Date().toISOString() },
    };
    await getSupabaseAdmin().from("workspaces").update({ integrations_config: newConfig }).eq("id", wid);

    return NextResponse.json({
      ingested: inserted?.length ?? 0,
      totalFetched,
      capped,
      message: capped
        ? `Ingested ${inserted?.length ?? 0} tickets (capped at ${totalFetched}). More will sync next run.`
        : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
