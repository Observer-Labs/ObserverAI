export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getWorkspace, insertSignals, getSupabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    let wid: string;
    try { wid = await getAuthenticatedWorkspaceId(); }
    catch { return NextResponse.json({ error: "Unauthenticated" }, { status: 401 }); }

    const workspace = await getWorkspace(wid);
    const config = workspace.integrations_config?.googleanalytics;

    if (!config?.enabled)
      return NextResponse.json({ error: "Google Analytics not enabled" }, { status: 400 });
    if (!config.property_id || !config.service_account_key)
      return NextResponse.json({ error: "Missing property_id or service_account_key" }, { status: 400 });

    let credentials: Record<string, string>;
    try {
      credentials = JSON.parse(config.service_account_key);
    } catch {
      return NextResponse.json({ error: "Invalid service_account_key JSON" }, { status: 400 });
    }

    const analyticsClient = new BetaAnalyticsDataClient({ credentials });
    const property = `properties/${config.property_id}`;

    // Run report: page-level bounce + session drop anomalies (last 7 days vs prev 7)
    const [report] = await analyticsClient.runReport({
      property,
      dateRanges: [
        { startDate: "14daysAgo", endDate: "8daysAgo" },  // baseline
        { startDate: "7daysAgo",  endDate: "today" },      // current
      ],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "bounceRate" },
        { name: "sessions" },
        { name: "conversions" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 30,
    });

    const signals: Parameters<typeof insertSignals>[0] = [];
    const rows = report.rows ?? [];

    for (const row of rows) {
      const page = row.dimensionValues?.[0]?.value ?? "/";
      const baselineBounce = parseFloat(row.metricValues?.[0]?.value ?? "0");
      const currentBounce  = parseFloat(row.metricValues?.[3]?.value ?? "0");
      const baselineSessions = parseFloat(row.metricValues?.[1]?.value ?? "0");
      const currentSessions  = parseFloat(row.metricValues?.[4]?.value ?? "0");
      const baselineConv  = parseFloat(row.metricValues?.[2]?.value ?? "0");
      const currentConv   = parseFloat(row.metricValues?.[5]?.value ?? "0");

      const bounceDelta   = currentBounce - baselineBounce;
      const sessionDelta  = baselineSessions > 0 ? (currentSessions - baselineSessions) / baselineSessions : 0;
      const convDelta     = baselineConv > 0 ? (currentConv - baselineConv) / baselineConv : 0;

      // Only surface anomalies: bounce spike >10pp or session/conv drop >15%
      if (bounceDelta > 10) {
        signals.push({
          workspace_id: wid,
          source: "googleanalytics" as const,
          channel: "bounce_anomaly",
          sender: page,
          content: `Bounce rate spike on "${page}": +${bounceDelta.toFixed(1)}pp vs previous 7 days (now ${currentBounce.toFixed(1)}%). ${currentSessions.toFixed(0)} sessions affected.`,
          timestamp: new Date().toISOString(),
          sentiment: "negative",
          reviewed: false,
        });
      }
      if (sessionDelta < -0.15 && baselineSessions > 50) {
        signals.push({
          workspace_id: wid,
          source: "googleanalytics" as const,
          channel: "traffic_drop",
          sender: page,
          content: `Traffic drop on "${page}": ${Math.abs(sessionDelta * 100).toFixed(1)}% fewer sessions vs previous 7 days (${currentSessions.toFixed(0)} vs ${baselineSessions.toFixed(0)}).`,
          timestamp: new Date().toISOString(),
          sentiment: "negative",
          reviewed: false,
        });
      }
      if (convDelta < -0.15 && baselineConv > 5) {
        signals.push({
          workspace_id: wid,
          source: "googleanalytics" as const,
          channel: "conversion_drop",
          sender: page,
          content: `Conversion drop on "${page}": ${Math.abs(convDelta * 100).toFixed(1)}% fewer conversions vs previous 7 days (${currentConv.toFixed(0)} vs ${baselineConv.toFixed(0)}).`,
          timestamp: new Date().toISOString(),
          sentiment: "negative",
          reviewed: false,
        });
      }
    }

    if (signals.length === 0)
      return NextResponse.json({ ingested: 0, message: "No anomalies detected in last 7 days" });

    const inserted = await insertSignals(signals);

    await getSupabaseAdmin()
      .from("workspaces")
      .update({
        integrations_config: {
          ...workspace.integrations_config,
          googleanalytics: { ...config, last_sync: new Date().toISOString() },
        },
      })
      .eq("id", wid);

    return NextResponse.json({ ingested: inserted?.length ?? 0, anomalies: signals.length });
  } catch (e) {
    console.error("[ingest/googleanalytics]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
