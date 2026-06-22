export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { runDeliveryDailyPipeline } from "@/lib/delivery-daily-pipeline";
import { createDeliveryPartnerHttpClient, sourceAuthMaterialResolver } from "@/lib/delivery-partner-runtime";
import { syncDeliverySource, type SyncDeliverySourceResult } from "@/lib/delivery-source-sync";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DeliveryConnectorProvider } from "@/lib/delivery-connectors";
import type { DeliveryPlatform } from "@/lib/types";

const DELIVERY_SOURCE_TYPES = ["getir", "trendyol", "yemeksepeti"] as const;

type DeliverySourceRow = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: DeliveryPlatform;
  status: "connected" | "pending" | "error";
};

type DeliverySyncSummary =
  | {
    source_id: string;
    platform: DeliveryPlatform;
    status: "synced";
    partner_sync: SyncDeliverySourceResult;
    metric_date: string;
    order_count: number;
    bad_review_count: number;
    candidates: number;
  }
  | {
    source_id: string;
    platform: DeliveryPlatform;
    status: "skipped";
    reason: "unsupported_provider" | "missing_auth_ref";
  }
  | {
    source_id: string;
    platform: DeliveryPlatform;
    status: "failed";
    error: string;
  };

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { source_id?: unknown; metric_date?: unknown };
  const sourceId = typeof body.source_id === "string" ? body.source_id.trim() : "";
  const metricDate = normalizeMetricDate(body.metric_date) ?? yesterdayUtcDate();

  if (!sourceId) return NextResponse.json({ error: "source_id is required" }, { status: 400 });

  const { data: source, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id, workspace_id, branch_id, type, status")
    .eq("workspace_id", workspaceId)
    .eq("id", sourceId)
    .in("type", [...DELIVERY_SOURCE_TYPES])
    .single();

  if (error || !source) {
    return NextResponse.json({ error: "Delivery source not found" }, { status: 404 });
  }

  const summary = await syncSource(workspaceId, source as DeliverySourceRow, metricDate);
  return NextResponse.json({
    processed: summary.status === "synced" ? 1 : 0,
    summary: [summary],
  });
}

async function syncSource(
  workspaceId: string,
  source: DeliverySourceRow,
  metricDate: string,
): Promise<DeliverySyncSummary> {
  if (!isSupportedPartnerSync(source.type)) {
    return {
      source_id: source.id,
      platform: source.type,
      status: "skipped",
      reason: "unsupported_provider",
    };
  }

  try {
    const partnerSync = await syncDeliverySource({
      workspaceId,
      sourceId: source.id,
      resolver: sourceAuthMaterialResolver,
      http: createDeliveryPartnerHttpClient(source.type),
    });

    if (partnerSync.status === "skipped") {
      return {
        source_id: source.id,
        platform: source.type,
        status: "skipped",
        reason: partnerSync.reason,
      };
    }

    const result = await runDeliveryDailyPipeline({
      workspaceId,
      branchId: source.branch_id,
      sourceId: source.id,
      platform: source.type,
      metricDate,
    });

    await getSupabaseAdmin()
      .from("sources")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", source.id);

    return {
      source_id: source.id,
      platform: source.type,
      status: "synced",
      partner_sync: partnerSync,
      metric_date: metricDate,
      order_count: result.metrics.order_count,
      bad_review_count: result.metrics.bad_review_count,
      candidates: result.candidates.length,
    };
  } catch (err) {
    await getSupabaseAdmin()
      .from("sources")
      .update({ status: "error" })
      .eq("workspace_id", workspaceId)
      .eq("id", source.id);

    return {
      source_id: source.id,
      platform: source.type,
      status: "failed",
      error: err instanceof Error ? err.message : "Delivery sync failed",
    };
  }
}

function isSupportedPartnerSync(value: DeliveryPlatform): value is DeliveryConnectorProvider {
  return value === "getir" || value === "trendyol";
}

function normalizeMetricDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function yesterdayUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
