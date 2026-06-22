import { getRequiredAuthFields, type SourceAuthProvider } from "./source-auth-refs";
import { getSupabaseAdmin } from "./supabase";

export interface StoreSourceAuthMaterialInput {
  sourceId: string;
  provider: SourceAuthProvider;
  material: Record<string, unknown>;
  requiredFields?: string[];
}

export interface StoredSourceAuthMaterial {
  vaultRef: string;
  requiredFields: string[];
  providedFields: string[];
}

export class SourceAuthSecretStoreError extends Error {
  status = 400;
}

const SUPABASE_VAULT_PREFIX = "supabase-vault://source-auth/";

export async function storeSourceAuthMaterial(
  workspaceId: string,
  input: StoreSourceAuthMaterialInput,
): Promise<StoredSourceAuthMaterial> {
  const normalized = normalizeAuthMaterial(input.provider, input.material, input.requiredFields);
  if (!workspaceId.trim()) throw new SourceAuthSecretStoreError("workspace_id is required");
  if (!input.sourceId.trim()) throw new SourceAuthSecretStoreError("source_id is required");
  if (normalized.providedFields.length !== normalized.requiredFields.length) {
    throw new SourceAuthSecretStoreError("Required auth fields are missing");
  }

  const { data, error } = await getSupabaseAdmin().rpc("source_auth_vault_store", {
    p_workspace_id: workspaceId,
    p_source_id: input.sourceId,
    p_provider: input.provider,
    p_secret: normalized.material,
  });

  if (error) throw error;
  if (typeof data !== "string" || !data.startsWith(SUPABASE_VAULT_PREFIX)) {
    throw new SourceAuthSecretStoreError("Secret store returned an invalid vault reference");
  }

  return {
    vaultRef: data,
    requiredFields: normalized.requiredFields,
    providedFields: normalized.providedFields,
  };
}

export async function resolveSourceAuthMaterialFromVault(input: {
  vaultRef: string;
  fields: string[];
}): Promise<Record<string, string>> {
  if (!input.vaultRef.startsWith(SUPABASE_VAULT_PREFIX)) {
    throw new SourceAuthSecretStoreError("Unsupported source auth vault reference");
  }

  const { data, error } = await getSupabaseAdmin().rpc("source_auth_vault_read", {
    p_vault_ref: input.vaultRef,
  });

  if (error) throw error;
  const material = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};

  const output: Record<string, string> = {};
  for (const field of input.fields) {
    const value = material[field];
    if (typeof value === "string" && value.trim()) output[field] = value.trim();
  }
  return output;
}

export function normalizeAuthMaterial(
  provider: SourceAuthProvider,
  material: Record<string, unknown>,
  requiredFields = getRequiredAuthFields(provider),
): {
  material: Record<string, string>;
  requiredFields: string[];
  providedFields: string[];
} {
  const required = [...new Set(requiredFields.map((field) => field.trim()).filter(Boolean))];
  const output: Record<string, string> = {};

  for (const field of required) {
    const value = material[field];
    if (typeof value === "string" && value.trim()) {
      output[field] = value.trim();
    }
  }

  return {
    material: output,
    requiredFields: required,
    providedFields: required.filter((field) => output[field]),
  };
}
