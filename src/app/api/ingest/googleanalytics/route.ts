export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { resolveSourceAuthMaterialFromVault } from "@/lib/source-auth-secret-store";
import { getSupabaseAdmin, insertSignals } from "@/lib/supabase";

type AnalyticsSourceRow = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: string;
  config: Record<string, unknown>;
};

type AnalyticsAuthRefRow = {
  vault_ref: string;
  status: string;
};

type AnalyticsSignalInput = Parameters<typeof insertSignals>[0][number];

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { source_id?: unknown };
  const sourceId = typeof body.source_id === "string" ? body.source_id.trim() : "";

  const { data, error } = await buildSourceQuery(workspaceId, sourceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = [];
  for (const source of (data ?? []) as AnalyticsSourceRow[]) {
    try {
      const propertyId = stringConfig(source.config.property_id);
      if (!propertyId) {
        summary.push({ source_id: source.id, status: "skipped", reason: "missing_property_id" });
        continue;
      }

      const authRef = await fetchGa4AuthRef(workspaceId, source.id);
      if (!authRef || authRef.status !== "ready") {
        summary.push({ source_id: source.id, status: "skipped", reason: "missing_auth_ref" });
        continue;
      }

      const credentials = await resolveGa4Credentials(authRef);
      const signals = await fetchGa4AnomalySignals({
        workspaceId,
        branchId: source.branch_id,
        sourceId: source.id,
        propertyId,
        credentials,
      });
      const inserted = signals.length > 0 ? await insertSignals(signals) : [];

      await getSupabaseAdmin()
        .from("sources")
        .update({
          status: "connected",
          last_sync_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("id", source.id);

      summary.push({
        source_id: source.id,
        status: "synced",
        anomalies: signals.length,
        ingested: inserted?.length ?? 0,
      });
    } catch (error) {
      summary.push({
        source_id: source.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Google Analytics ingest failed",
      });
    }
  }

  return NextResponse.json({
    processed: summary.length,
    synced: summary.filter((item) => item.status === "synced").length,
    summary,
  });
}

function buildSourceQuery(workspaceId: string, sourceId: string) {
  let query = getSupabaseAdmin()
    .from("sources")
    .select("id, workspace_id, branch_id, type, config")
    .eq("workspace_id", workspaceId)
    .in("type", ["googleanalytics", "ga4"]);

  if (sourceId) query = query.eq("id", sourceId);
  return query;
}

async function fetchGa4AuthRef(workspaceId: string, sourceId: string): Promise<AnalyticsAuthRefRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("source_auth_refs")
    .select("vault_ref, status")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("provider", "ga4")
    .maybeSingle();

  if (error) throw error;
  return data as AnalyticsAuthRefRow | null;
}

async function resolveGa4Credentials(authRef: AnalyticsAuthRefRow) {
  const material = await resolveSourceAuthMaterialFromVault({
    vaultRef: authRef.vault_ref,
    fields: ["serviceAccountJson"],
  });
  const raw = material.serviceAccountJson;
  if (!raw) throw new Error("GA4 service account JSON is missing");

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    throw new Error("GA4 service account JSON is invalid");
  }
}

async function fetchGa4AnomalySignals(input: {
  workspaceId: string;
  branchId: string;
  sourceId: string;
  propertyId: string;
  credentials: Record<string, string>;
}): Promise<AnalyticsSignalInput[]> {
  const analyticsClient = new BetaAnalyticsDataClient({ credentials: input.credentials });
  const [report] = await analyticsClient.runReport({
    property: `properties/${input.propertyId}`,
    dateRanges: [
      { startDate: "14daysAgo", endDate: "8daysAgo" },
      { startDate: "7daysAgo", endDate: "today" },
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

  const signals: AnalyticsSignalInput[] = [];
  const rows = report.rows ?? [];
  const timestamp = new Date().toISOString();

  for (const row of rows) {
    const page = row.dimensionValues?.[0]?.value ?? "/";
    const baselineBounce = numericMetric(row.metricValues?.[0]?.value);
    const currentBounce = numericMetric(row.metricValues?.[3]?.value);
    const baselineSessions = numericMetric(row.metricValues?.[1]?.value);
    const currentSessions = numericMetric(row.metricValues?.[4]?.value);
    const baselineConv = numericMetric(row.metricValues?.[2]?.value);
    const currentConv = numericMetric(row.metricValues?.[5]?.value);

    const bounceDelta = currentBounce - baselineBounce;
    const sessionDelta = baselineSessions > 0 ? (currentSessions - baselineSessions) / baselineSessions : 0;
    const convDelta = baselineConv > 0 ? (currentConv - baselineConv) / baselineConv : 0;

    if (bounceDelta > 10) {
      signals.push(signal(input, {
        channel: "bounce_anomaly",
        page,
        content: `Bounce rate spike on "${page}": +${bounceDelta.toFixed(1)}pp vs previous 7 days (now ${currentBounce.toFixed(1)}%). ${currentSessions.toFixed(0)} sessions affected.`,
        timestamp,
      }));
    }
    if (sessionDelta < -0.15 && baselineSessions > 50) {
      signals.push(signal(input, {
        channel: "traffic_drop",
        page,
        content: `Traffic drop on "${page}": ${Math.abs(sessionDelta * 100).toFixed(1)}% fewer sessions vs previous 7 days (${currentSessions.toFixed(0)} vs ${baselineSessions.toFixed(0)}).`,
        timestamp,
      }));
    }
    if (convDelta < -0.15 && baselineConv > 5) {
      signals.push(signal(input, {
        channel: "conversion_drop",
        page,
        content: `Conversion drop on "${page}": ${Math.abs(convDelta * 100).toFixed(1)}% fewer conversions vs previous 7 days (${currentConv.toFixed(0)} vs ${baselineConv.toFixed(0)}).`,
        timestamp,
      }));
    }
  }

  return signals;
}

function signal(
  input: { workspaceId: string; branchId: string; sourceId: string },
  anomaly: { channel: string; page: string; content: string; timestamp: string },
): AnalyticsSignalInput {
  return {
    workspace_id: input.workspaceId,
    branch_id: input.branchId,
    source_id: input.sourceId,
    source: "googleanalytics",
    source_type: "googleanalytics",
    channel: anomaly.channel,
    sender: anomaly.page,
    content: anomaly.content,
    timestamp: anomaly.timestamp,
    sentiment: "negative",
    reviewed: false,
  };
}

function numericMetric(value: string | null | undefined) {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringConfig(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
