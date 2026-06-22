import { getDeliveryConnectorDefinition, type DeliveryConnectorProvider } from "./delivery-connectors";
import { getSupabaseAdmin } from "./supabase";

export type SourceAuthStatus = "pending" | "ready" | "error" | "revoked";
export type SourceAuthProvider = DeliveryConnectorProvider | "yemeksepeti" | "google_reviews" | "ga4" | "gmail" | "pos";

export interface SourceAuthSummary {
  mode: "vault_ref";
  provider: SourceAuthProvider;
  vault_ref: string;
  required_fields: string[];
  provided_fields: string[];
  status: SourceAuthStatus;
}

export interface SourceAuthRef extends SourceAuthSummary {
  id: string;
  workspace_id: string;
  source_id: string;
  last_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertSourceAuthRefInput {
  sourceId: string;
  provider: SourceAuthProvider;
  vaultRef: string;
  requiredFields?: string[];
  providedFields?: string[];
  status?: SourceAuthStatus;
  lastVerifiedAt?: string | null;
}

export class SourceAuthRefError extends Error {
  status = 400;
}

export class SourceAuthRefNotFoundError extends Error {
  status = 404;
}

const NON_DELIVERY_REQUIRED_FIELDS: Record<Exclude<SourceAuthProvider, DeliveryConnectorProvider>, string[]> = {
  yemeksepeti: ["integrationUser", "integrationPassword"],
  google_reviews: ["oauthRefreshToken"],
  ga4: ["serviceAccountJson"],
  gmail: ["oauthRefreshToken"],
  pos: ["integrationRef"],
};

export function getRequiredAuthFields(provider: SourceAuthProvider): string[] {
  if (provider === "getir" || provider === "trendyol") {
    return getDeliveryConnectorDefinition(provider).credentialFields.map((field) => field.key);
  }

  return [...NON_DELIVERY_REQUIRED_FIELDS[provider]];
}

export function buildSourceAuthSummary(input: {
  provider: SourceAuthProvider;
  vaultRef: string;
  requiredFields?: string[];
  providedFields?: string[];
  status?: SourceAuthStatus;
}): SourceAuthSummary {
  const provider = input.provider;
  const vaultRef = sanitizeVaultRef(input.vaultRef);
  const requiredFields = normalizeFieldNames(input.requiredFields ?? getRequiredAuthFields(provider));
  const providedFields = normalizeProvidedFields(input.providedFields ?? [], requiredFields);
  const status = input.status ?? (providedFields.length === requiredFields.length ? "ready" : "pending");

  return {
    mode: "vault_ref",
    provider,
    vault_ref: vaultRef,
    required_fields: requiredFields,
    provided_fields: providedFields,
    status,
  };
}

export async function upsertSourceAuthRef(
  workspaceId: string,
  input: UpsertSourceAuthRefInput,
): Promise<{ authRef: SourceAuthRef; sourceCredentials: SourceAuthSummary }> {
  if (!workspaceId.trim()) throw new SourceAuthRefError("workspace_id is required");
  if (!input.sourceId.trim()) throw new SourceAuthRefError("source_id is required");

  const summary = buildSourceAuthSummary({
    provider: input.provider,
    vaultRef: input.vaultRef,
    requiredFields: input.requiredFields,
    providedFields: input.providedFields,
    status: input.status,
  });

  const supabase = getSupabaseAdmin();
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, workspace_id")
    .eq("id", input.sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  if (sourceError || !source) throw new SourceAuthRefNotFoundError("Source not found");

  const row = {
    workspace_id: workspaceId,
    source_id: input.sourceId,
    provider: summary.provider,
    vault_ref: summary.vault_ref,
    required_fields: summary.required_fields,
    provided_fields: summary.provided_fields,
    status: summary.status,
    last_verified_at: input.lastVerifiedAt ?? null,
  };

  const { data: authRef, error: authError } = await supabase
    .from("source_auth_refs")
    .upsert(row, { onConflict: "source_id,provider" })
    .select("*")
    .single();

  if (authError) throw authError;

  const { error: sourceUpdateError } = await supabase
    .from("sources")
    .update({ credentials: summary })
    .eq("id", input.sourceId)
    .eq("workspace_id", workspaceId);

  if (sourceUpdateError) throw sourceUpdateError;

  return {
    authRef: authRef as SourceAuthRef,
    sourceCredentials: summary,
  };
}

export function sanitizeVaultRef(value: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) throw new SourceAuthRefError("vault_ref is required");
  if (trimmed.length > 240) throw new SourceAuthRefError("vault_ref is too long");
  if (/[\s=\n\r]/.test(trimmed)) throw new SourceAuthRefError("vault_ref must be an opaque reference, not an env assignment");
  if (!/^(vault|vercel|supabase-vault):\/\/[A-Za-z0-9._~:/-]+$/.test(trimmed)) {
    throw new SourceAuthRefError("vault_ref must use a supported reference URI");
  }
  if (looksLikeAuthValue(trimmed)) throw new SourceAuthRefError("vault_ref cannot contain auth material");
  return trimmed;
}

function normalizeFieldNames(values: string[]): string[] {
  const fields = values
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(fields)];
}

function normalizeProvidedFields(values: string[], requiredFields: string[]): string[] {
  const required = new Set(requiredFields);
  return normalizeFieldNames(values).filter((field) => required.has(field));
}

function looksLikeAuthValue(value: string): boolean {
  return [
    /^sk-[A-Za-z0-9_-]{12,}/,
    /^AIza[A-Za-z0-9_-]{12,}/,
    /^gh[pousr]_[A-Za-z0-9_]{12,}/,
    /^xox[baprs]-[A-Za-z0-9-]{12,}/,
    /^GOCSPX-[A-Za-z0-9_-]{12,}/,
    /BEGIN\s+(RSA\s+)?PRIVATE\s+KEY/i,
  ].some((pattern) => pattern.test(value));
}
