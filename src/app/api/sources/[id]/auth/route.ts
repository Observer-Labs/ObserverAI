export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import {
  SourceAuthRefError,
  SourceAuthRefNotFoundError,
  type SourceAuthProvider,
  upsertSourceAuthRef,
} from "@/lib/source-auth-refs";
import {
  SourceAuthSecretStoreError,
  storeSourceAuthMaterial,
} from "@/lib/source-auth-secret-store";
import { getSupabaseAdmin } from "@/lib/supabase";

const SELF_SERVICE_AUTH_PROVIDERS = new Set<SourceAuthProvider>([
  "getir",
  "trendyol",
  "yemeksepeti",
]);

type SourceAuthRequestBody = {
  provider?: unknown;
  credentials?: unknown;
};

export async function POST(
  req: NextRequest,
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
    const body = await req.json().catch(() => ({})) as SourceAuthRequestBody;
    const provider = parseSelfServiceProvider(body.provider);
    const credentials = objectField(body.credentials);

    await assertSourceMatchesProvider(workspaceId, sourceId, provider);

    const stored = await storeSourceAuthMaterial(workspaceId, {
      sourceId,
      provider,
      material: credentials,
    });

    const { authRef, sourceCredentials } = await upsertSourceAuthRef(workspaceId, {
      sourceId,
      provider,
      vaultRef: stored.vaultRef,
      requiredFields: stored.requiredFields,
      providedFields: stored.providedFields,
      status: "ready",
      lastVerifiedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      auth_ref: authRef,
      source_credentials: sourceCredentials,
    });
  } catch (error) {
    if (
      error instanceof SourceAuthSecretStoreError ||
      error instanceof SourceAuthRefError ||
      error instanceof SourceAuthRefNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source auth setup failed" },
      { status: 500 },
    );
  }
}

function parseSelfServiceProvider(value: unknown): SourceAuthProvider {
  const provider = typeof value === "string" ? value.trim() : "";
  if (!SELF_SERVICE_AUTH_PROVIDERS.has(provider as SourceAuthProvider)) {
    throw new SourceAuthSecretStoreError("Unsupported source auth provider");
  }
  return provider as SourceAuthProvider;
}

function objectField(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function assertSourceMatchesProvider(
  workspaceId: string,
  sourceId: string,
  provider: SourceAuthProvider,
) {
  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id, type")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) throw new SourceAuthRefNotFoundError("Source not found");
  if ((data as { type?: string }).type !== provider) {
    throw new SourceAuthSecretStoreError("Provider does not match source type");
  }
}
