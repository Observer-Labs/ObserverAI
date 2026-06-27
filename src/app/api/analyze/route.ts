export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { analyzeSignals, summarizeGoogleReviewSignal } from "@/lib/anthropic";
import { getPendingSignals, upsertClusters, supabaseAdmin, getWorkspace, logDelivery, incrementAnalysisCount, resetAnalysisCountIfNeeded } from "@/lib/supabase";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getPlanStatus } from "@/lib/polar";
import { getPlanLimits, severityLabel, PLANS } from "@/lib/plans";
import { checkAnalyzeAllowed, recordAnalyzeCall } from "@/lib/rate-limit";
import { postToSlack } from "@/lib/slack";
import { sendEmailBrief } from "@/lib/email";
import { sendWhatsAppAlert } from "@/lib/whatsapp";
import { selectTopAnalysisCluster, shouldSendInitialWhatsApp } from "@/lib/analysis-delivery";
import {
  googleReviewSummaryCandidateKey,
  googleReviewSummarySignalToAnalysisResult,
  googleReviewSummarySourceId,
} from "@/lib/google-reviews-ingest";
import type { AnalysisResult, Cluster, Signal } from "@/lib/types";

type AnalysisResultWithCandidateKey = AnalysisResult & { candidate_key?: string };

export async function POST(req: NextRequest) {
  let wid: string;
  try {
    wid = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { branch_id?: string; include_demo?: boolean };
  const branchId = body.branch_id;
  const includeDemo = body.include_demo === true;
  const locale = (await getLocale()) === "en" ? "en" : "tr";

  if (includeDemo) {
    let realSignalsQuery = supabaseAdmin
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", wid)
      .neq("channel", "demo");

    if (branchId) realSignalsQuery = realSignalsQuery.eq("branch_id", branchId);

    const { count: realSignalCount, error: realSignalCountError } = await realSignalsQuery;
    if (realSignalCountError) {
      return NextResponse.json({ error: realSignalCountError.message }, { status: 500 });
    }
    if ((realSignalCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Demo data is only available when no real signals exist." },
        { status: 409 },
      );
    }
  }

  // ─── Plan gate ───────────────────────────────────────────────────────────────
  const workspace = await getWorkspace(wid);
  await resetAnalysisCountIfNeeded(workspace);
  // Re-fetch after potential reset
  const freshWorkspace = await getWorkspace(wid);
  const planStatus = getPlanStatus(freshWorkspace);
  if (!planStatus.allowed) {
    const msg =
      planStatus.reason === "trial_expired"
        ? "Your free trial has ended. Choose a plan to continue."
        : planStatus.reason === "trial_limit"
        ? `You've used all ${PLANS.trial.runsPerPeriod} free trial analyses. Choose a plan to continue.`
        : "Your subscription is inactive.";
    return NextResponse.json(
      { error: msg, upgrade: true, upgradeUrl: "/settings/billing" },
      { status: 402 },
    );
  }

  // ─── Rate limit + AI spend cap ──────────────────────────────────────────────
  const gateDecision = await checkAnalyzeAllowed(wid, planStatus.plan);
  if (!gateDecision.allowed) {
    const headers: Record<string, string> = {};
    if (gateDecision.reason === "rate_limited" && gateDecision.retryAfterSec) {
      headers["Retry-After"] = String(gateDecision.retryAfterSec);
    }
    return NextResponse.json(
      { error: gateDecision.message, reason: gateDecision.reason, upgrade: gateDecision.reason === "spend_capped" },
      { status: gateDecision.reason === "rate_limited" ? 429 : 402, headers },
    );
  }

  // Get pending signals, cap to plan's signalsPerRun to bound Claude cost
  const limits = getPlanLimits(planStatus.plan);
  const allSignals = await getPendingSignals(wid, 500, branchId, { includeDemo });
  const signals = allSignals.slice(0, limits.signalsPerRun);
  const signalsCapped = allSignals.length > signals.length;

  if (signals.length === 0) {
    return NextResponse.json({ message: "No signals to analyze", clusters: [] });
  }

  const summarySignalMap = new Map<string, Signal>();
  for (const signal of signals as Signal[]) {
    if (signal.source !== "googlereviews" || signal.channel !== "review_summary") continue;
    const sourceId = googleReviewSummarySourceId(signal);
    if (!sourceId) continue;
    const current = summarySignalMap.get(sourceId);
    if (!current || new Date(signal.created_at).getTime() > new Date(current.created_at).getTime()) {
      summarySignalMap.set(sourceId, signal);
    }
  }
  const summarySignals = Array.from(summarySignalMap.values());
  const previousSummaryClusters = await fetchPreviousSummaryClusters(wid, branchId, summarySignals);
  const summaryOutputsPromise = Promise.all(summarySignals.map(async (signal) => {
    const sourceId = googleReviewSummarySourceId(signal);
    const candidateKey = sourceId ? googleReviewSummaryCandidateKey(sourceId) : undefined;
    try {
      const { result, usage } = await summarizeGoogleReviewSignal(signal, locale);
      return {
        result: { ...result, ...(candidateKey ? { candidate_key: candidateKey } : {}) },
        usage,
      };
    } catch (error) {
      console.error("[analyze] Google review synthesis failed, using fallback:", error);
      const sourceId = googleReviewSummarySourceId(signal);
      const candidateKey = sourceId ? googleReviewSummaryCandidateKey(sourceId) : undefined;
      const result = googleReviewSummarySignalToAnalysisResult(
        signal,
        candidateKey ? previousSummaryClusters.get(candidateKey) : null,
        locale,
      );
      return {
        result: result ? { ...result, ...(candidateKey ? { candidate_key: candidateKey } : {}) } : null,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }
  }));
  const aiSignals = signals.filter((signal) => !(signal.source === "googlereviews" && signal.channel === "review_summary"));

  // Run Claude analysis with workspace vertical preset (stored on workspace directly)
  const vertical = (freshWorkspace as { vertical?: string }).vertical as import("@/lib/types").VerticalType ?? "auto";
  const aiOutputPromise = aiSignals.length > 0
    ? analyzeSignals(aiSignals, vertical, locale)
    : Promise.resolve({ results: [] as AnalysisResult[], usage: { inputTokens: 0, outputTokens: 0 } });
  const [summaryOutputs, aiOutput] = await Promise.all([summaryOutputsPromise, aiOutputPromise]);
  const summaryResults = summaryOutputs
    .map((output) => output.result)
    .filter((result): result is AnalysisResultWithCandidateKey => result !== null);
  const summaryUsage = summaryOutputs.reduce(
    (total, output) => ({
      inputTokens: total.inputTokens + output.usage.inputTokens,
      outputTokens: total.outputTokens + output.usage.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
  const usage = {
    inputTokens: aiOutput.usage.inputTokens + summaryUsage.inputTokens,
    outputTokens: aiOutput.usage.outputTokens + summaryUsage.outputTokens,
  };
  const aiResults = aiOutput.results;
  const results: AnalysisResultWithCandidateKey[] = [...summaryResults, ...aiResults];

  // Record usage for spend cap + audit log (non-blocking on failure)
  recordAnalyzeCall(wid, usage.inputTokens, usage.outputTokens).catch((err) =>
    console.error("[analyze] failed to record usage:", err),
  );

  // Map to cluster format, severity_label sourced from plans.ts (single source of truth)
  const clusters = results.map((r) => ({
    workspace_id: wid,
    branch_id: branchId ?? signals[0]?.branch_id,
    title: r.title,
    severity: r.severity,
    severity_label: severityLabel(r.severity),
    confidence: r.confidence,
    evidence_count: r.evidence_count,
    source_breakdown: r.source_breakdown,
    business_case: r.business_case,
    recommended_action: r.recommended_action,
    ...(r.candidate_key ? { candidate_key: r.candidate_key } : {}),
    ...(r.category !== undefined ? { category: r.category } : {}),
    customer_quote: r.customer_quote,
    projected_impact: r.projected_impact,
    status: "active" as const,
  }));

  const inserted = await upsertClusters(clusters);

  // Increment usage counter
  await incrementAnalysisCount(wid);

  // Mark only the exact capped signal set used in this run as reviewed.
  await supabaseAdmin
    .from("signals")
    .update({ reviewed: true })
    .eq("workspace_id", wid)
    .in("id", signals.map((signal) => signal.id));

  // Auto-distribute if enabled, call libraries directly (not via HTTP, which lacks auth cookies)
  try {
    const distConfig = freshWorkspace.distribution_config;
    const initialAnalysisAlreadySent = Boolean(freshWorkspace.whatsapp_config?.initial_analysis_sent_at);
    const initialWhatsAppEnabled = shouldSendInitialWhatsApp({
      includeDemo,
      initialAnalysisSentAt: initialAnalysisAlreadySent
        ? freshWorkspace.whatsapp_config?.initial_analysis_sent_at
        : undefined,
      enabled: distConfig?.whatsapp?.enabled,
      recipientNumbers: distConfig?.whatsapp?.recipient_numbers,
    });
    if ((distConfig?.auto_distribute || initialWhatsAppEnabled) && inserted && inserted.length > 0) {
      const topCluster = selectTopAnalysisCluster(inserted as Cluster[]);
      if (!topCluster) return NextResponse.json({ error: "No analysis cluster was created." }, { status: 500 });
      const distributes: Promise<{ channel: string; success: boolean }>[] = [];

      if (distConfig?.auto_distribute && distConfig.slack?.enabled) {
        const token = freshWorkspace.slack_bot_token ?? freshWorkspace.slack_token;
        const channels: string[] = distConfig.slack.channels ?? [];
        if (token && channels.length > 0) {
          for (const channel of channels) {
            distributes.push(
              postToSlack(token, channel, topCluster).then(async () => {
                await logDelivery({ cluster_id: topCluster.id, channel: "slack", recipient: channel, sent_at: new Date().toISOString(), status: "sent" });
                return { channel: "slack", success: true };
              }).catch(async () => {
                await logDelivery({ cluster_id: topCluster.id, channel: "slack", recipient: channel, sent_at: new Date().toISOString(), status: "failed" });
                return { channel: "slack", success: false };
              })
            );
          }
        }
      }

      if (distConfig?.auto_distribute && distConfig.email?.enabled) {
        const recipients: string[] = distConfig.email.recipients ?? [];
        if (recipients.length > 0) {
          distributes.push(
            sendEmailBrief(recipients, inserted as Cluster[], undefined, locale).then(async () => {
              for (const c of inserted!) {
                await logDelivery({ cluster_id: c.id, channel: "email", recipient: recipients.join(", "), sent_at: new Date().toISOString(), status: "sent" });
              }
              return { channel: "email", success: true };
            }).catch(async () => {
              for (const c of inserted!) {
                await logDelivery({ cluster_id: c.id, channel: "email", recipient: recipients.join(", "), sent_at: new Date().toISOString(), status: "failed" });
              }
              return { channel: "email", success: false };
            })
          );
        }
      }

      if ((distConfig?.auto_distribute || initialWhatsAppEnabled) && distConfig?.whatsapp?.enabled) {
        const numbers: string[] = distConfig.whatsapp.recipient_numbers ?? [];
        let branchName: string | null = null;
        if (topCluster.branch_id) {
          const { data: branch } = await supabaseAdmin
            .from("branches")
            .select("name")
            .eq("id", topCluster.branch_id)
            .eq("workspace_id", wid)
            .single();
          branchName = (branch as { name?: string } | null)?.name ?? null;
        }
        for (const number of numbers) {
          distributes.push(
            sendWhatsAppAlert(number, topCluster, { branchName, locale }).then(async () => {
              await logDelivery({ cluster_id: topCluster.id, channel: "whatsapp", recipient: number, sent_at: new Date().toISOString(), status: "sent" });
              return { channel: "whatsapp", success: true };
            }).catch(async () => {
              await logDelivery({ cluster_id: topCluster.id, channel: "whatsapp", recipient: number, sent_at: new Date().toISOString(), status: "failed" });
              return { channel: "whatsapp", success: false };
            })
          );
        }
      }

      const deliveryResults = await Promise.all(distributes);
      if (initialWhatsAppEnabled && deliveryResults.some((result) => result.channel === "whatsapp" && result.success)) {
        await supabaseAdmin
          .from("workspaces")
          .update({
            whatsapp_config: {
              ...(freshWorkspace.whatsapp_config ?? {}),
              initial_analysis_sent_at: new Date().toISOString(),
            },
          })
          .eq("id", wid);
      }
    }
  } catch {
    // Auto-distribute failure must not block the analysis response
  }

  return NextResponse.json({
    analyzed: signals.length,
    clusters: inserted?.length ?? 0,
    results: inserted,
    signalsCapped,
    totalSignals: allSignals.length,
    runsLeft: planStatus.runsLeft,
  });
}

async function fetchPreviousSummaryClusters(
  workspaceId: string,
  branchId: string | undefined,
  summarySignals: Signal[],
) {
  const candidateKeys = Array.from(new Set(
    summarySignals
      .map((signal) => {
        const sourceId = googleReviewSummarySourceId(signal);
        return sourceId ? googleReviewSummaryCandidateKey(sourceId) : null;
      })
      .filter((value): value is string => Boolean(value)),
  ));

  if (candidateKeys.length === 0) return new Map<string, Pick<Cluster, "business_case" | "recommended_action">>();

  let query = supabaseAdmin
    .from("clusters")
    .select("candidate_key, business_case, recommended_action")
    .eq("workspace_id", workspaceId)
    .in("candidate_key", candidateKeys);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw error;

  return new Map(
    (data ?? [])
      .filter((row): row is { candidate_key: string; business_case: string | null; recommended_action: string | null } => (
        typeof row.candidate_key === "string"
      ))
      .map((row) => [row.candidate_key, {
        business_case: row.business_case,
        recommended_action: row.recommended_action,
      }]),
  );
}

export async function GET(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const branchId = req.nextUrl.searchParams.get("branch_id");
  const includeDemo = req.nextUrl.searchParams.get("include_demo") === "true";

  if (!includeDemo) {
    let realSignalsQuery = supabaseAdmin
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("channel", "demo");

    if (branchId) realSignalsQuery = realSignalsQuery.eq("branch_id", branchId);

    const { count: realSignalCount, error: realSignalCountError } = await realSignalsQuery;
    if (realSignalCountError) {
      return NextResponse.json({ error: realSignalCountError.message }, { status: 500 });
    }

    if ((realSignalCount ?? 0) === 0) {
      return NextResponse.json({ clusters: [] });
    }
  }

  let query = supabaseAdmin
    .from("clusters")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("severity", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hide demo-seeded clusters in non-demo mode so they don't pollute real data
  const clusters = includeDemo
    ? data
    : (data ?? []).filter((c) => !c.candidate_key?.startsWith("demo_"));

  return NextResponse.json({ clusters });
}
