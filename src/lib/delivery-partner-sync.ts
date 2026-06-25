import { getDeliveryConnectorDefinition, type DeliveryConnectorProvider } from "./delivery-connectors";
import { getRequiredAuthFields, type SourceAuthStatus } from "./source-auth-refs";
import { getSupabaseAdmin } from "./supabase";

export interface DeliveryPartnerSourceRow {
  id: string;
  workspace_id: string;
  branch_id: string;
  type: string;
  display_name: string;
  status: string;
  config: Record<string, unknown>;
}

export interface DeliveryPartnerAuthRefRow {
  id: string;
  workspace_id: string;
  source_id: string;
  provider: string;
  vault_ref: string;
  required_fields: string[];
  provided_fields: string[];
  status: SourceAuthStatus;
  last_verified_at?: string | null;
}

export interface DeliveryPartnerSyncPlan {
  workspaceId: string;
  branchId: string;
  sourceId: string;
  provider: DeliveryConnectorProvider;
  displayName: string;
  externalStoreId: string;
  config: Record<string, string | number | string[]>;
  auth: {
    vaultRef: string;
    requiredFields: string[];
    providedFields: string[];
    missingFields: string[];
    status: SourceAuthStatus;
  };
  window: {
    start: string;
    end: string;
  };
  endpoints: Array<{
    id: string;
    method: string;
    path: string;
  }>;
}

export interface LoadDeliveryPartnerSyncPlanInput {
  workspaceId: string;
  sourceId: string;
  now?: Date;
  requireExternalStoreId?: boolean;
}

export interface DeliveryAuthMaterialResolver {
  resolve(ref: { vaultRef: string; fields: string[] }): Promise<Record<string, string>>;
}

export class DeliveryPartnerSyncError extends Error {
  status = 400;
}

export class DeliveryPartnerSyncNotFoundError extends Error {
  status = 404;
}

const DEFAULT_SYNC_WINDOW_DAYS = 3;
const MAX_SYNC_WINDOW_DAYS = 30;

export async function loadDeliveryPartnerSyncPlan(
  input: LoadDeliveryPartnerSyncPlanInput,
): Promise<DeliveryPartnerSyncPlan> {
  const source = await fetchDeliverySource(input.workspaceId, input.sourceId);
  const provider = parseDeliveryProvider(source.type);
  const authRef = await fetchReadyAuthRef(input.workspaceId, input.sourceId, provider);
  return buildDeliveryPartnerSyncPlan({
    source,
    authRef,
    provider,
    now: input.now ?? new Date(),
    requireExternalStoreId: input.requireExternalStoreId ?? true,
  });
}

export function buildDeliveryPartnerSyncPlan(input: {
  source: DeliveryPartnerSourceRow;
  authRef: DeliveryPartnerAuthRefRow;
  provider: DeliveryConnectorProvider;
  now: Date;
  requireExternalStoreId?: boolean;
}): DeliveryPartnerSyncPlan {
  const definition = getDeliveryConnectorDefinition(input.provider);
  const requiredFields = getRequiredAuthFields(input.provider);
  const providedFields = input.authRef.provided_fields.filter((field) => requiredFields.includes(field));
  const missingFields = requiredFields.filter((field) => !providedFields.includes(field));
  const externalStoreId = getExternalStoreId(input.provider, input.source.config);
  const syncWindowDays = getSyncWindowDays(input.source.config.sync_window_days);

  if (input.authRef.status !== "ready" || missingFields.length > 0) {
    throw new DeliveryPartnerSyncError("Delivery source auth is not ready");
  }
  if ((input.requireExternalStoreId ?? true) && !externalStoreId) {
    throw new DeliveryPartnerSyncError("Delivery source external store id is required");
  }

  return {
    workspaceId: input.source.workspace_id,
    branchId: input.source.branch_id,
    sourceId: input.source.id,
    provider: input.provider,
    displayName: input.source.display_name,
    externalStoreId,
    config: sanitizePlanConfig(input.source.config),
    auth: {
      vaultRef: input.authRef.vault_ref,
      requiredFields,
      providedFields,
      missingFields,
      status: input.authRef.status,
    },
    window: buildSyncWindow(input.now, syncWindowDays),
    endpoints: definition.endpoints.map((endpoint) => ({
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
    })),
  };
}

export async function resolveDeliveryAuthMaterial(
  plan: Pick<DeliveryPartnerSyncPlan, "auth">,
  resolver: DeliveryAuthMaterialResolver,
): Promise<Record<string, string>> {
  const values = await resolver.resolve({
    vaultRef: plan.auth.vaultRef,
    fields: plan.auth.requiredFields,
  });

  const missingFields = plan.auth.requiredFields.filter((field) => !isNonEmptyString(values[field]));
  if (missingFields.length > 0) {
    throw new DeliveryPartnerSyncError("Resolved auth material is incomplete");
  }

  return Object.fromEntries(plan.auth.requiredFields.map((field) => [field, values[field]]));
}

export function buildSyncWindow(now: Date, days: number) {
  if (Number.isNaN(now.getTime())) throw new DeliveryPartnerSyncError("Invalid sync window date");
  const boundedDays = Math.max(1, Math.min(MAX_SYNC_WINDOW_DAYS, Math.floor(days)));
  const end = new Date(now);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - boundedDays);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function fetchDeliverySource(workspaceId: string, sourceId: string): Promise<DeliveryPartnerSourceRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .select("id, workspace_id, branch_id, type, display_name, status, config")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) throw new DeliveryPartnerSyncNotFoundError("Delivery source not found");
  return data as DeliveryPartnerSourceRow;
}

async function fetchReadyAuthRef(
  workspaceId: string,
  sourceId: string,
  provider: DeliveryConnectorProvider,
): Promise<DeliveryPartnerAuthRefRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("source_auth_refs")
    .select("id, workspace_id, source_id, provider, vault_ref, required_fields, provided_fields, status, last_verified_at")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .eq("provider", provider)
    .single();

  if (error || !data) throw new DeliveryPartnerSyncNotFoundError("Delivery source auth ref not found");
  return data as DeliveryPartnerAuthRefRow;
}

function parseDeliveryProvider(type: string): DeliveryConnectorProvider {
  if (type === "getir" || type === "trendyol") return type;
  throw new DeliveryPartnerSyncError("Unsupported delivery provider");
}

function getExternalStoreId(provider: DeliveryConnectorProvider, config: Record<string, unknown>): string {
  if (provider === "getir") {
    return firstString(config.restaurant_id, firstStringFromArray(config.restaurant_ids));
  }

  return firstString(config.store_id);
}

function getSyncWindowDays(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : DEFAULT_SYNC_WINDOW_DAYS;
}

function sanitizePlanConfig(config: Record<string, unknown>): Record<string, string | number | string[]> {
  const sanitized: Record<string, string | number | string[]> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && value.trim()) sanitized[key] = value.trim();
    if (typeof value === "number" && Number.isFinite(value)) sanitized[key] = value;
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) sanitized[key] = value;
  }
  return sanitized;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstStringFromArray(value: unknown): string {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
