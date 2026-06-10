export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifySignals } from "@/lib/shopify";
import { getWorkspace, insertSignals, getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    let wid: string;
    try { wid = await getAuthenticatedWorkspaceId(); }
    catch { return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); }

    const workspace = await getWorkspace(wid);
    const config = workspace.integrations_config?.shopify;

    if (!config?.enabled)
      return NextResponse.json({ error: "Shopify not enabled" }, { status: 400 });
    if (!config.shop_domain || !config.access_token)
      return NextResponse.json({ error: "Missing shop_domain or access_token" }, { status: 400 });

    const items = await fetchShopifySignals(config);
    if (items.length === 0)
      return NextResponse.json({ ingested: 0, message: "No new Shopify signals" });

    const signals = items.map((s) => ({
      workspace_id: wid,
      source: "shopify" as const,
      channel: s.channel,
      sender: s.sender,
      content: s.content,
      timestamp: s.timestamp,
      sentiment: s.sentiment,
      reviewed: false,
    }));

    const inserted = await insertSignals(signals as Parameters<typeof insertSignals>[0]);

    await getSupabaseAdmin()
      .from("workspaces")
      .update({
        integrations_config: {
          ...workspace.integrations_config,
          shopify: { ...config, last_sync: new Date().toISOString() },
        },
      })
      .eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
