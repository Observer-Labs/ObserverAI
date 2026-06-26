export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { EnvValidationError } from "@/env";
import {
  decodeGoogleReviewsState,
  exchangeGoogleReviewsCode,
  fetchGoogleBusinessLocations,
  type GoogleBusinessLocationCandidate,
  GoogleBusinessProfileError,
} from "@/lib/google-business-profile";
import { storeSourceAuthMaterial } from "@/lib/source-auth-secret-store";
import { upsertSourceAuthRef } from "@/lib/source-auth-refs";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_denied`);
  }

  try {
    const parsedState = decodeGoogleReviewsState(state);
    await assertGoogleReviewsSource(parsedState.workspaceId, parsedState.sourceId);
    const tokens = await exchangeGoogleReviewsCode(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_refresh_missing`);
    }

    const locations = await fetchGoogleBusinessLocations(tokens.access_token);
    const stored = await storeSourceAuthMaterial(parsedState.workspaceId, {
      sourceId: parsedState.sourceId,
      provider: "google_reviews",
      material: { oauthRefreshToken: tokens.refresh_token },
    });
    await upsertSourceAuthRef(parsedState.workspaceId, {
      sourceId: parsedState.sourceId,
      provider: "google_reviews",
      vaultRef: stored.vaultRef,
      requiredFields: stored.requiredFields,
      providedFields: stored.providedFields,
      status: "ready",
      lastVerifiedAt: new Date().toISOString(),
    });

    await markSourceConnected(parsedState.workspaceId, parsedState.sourceId);

    if (locations.length === 1) {
      await updateSourceLocation(parsedState.workspaceId, parsedState.sourceId, locations[0]);
    }

    return NextResponse.redirect(`${siteUrl}/connect?google_reviews=connected&source_id=${parsedState.sourceId}`);
  } catch (error) {
    if (error instanceof EnvValidationError || error instanceof GoogleBusinessProfileError) {
      return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_auth_failed`);
    }
    return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_auth_failed`);
  }
}

async function assertGoogleReviewsSource(workspaceId: string, sourceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .in("type", ["googlereviews", "google_reviews"])
    .single();

  if (error || !data) throw new GoogleBusinessProfileError("Google Reviews source not found");
}

async function updateSourceLocation(
  workspaceId: string,
  sourceId: string,
  location: GoogleBusinessLocationCandidate,
) {
  const { data } = await getSupabaseAdmin()
    .from("sources")
    .select("branch_id, config")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  const config = data?.config && typeof data.config === "object" && !Array.isArray(data.config)
    ? data.config as Record<string, unknown>
    : {};

  await getSupabaseAdmin()
    .from("sources")
    .update({
      config: {
        ...config,
        location_id: location.external_id,
        location_name: location.name,
        ...(location.store_code ? { store_code: location.store_code } : {}),
      },
      status: "connected",
    })
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId);

  if (typeof data?.branch_id === "string" && location.name) {
    await getSupabaseAdmin()
      .from("branches")
      .update({
        name: location.name,
        ...(location.district ? { district: location.district } : {}),
        ...(location.city ? { city: location.city } : {}),
      })
      .eq("id", data.branch_id)
      .eq("workspace_id", workspaceId);
  }
}

async function markSourceConnected(workspaceId: string, sourceId: string) {
  await getSupabaseAdmin()
    .from("sources")
    .update({ status: "connected" })
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId);
}
