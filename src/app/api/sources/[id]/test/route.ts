export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { createDeliveryPartnerHttpClient, sourceAuthMaterialResolver } from "@/lib/delivery-partner-runtime";
import { testDeliverySourceConnection } from "@/lib/delivery-source-connection-test";
import {
  DeliveryPartnerSyncError,
  DeliveryPartnerSyncNotFoundError,
} from "@/lib/delivery-partner-sync";
import { SourceAuthSecretStoreError } from "@/lib/source-auth-secret-store";
import { getSupabaseAdmin } from "@/lib/supabase";

type SourceForTest = {
  id: string;
  type: string;
};

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
    const source = await fetchSourceForTest(workspaceId, sourceId);
    if (source.type !== "getir" && source.type !== "trendyol") {
      return NextResponse.json({ error: "Connection test is not available for this source" }, { status: 400 });
    }

    const result = await testDeliverySourceConnection({
      workspaceId,
      sourceId,
      resolver: sourceAuthMaterialResolver,
      http: createDeliveryPartnerHttpClient(source.type),
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (
      error instanceof DeliveryPartnerSyncError ||
      error instanceof DeliveryPartnerSyncNotFoundError ||
      error instanceof SourceAuthSecretStoreError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source connection test failed" },
      { status: 500 },
    );
  }
}

async function fetchSourceForTest(workspaceId: string, sourceId: string): Promise<SourceForTest> {
  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id, type")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) throw new DeliveryPartnerSyncNotFoundError("Source not found");
  return data as SourceForTest;
}
