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
  "googlereviews",
  "googleanalytics",
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
type WorkspaceRow = {
  id: string;
  integrations_config?: Record<string, { enabled?: boolean }> | null;
  plan?: string | null;
  polar_status?: string | null;
  trial_ends_at?: string | null;
};

type SourceRow = {
  workspace_id: string;
  type: string;
};

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

  const { data: sourceRows, error: sourceError } = await supabase
    .from("sources")
    .select("workspace_id, type")
    .in("type", ["googlereviews", "google_reviews", "googleanalytics", "ga4"]);

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  const branchSourceKeys = new Map<string, Set<string>>();
  for (const source of (sourceRows ?? []) as SourceRow[]) {
    const normalizedType = normalizeSchedulableSourceType(source.type);
    const current = branchSourceKeys.get(source.workspace_id) ?? new Set<string>();
    current.add(normalizedType);
    branchSourceKeys.set(source.workspace_id, current);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "https://observerai.app";

  const summary: Array<{ workspace_id: string; source: string; status: number }> = [];

  for (const ws of (workspaces ?? []) as WorkspaceRow[]) {
    const ic = ws.integrations_config ?? {};

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
      if (!ic[source]?.enabled && !branchSourceKeys.get(ws.id)?.has(source)) continue;

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

function normalizeSchedulableSourceType(value: string) {
  if (value === "google_reviews") return "googlereviews";
  if (value === "ga4") return "googleanalytics";
  return value;
}
