export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getWorkspace, insertSignals, getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    let wid: string;
    try { wid = await getAuthenticatedWorkspaceId(); }
    catch { return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); }

    const workspace = await getWorkspace(wid);
    const config = workspace.integrations_config?.googleplay;

    if (!config?.enabled)
      return NextResponse.json({ error: "Google Play not enabled" }, { status: 400 });
    if (!config.package_name || !config.service_account_key)
      return NextResponse.json({ error: "Missing package_name or service_account_key" }, { status: 400 });

    // Parse service account key
    let serviceAccount: Record<string, string>;
    try {
      serviceAccount = JSON.parse(config.service_account_key);
    } catch {
      return NextResponse.json({ error: "Invalid service_account_key JSON" }, { status: 400 });
    }

    // Auth with Google
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    // Fetch reviews (last 7 days, max 100)
    const { data } = await androidpublisher.reviews.list({
      packageName: config.package_name,
      maxResults: 100,
      translationLanguage: "en",
    });

    const reviews = data.reviews ?? [];
    const maxRating = config.max_rating ?? 3;
    const since = config.last_sync
      ? new Date(config.last_sync).getTime() / 1000
      : Date.now() / 1000 - 7 * 86400;

    const filtered = reviews.filter((r) => {
      const comment = r.comments?.[0]?.userComment;
      if (!comment) return false;
      const starRating = comment.starRating ?? 5;
      const ts = Number(comment.lastModified?.seconds ?? 0);
      return starRating <= maxRating && ts >= since;
    });

    if (filtered.length === 0)
      return NextResponse.json({ ingested: 0, message: "No new reviews in range" });

    const signals = filtered.map((r) => {
      const comment = r.comments![0].userComment!;
      const stars = comment.starRating ?? 3;
      return {
        workspace_id: wid,
        source: "googleplay" as const,
        channel: "play-store",
        sender: r.authorName ?? "anonymous",
        content: `${stars}★, ${comment.text ?? ""}`.trim(),
        timestamp: new Date(Number(comment.lastModified?.seconds ?? 0) * 1000).toISOString(),
        sentiment: stars <= 2 ? "negative" as const : "neutral" as const,
        reviewed: false,
      };
    });

    const inserted = await insertSignals(signals);

    await getSupabaseAdmin()
      .from("workspaces")
      .update({
        integrations_config: {
          ...workspace.integrations_config,
          googleplay: { ...config, last_sync: new Date().toISOString() },
        },
      })
      .eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0 });
  } catch (e) {
    console.error("[ingest/googleplay]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
