export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { persistDeliveryClusterRows } from "@/lib/delivery-candidate-clusters";
import { runDeliveryDailyPipeline } from "@/lib/delivery-daily-pipeline";
import { generateDeliveryFinalBrief } from "@/lib/delivery-final-briefs";
import { createDeliveryPartnerHttpClient, envVaultResolver } from "@/lib/delivery-partner-runtime";
import { syncDeliverySource, type SyncDeliverySourceResult } from "@/lib/delivery-source-sync";
import { getSupabaseAdmin } from "@/lib/supabase";
import { recordTokenUsage } from "@/lib/token-usage";
import type { DeliveryPlatform } from "@/lib/types";

const DELIVERY_PIPELINE_SOURCE_TYPES = ["getir", "trendyol", "yemeksepeti", "csv"] as const;

type DeliveryPipelineSource = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: DeliveryPlatform;
  status: "connected" | "pending" | "error";
};

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metricDate = req.nextUrl.searchParams.get("date")?.trim() || yesterdayUtcDate();
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  const branchId = req.nextUrl.searchParams.get("branch_id")?.trim();
  const sourceId = req.nextUrl.searchParams.get("source_id")?.trim();

  let query = getSupabaseAdmin()
    .from("sources")
    .select("id, workspace_id, branch_id, type, status")
    .in("type", [...DELIVERY_PIPELINE_SOURCE_TYPES])
    .in("status", ["connected", "pending"]);

  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  if (branchId) query = query.eq("branch_id", branchId);
  if (sourceId) query = query.eq("id", sourceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Array<{
    source_id: string;
    workspace_id: string;
    branch_id: string;
    platform: DeliveryPlatform;
    status: "processed" | "failed";
    candidates?: number;
    notified_candidates?: number;
    clusters?: number;
    ai_briefs?: number;
    partner_sync?: SyncDeliverySourceResult | { status: "failed"; error: string };
    error?: string;
  }> = [];

  for (const source of ((data ?? []) as unknown as DeliveryPipelineSource[])) {
    if (!isDeliveryPipelinePlatform(source.type)) continue;

    try {
      const partnerSync = await syncPartnerSourceIfSupported(source);
      const result = await runDeliveryDailyPipeline({
        workspaceId: source.workspace_id,
        branchId: source.branch_id,
        sourceId: source.id,
        platform: source.type,
        metricDate,
      });
      const finalBriefs = await Promise.all(
        result.candidates.map(async (candidate) => {
          const brief = await generateDeliveryFinalBrief(candidate, metricDate);
          await recordTokenUsage({
            workspaceId: candidate.workspaceId,
            branchId: candidate.branchId,
            inputTokens: brief.usage.inputTokens,
            outputTokens: brief.usage.outputTokens,
          });
          return brief;
        }),
      );
      const clusters = await persistDeliveryClusterRows(finalBriefs.map((brief) => brief.cluster));

      summary.push({
        source_id: source.id,
        workspace_id: source.workspace_id,
        branch_id: source.branch_id,
        platform: source.type,
        status: "processed",
        candidates: result.candidates.length,
        notified_candidates: result.candidates.filter((candidate) => candidate.shouldNotify).length,
        clusters: clusters.length,
        ai_briefs: finalBriefs.filter((brief) => !brief.usedFallback).length,
        partner_sync: partnerSync,
      });
    } catch (err) {
      summary.push({
        source_id: source.id,
        workspace_id: source.workspace_id,
        branch_id: source.branch_id,
        platform: source.type,
        status: "failed",
        error: err instanceof Error ? err.message : "Delivery daily pipeline failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    metric_date: metricDate,
    processed: summary.filter((item) => item.status === "processed").length,
    failed: summary.filter((item) => item.status === "failed").length,
    sources: summary.length,
    summary,
  });
}

function isDeliveryPipelinePlatform(value: string): value is DeliveryPlatform {
  return DELIVERY_PIPELINE_SOURCE_TYPES.includes(value as typeof DELIVERY_PIPELINE_SOURCE_TYPES[number]);
}

async function syncPartnerSourceIfSupported(
  source: DeliveryPipelineSource,
): Promise<SyncDeliverySourceResult | { status: "failed"; error: string } | undefined> {
  if (source.type !== "getir" && source.type !== "trendyol") return undefined;

  try {
    return await syncDeliverySource({
      workspaceId: source.workspace_id,
      sourceId: source.id,
      resolver: envVaultResolver,
      http: createDeliveryPartnerHttpClient(source.type),
    });
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Delivery partner sync failed",
    };
  }
}

function yesterdayUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
