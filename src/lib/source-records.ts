import { sanitizeDeliverySourceConfig, type DeliveryConnectorProvider } from "./delivery-connectors";
import { getSupabaseAdmin } from "./supabase";
import type { SignalSource, Source } from "./types";

const YEMEKSEPETI_CONFIG_FIELDS = new Set(["vendor_id", "store_id", "sync_window_days"]);

export class SourceValidationError extends Error {
  status = 400;
}

export class SourceNotFoundError extends Error {
  status = 404;
}

export interface CreateSourceInput {
  branch_id?: unknown;
  type?: unknown;
  display_name?: unknown;
  config?: unknown;
}

export async function createSourceRecord(workspaceId: string, input: CreateSourceInput): Promise<Source> {
  const parsed = parseSourceInput(input);
  await ensureActiveBranch(workspaceId, parsed.branch_id);

  const { data, error } = await getSupabaseAdmin()
    .from("sources")
    .insert({
      workspace_id: workspaceId,
      branch_id: parsed.branch_id,
      type: parsed.type,
      display_name: parsed.display_name,
      status: parsed.status,
      config: parsed.config,
      credentials: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Source;
}

export function parseSourceInput(input: CreateSourceInput): {
  branch_id: string;
  type: SignalSource;
  display_name: string;
  status: "connected" | "pending";
  config: Record<string, unknown>;
} {
  const branchId = stringField(input.branch_id);
  const type = stringField(input.type) as SignalSource | "";
  const displayName = stringField(input.display_name);

  if (!branchId) throw new SourceValidationError("branch_id is required");
  if (!type) throw new SourceValidationError("type is required");
  if (!isAllowedSourceType(type)) throw new SourceValidationError("Unsupported source type");
  if (!displayName) throw new SourceValidationError("display_name is required");

  const rawConfig = objectField(input.config);
  const sensitiveKeys = findSensitiveKeys(rawConfig);
  if (sensitiveKeys.length > 0) {
    throw new SourceValidationError("Sensitive credential fields cannot be stored in source config");
  }

  const config = sanitizeSourceConfig(type, rawConfig);

  return {
    branch_id: branchId,
    type,
    display_name: displayName,
    status: type === "csv" ? "connected" : "pending",
    config,
  };
}

function sanitizeSourceConfig(type: SignalSource, config: Record<string, unknown>): Record<string, unknown> {
  if (type === "getir" || type === "trendyol") {
    return sanitizeDeliverySourceConfig(type as DeliveryConnectorProvider, config);
  }

  if (type === "yemeksepeti") {
    return pickAllowedConfig(config, YEMEKSEPETI_CONFIG_FIELDS);
  }

  if (type === "csv") {
    return { mode: "manual_upload" };
  }

  return config;
}

async function ensureActiveBranch(workspaceId: string, branchId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id, status")
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) throw new SourceNotFoundError("Branch not found");
  if ((data as { status?: string }).status !== "active") {
    throw new SourceValidationError("Branch is paused");
  }
}

function isAllowedSourceType(value: string): value is SignalSource {
  return [
    "google_reviews", "googlereviews", "getir", "yemeksepeti", "trendyol",
    "pos", "ga4", "googleanalytics", "gmail", "email", "csv",
    "slack", "whatsapp", "zendesk", "intercom", "jira", "appstore",
    "googleplay", "github", "reddit", "shopify", "trustpilot",
  ].includes(value);
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function objectField(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function pickAllowedConfig(config: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string" && value.trim()) output[key] = value.trim();
    if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
  }
  return output;
}

function findSensitiveKeys(value: Record<string, unknown>, prefix = ""): string[] {
  const matches: string[] = [];

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const normalized = key.replace(/[_-]/g, "").toLowerCase();

    if (
      normalized.includes("secret") ||
      normalized.includes("token") ||
      normalized.includes("password") ||
      normalized.includes("credential") ||
      normalized.includes("apikey") ||
      normalized.includes("servicekey")
    ) {
      matches.push(path);
      continue;
    }

    if (child && typeof child === "object" && !Array.isArray(child)) {
      matches.push(...findSensitiveKeys(child as Record<string, unknown>, path));
    }
  }

  return matches;
}
