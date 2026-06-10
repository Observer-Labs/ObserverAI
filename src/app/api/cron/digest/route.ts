export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmailBrief } from "@/lib/email";
import type { Cluster } from "@/lib/types";

/**
 * GET /api/cron/digest
 *
 * Daily digest cron. For each workspace that has email distribution enabled
 * AND a non-empty recipient list, send the top 3 active clusters as a brief.
 *
 * Authentication: same pattern as /api/cron/ingest (Bearer ${CRON_SECRET}).
 *
 * No-op for workspaces:
 *  - without email distribution enabled
 *  - with zero recipients configured
 *  - with no active clusters since the last digest
 *
 * Schedule: defined in vercel.json (e.g. daily at 13:00 UTC = 9am ET).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, distribution_config, plan, polar_status, trial_ends_at")
    .not("distribution_config", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type DistConfig = {
    email?: { enabled?: boolean; recipients?: string[]; schedule?: string };
  };

  const sentSummary: Array<{ workspace_id: string; recipients: number; clusters: number }> = [];

  for (const ws of workspaces ?? []) {
    const dist = (ws.distribution_config ?? {}) as DistConfig;

    // Skip if email distribution isn't enabled
    if (!dist.email?.enabled) continue;
    const recipients = dist.email.recipients ?? [];
    if (recipients.length === 0) continue;

    // Skip dead workspaces
    if (ws.plan === "trial" && ws.trial_ends_at && new Date(ws.trial_ends_at) < new Date()) continue;
    if (ws.plan === "pro" && ws.polar_status && !["active", "past_due"].includes(ws.polar_status)) continue;

    // Top 3 active clusters by severity from the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: clusters } = await supabase
      .from("clusters")
      .select("*")
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .gte("created_at", since)
      .order("severity", { ascending: false })
      .limit(3);

    if (!clusters || clusters.length === 0) continue;

    try {
      await sendEmailBrief(recipients, clusters as Cluster[]);
      sentSummary.push({
        workspace_id: ws.id,
        recipients: recipients.length,
        clusters: clusters.length,
      });
    } catch (err) {
      console.error(`[cron/digest] ${ws.id} failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    digestsSent: sentSummary.length,
    summary: sentSummary,
  });
}
