export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5 minutes; Vercel Pro extends this

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/cron/ingest
 *
 * Vercel Cron entry point. Iterates all workspaces and triggers any source
 * ingest routes that the workspace has enabled.
 *
 * AUTH: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We reject
 * any request without that header. CRON_SECRET must be set as a Vercel env
 * var (random 32+ chars).
 *
 * SOURCE LIST: derived from src/lib/integrations.ts source registry, NOT
 * hardcoded here, adding a new source registers it in one place.
 */

// Sources whose ingest routes can be triggered per-workspace. Keyed by the
// path segment under /api/ingest/. If you add a new source, list it here.
const SCHEDULABLE_SOURCES = [
  "appstore",
  "email",
  "reddit",
  "zendesk",
  "intercom",
  "slack",
  "jira",
  "github",
] as const;

type SourceKey = typeof SCHEDULABLE_SOURCES[number];

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Discover workspaces with at least one enabled source ─────────────────
  const supabase = getSupabaseAdmin();
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, integrations_config, plan, polar_status, trial_ends_at")
    .not("integrations_config", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "https://observerai.app";

  const summary: Array<{ workspace_id: string; source: string; status: number }> = [];

  for (const ws of workspaces ?? []) {
    const ic = (ws.integrations_config ?? {}) as Record<string, { enabled?: boolean }>;

    // Only trigger ingest for active workspaces (not expired trials)
    // The ingest routes themselves don't gate on plan status, so we filter here
    // to avoid generating signals on dead workspaces.
    if (ws.plan === "trial" && ws.trial_ends_at && new Date(ws.trial_ends_at) < new Date()) {
      continue;
    }
    if (ws.plan === "pro" && ws.polar_status && ws.polar_status !== "active" && ws.polar_status !== "past_due") {
      continue;
    }

    for (const source of SCHEDULABLE_SOURCES) {
      if (!ic[source]?.enabled) continue;

      try {
        // Internal cron-trigger calls bypass cookie auth via a service header.
        // The ingest routes need a small change to accept this, see route handlers.
        const res = await fetch(`${baseUrl}/api/ingest/${source}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": cronSecret,
            "x-cron-workspace-id": ws.id,
          },
          body: "{}",
        });
        summary.push({ workspace_id: ws.id, source, status: res.status });
      } catch (err) {
        console.error(`[cron/ingest] ${ws.id}/${source} failed:`, err);
        summary.push({ workspace_id: ws.id, source: source as SourceKey, status: 0 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    processed: summary.length,
    workspaces: workspaces?.length ?? 0,
    summary,
  });
}
