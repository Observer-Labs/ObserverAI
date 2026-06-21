export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { fetchGoogleBusinessLocationsFromAuthRef, GoogleBusinessProfileError } from "@/lib/google-business-profile";
import { SourceAuthSecretStoreError } from "@/lib/source-auth-secret-store";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id: sourceId } = await params;

  try {
    await assertGoogleReviewsSource(workspaceId, sourceId);
    const authRef = await fetchGoogleReviewsAuthRef(workspaceId, sourceId);
    const locations = await fetchGoogleBusinessLocationsFromAuthRef(authRef);
    return NextResponse.json({
      result: {
        status: "ready",
        provider: "googlereviews",
        checkedAt: new Date().toISOString(),
        checks: [{ id: "locations", status: "ok", item_count: locations.length }],
        store_candidates: locations.map((location) => ({
          external_id: location.external_id,
          name: location.name,
          status: location.store_code,
        })),
      },
    });
  } catch (error) {
    if (error instanceof GoogleBusinessProfileError || error instanceof SourceAuthSecretStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Reviews locations could not be loaded" },
      { status: 500 },
    );
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

async function fetchGoogleReviewsAuthRef(workspaceId: string, sourceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("source_auth_refs")
    .select("vault_ref")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("provider", "google_reviews")
    .single();

  if (error || !data) throw new GoogleBusinessProfileError("Google Reviews OAuth is not connected");
  return data as { vault_ref: string };
}
