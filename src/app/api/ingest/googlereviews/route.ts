export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { fetchGoogleBusinessReviewsFromAuthRef } from "@/lib/google-business-profile";
import {
  googleReviewDedupeKey,
  googleReviewToSignal,
  googleReviewsSummaryToSignal,
  isGoogleReviewActionable,
  normalizeGoogleReviewsSyncWindowDays,
  type GoogleReviewSignalInput,
} from "@/lib/google-reviews-ingest";
import { getSupabaseAdmin, insertSignals } from "@/lib/supabase";

type GoogleReviewsSourceRow = {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: string;
  config: Record<string, unknown>;
  last_sync_at: string | null;
};

type GoogleReviewsAuthRefRow = {
  vault_ref: string;
  status: string;
};

type ExistingGoogleReviewSignal = Pick<GoogleReviewSignalInput, "source_id" | "timestamp" | "sender" | "content" | "tags">;

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
  for (const source of (data ?? []) as GoogleReviewsSourceRow[]) {
    try {
      const locationName = stringConfig(source.config.location_id);
      if (!locationName) {
        summary.push({ source_id: source.id, status: "skipped", reason: "missing_location_id" });
        continue;
      }

      const authRef = await fetchGoogleReviewsAuthRef(workspaceId, source.id);
      if (!authRef || authRef.status !== "ready") {
        summary.push({ source_id: source.id, status: "skipped", reason: "missing_auth_ref" });
        continue;
      }

      const syncWindowDays = normalizeGoogleReviewsSyncWindowDays(source.config.sync_window_days);
      const isBackfillSync = !source.last_sync_at;
      const cutoff = new Date(Date.now() - syncWindowDays * 24 * 60 * 60 * 1000);
      const reviews = await fetchGoogleBusinessReviewsFromAuthRef({
        authRef,
        locationName,
        pageSize: 100,
        maxReviews: 500,
      });
      const reviewsInWindow = reviews.filter((review) => reviewTimestamp(review).getTime() >= cutoff.getTime());
      const signalReviews = reviewsInWindow.filter((review) => isBackfillSync || isGoogleReviewActionable(review));
      const reviewSignals = signalReviews.map((review) => ({
        ...googleReviewToSignal({
          workspaceId,
          branchId: source.branch_id,
          sourceId: source.id,
          review,
        }),
        reviewed: isBackfillSync ? false : !isGoogleReviewActionable(review),
      }));
      const summarySignal = googleReviewsSummaryToSignal({
        workspaceId,
        branchId: source.branch_id,
        sourceId: source.id,
        reviews,
      });
      const parsedSignals = summarySignal ? [...reviewSignals, summarySignal] : reviewSignals;
      const newSignals = await filterExistingSignals(workspaceId, source.branch_id, source.id, parsedSignals);
      const inserted = await insertSignals(newSignals);

      await getSupabaseAdmin()
        .from("sources")
        .update({
          status: "connected",
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", source.id)
        .eq("workspace_id", workspaceId);

      summary.push({
        source_id: source.id,
        status: "synced",
        fetched: reviews.length,
        in_window: reviewsInWindow.length,
        mode: isBackfillSync ? "historical_backfill" : "incremental_actionable",
        sync_window_days: syncWindowDays,
        actionable_reviews: reviewsInWindow.filter(isGoogleReviewActionable).length,
        ingested: inserted?.length ?? 0,
        existing_duplicates: parsedSignals.length - newSignals.length,
      });
    } catch (error) {
      summary.push({
        source_id: source.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Google Reviews ingest failed",
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
    .select("id, workspace_id, branch_id, type, config, last_sync_at")
    .eq("workspace_id", workspaceId)
    .in("type", ["googlereviews", "google_reviews"]);

  if (sourceId) query = query.eq("id", sourceId);
  return query;
}

async function fetchGoogleReviewsAuthRef(workspaceId: string, sourceId: string): Promise<GoogleReviewsAuthRefRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("source_auth_refs")
    .select("vault_ref, status")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("provider", "google_reviews")
    .maybeSingle();

  if (error) throw error;
  return data as GoogleReviewsAuthRefRow | null;
}

async function filterExistingSignals(
  workspaceId: string,
  branchId: string,
  sourceId: string,
  signals: GoogleReviewSignalInput[],
) {
  if (signals.length === 0) return signals;

  const timestamps = Array.from(new Set(signals.map((signal) => signal.timestamp))).slice(0, 500);
  const { data, error } = await getSupabaseAdmin()
    .from("signals")
    .select("source_id, timestamp, sender, content, tags")
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("source_id", sourceId)
    .eq("source", "googlereviews")
    .eq("channel", "review")
    .in("timestamp", timestamps);

  if (error) throw error;

  const existingKeys = new Set<string>();
  const existingReviewTags = new Set<string>();

  for (const signal of (data ?? []) as ExistingGoogleReviewSignal[]) {
    existingKeys.add(googleReviewDedupeKey(signal));
    for (const tag of signal.tags ?? []) {
      if (tag.startsWith("google_review:")) existingReviewTags.add(tag);
    }
  }

  return signals.filter((signal) => {
    const reviewTag = signal.tags?.find((tag) => tag.startsWith("google_review:"));
    if (reviewTag && existingReviewTags.has(reviewTag)) return false;
    return !existingKeys.has(googleReviewDedupeKey(signal));
  });
}

function stringConfig(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function reviewTimestamp(review: { update_time?: string; reviewed_at: string }) {
  return new Date(review.update_time ?? review.reviewed_at);
}
