export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { selectDailyDigestByWorkspace, type SignalCandidate } from "@/lib/daily-signal-rules";
import { candidateKey, persistDeliveryCandidateClusterResults } from "@/lib/delivery-candidate-clusters";
import { runDeliveryDailyPipeline } from "@/lib/delivery-daily-pipeline";
import { generateDeliveryFinalBrief } from "@/lib/delivery-final-briefs";
import { createDeliveryPartnerHttpClient, sourceAuthMaterialResolver } from "@/lib/delivery-partner-runtime";
import { syncDeliverySource, type SyncDeliverySourceResult } from "@/lib/delivery-source-sync";
import { fetchRecentCandidateNotifications } from "@/lib/notification-cooldown";
import { getSupabaseAdmin, logDelivery } from "@/lib/supabase";
import { recordTokenUsage } from "@/lib/token-usage";
import { sendWhatsAppAlert } from "@/lib/whatsapp";
import type { Cluster, DeliveryPlatform } from "@/lib/types";

const DELIVERY_PIPELINE_SOURCE_TYPES = ["getir", "trendyol", "yemeksepeti", "csv"] as const;

type DeliveryPipelineSource = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: DeliveryPlatform;
  status: "connected" | "pending" | "error";
};

type NotifiableItem = {
  candidate: SignalCandidate;
  cluster: Cluster;
};

type WorkspaceWhatsAppRow = {
  id: string;
  whatsapp_config?: { opted_in?: boolean } | null;
  distribution_config?: {
    whatsapp?: {
      enabled?: boolean;
      critical_only?: boolean;
      recipient_numbers?: string[];
    };
  } | null;
};

type DigestWhatsAppSummary = {
  workspaces: number;
  sent: number;
  failed: number;
  skipped: Array<{ workspace_id: string; reason: string }>;
};

/**
 * Sends the day's Top-N clusters per workspace over WhatsApp (roadmap Faz 6).
 * Cooldown suppression already happened at candidate level; this applies the
 * per-workspace daily cap, the workspace's critical_only preference and
 * requires an opted-in recipient list.
 */
async function sendDailyDigestWhatsApp(items: NotifiableItem[]): Promise<DigestWhatsAppSummary> {
  const summary: DigestWhatsAppSummary = { workspaces: 0, sent: 0, failed: 0, skipped: [] };
  const digest = selectDailyDigestByWorkspace(items, 3);

  for (const [workspaceId, selected] of digest) {
    const { data } = await getSupabaseAdmin()
      .from("workspaces")
      .select("id, whatsapp_config, distribution_config")
      .eq("id", workspaceId)
      .single();

    const workspace = data as WorkspaceWhatsAppRow | null;
    const whatsappConfig = workspace?.distribution_config?.whatsapp;
    const recipients = whatsappConfig?.recipient_numbers ?? [];
    const optedIn = workspace?.whatsapp_config?.opted_in === true;

    if (!whatsappConfig?.enabled || !optedIn || recipients.length === 0) {
      summary.skipped.push({ workspace_id: workspaceId, reason: "whatsapp_not_enabled" });
      continue;
    }

    const deliverable = whatsappConfig.critical_only
      ? selected.filter((item) => item.cluster.severity >= 70)
      : selected;
    if (deliverable.length === 0) {
      summary.skipped.push({ workspace_id: workspaceId, reason: "below_critical_threshold" });
      continue;
    }

    summary.workspaces += 1;

    const branchIds = [...new Set(deliverable.map((item) => item.cluster.branch_id))];
    const { data: branches } = await getSupabaseAdmin()
      .from("branches")
      .select("id, name")
      .in("id", branchIds);
    const branchNames = new Map(
      ((branches ?? []) as Array<{ id: string; name: string }>).map((branch) => [branch.id, branch.name]),
    );

    for (const item of deliverable) {
      for (const number of recipients) {
        try {
          await sendWhatsAppAlert(number, item.cluster, {
            branchName: branchNames.get(item.cluster.branch_id) ?? null,
          });
          await logDelivery({
            cluster_id: item.cluster.id,
            branch_id: item.cluster.branch_id,
            channel: "whatsapp",
            recipient: number,
            sent_at: new Date().toISOString(),
            status: "sent",
          });
          summary.sent += 1;
        } catch (err) {
          summary.failed += 1;
          try {
            await logDelivery({
              cluster_id: item.cluster.id,
              branch_id: item.cluster.branch_id,
              channel: "whatsapp",
              recipient: number,
              sent_at: new Date().toISOString(),
              status: "failed",
              response: err instanceof Error ? err.message : "WhatsApp send failed",
            });
          } catch {
            // logging must never mask the original failure count
          }
        }
      }
    }
  }

  return summary;
}

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

  const notifiable: NotifiableItem[] = [];

  for (const source of ((data ?? []) as unknown as DeliveryPipelineSource[])) {
    if (!isDeliveryPipelinePlatform(source.type)) continue;

    try {
      const partnerSync = await syncPartnerSourceIfSupported(source);
      const previousNotifications = await fetchRecentCandidateNotifications({
        workspaceId: source.workspace_id,
        branchId: source.branch_id,
        since: cooldownSince(24),
      });
      const result = await runDeliveryDailyPipeline({
        workspaceId: source.workspace_id,
        branchId: source.branch_id,
        sourceId: source.id,
        platform: source.type,
        metricDate,
        previousNotifications,
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
      const clusters = await persistDeliveryCandidateClusterResults({
        metricDate,
        items: result.candidates.map((candidate, index) => ({
          candidate,
          cluster: finalBriefs[index].cluster,
        })),
      });

      const clustersByKey = new Map(
        clusters.filter((cluster) => cluster.candidate_key).map((cluster) => [cluster.candidate_key, cluster]),
      );
      for (const candidate of result.candidates) {
        if (!candidate.shouldNotify) continue;
        const cluster = clustersByKey.get(candidateKey(candidate, metricDate));
        if (cluster) notifiable.push({ candidate, cluster });
      }

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

  const whatsapp = await sendDailyDigestWhatsApp(notifiable);

  return NextResponse.json({
    ok: true,
    metric_date: metricDate,
    processed: summary.filter((item) => item.status === "processed").length,
    failed: summary.filter((item) => item.status === "failed").length,
    sources: summary.length,
    whatsapp,
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
      resolver: sourceAuthMaterialResolver,
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

function cooldownSince(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
