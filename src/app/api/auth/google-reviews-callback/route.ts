export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { EnvValidationError } from "@/env";
import {
  decodeGoogleReviewsState,
  exchangeGoogleReviewsCode,
  fetchGoogleBusinessLocations,
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

    if (locations.length === 1) {
      await updateSourceLocation(parsedState.workspaceId, parsedState.sourceId, locations[0].external_id);
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

async function updateSourceLocation(workspaceId: string, sourceId: string, locationId: string) {
  const { data } = await getSupabaseAdmin()
    .from("sources")
    .select("config")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  const config = data?.config && typeof data.config === "object" && !Array.isArray(data.config)
    ? data.config as Record<string, unknown>
    : {};

  await getSupabaseAdmin()
    .from("sources")
    .update({ config: { ...config, location_id: locationId } })
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId);
}
