export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { EnvValidationError } from "@/env";
import { getGoogleReviewsAuthUrl, GoogleBusinessProfileError } from "@/lib/google-business-profile";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.redirect(`${siteUrl}/login?redirect=/connect`);
  }

  const sourceId = req.nextUrl.searchParams.get("source_id")?.trim();
  if (!sourceId) {
    return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_source_missing`);
  }

  const sourceExists = await hasGoogleReviewsSource(workspaceId, sourceId);
  if (!sourceExists) {
    return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_source_missing`);
  }

  try {
    return NextResponse.redirect(getGoogleReviewsAuthUrl({ workspaceId, sourceId }));
  } catch (error) {
    if (error instanceof EnvValidationError || error instanceof GoogleBusinessProfileError) {
      return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_not_configured`);
    }
    return NextResponse.redirect(`${siteUrl}/connect?error=google_reviews_auth_failed`);
  }
}

async function hasGoogleReviewsSource(workspaceId: string, sourceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .in("type", ["googlereviews", "google_reviews"])
    .single();

  return Boolean(data && !error);
}
