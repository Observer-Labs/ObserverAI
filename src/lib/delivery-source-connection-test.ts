import type { DeliveryConnectorProvider } from "./delivery-connectors";
import {
  loadDeliveryPartnerSyncPlan,
  resolveDeliveryAuthMaterial,
  type DeliveryAuthMaterialResolver,
  type DeliveryPartnerSyncPlan,
} from "./delivery-partner-sync";
import type { DeliveryPartnerHttpClient } from "./delivery-partner-ingest";

export interface DeliverySourceStoreCandidate {
  external_id: string;
  name?: string;
  status?: string;
}

export interface DeliverySourceConnectionCheck {
  id: string;
  status: "ok";
  item_count?: number;
}

export interface DeliverySourceConnectionTestResult {
  status: "ready";
  provider: DeliveryConnectorProvider;
  sourceId: string;
  checkedAt: string;
  checks: DeliverySourceConnectionCheck[];
  store_candidates: DeliverySourceStoreCandidate[];
}

export interface TestDeliverySourceConnectionInput {
  workspaceId: string;
  sourceId: string;
  resolver: DeliveryAuthMaterialResolver;
  http: DeliveryPartnerHttpClient;
  checkedAt?: string;
}

export class DeliverySourceConnectionTestError extends Error {
  status = 400;
}

export async function testDeliverySourceConnection(
  input: TestDeliverySourceConnectionInput,
): Promise<DeliverySourceConnectionTestResult> {
  const plan = await loadDeliveryPartnerSyncPlan({
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    requireExternalStoreId: false,
  });
  const material = await resolveDeliveryAuthMaterial(plan, input.resolver);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const result = plan.provider === "trendyol"
    ? await testTrendyolConnection(plan, material, input.http)
    : await testGetirConnection(plan, material, input.http);

  return {
    status: "ready",
    provider: plan.provider,
    sourceId: plan.sourceId,
    checkedAt,
    ...result,
  };
}

async function testTrendyolConnection(
  plan: DeliveryPartnerSyncPlan,
  material: Record<string, string>,
  http: DeliveryPartnerHttpClient,
): Promise<Pick<DeliverySourceConnectionTestResult, "checks" | "store_candidates">> {
  const supplierId = stringConfig(plan.config.supplier_id);
  if (!supplierId) throw new DeliverySourceConnectionTestError("Trendyol supplier id is required");

  const headers = {
    Authorization: basicAuth(material.apiKey, material.apiSecretKey),
    "User-Agent": "ObserverAI/1.0",
  };
  const storesPath = `/integrator/store/meal/suppliers/${encodeURIComponent(supplierId)}/stores`;
  const storesResponse = await http.request({ method: "GET", path: storesPath, headers });
  const stores = extractRows(storesResponse).map(toStoreCandidate).filter((store) => store.external_id);
  const fallback = stores.length > 0
    ? stores
    : plan.externalStoreId
      ? [{ external_id: plan.externalStoreId, name: plan.displayName }]
      : [];

  return {
    checks: [{ id: "stores", status: "ok", item_count: stores.length }],
    store_candidates: fallback,
  };
}

async function testGetirConnection(
  plan: DeliveryPartnerSyncPlan,
  material: Record<string, string>,
  http: DeliveryPartnerHttpClient,
): Promise<Pick<DeliverySourceConnectionTestResult, "checks" | "store_candidates">> {
  const loginResponse = await http.request({
    method: "POST",
    path: "/auth/login",
    headers: {
      Authorization: basicAuth(material.appSecretKey, material.restaurantSecretKey),
    },
  });
  const accessToken = extractAccessToken(loginResponse);
  if (!accessToken) throw new DeliverySourceConnectionTestError("Getir auth response did not include an access token");
  const loginRestaurantId = stringFromRecordDeep(loginResponse, ["restaurantId", "restaurant_id"]);

  const restaurantsResponse = await http.request({
    method: "GET",
    path: "/restaurants",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const stores = extractRows(restaurantsResponse).map(toStoreCandidate).filter((store) => store.external_id);
  const fallback = stores.length > 0
    ? stores
    : loginRestaurantId
      ? [{ external_id: loginRestaurantId, name: plan.displayName }]
      : plan.externalStoreId
        ? [{ external_id: plan.externalStoreId, name: plan.displayName }]
        : [];

  return {
    checks: [
      { id: "auth", status: "ok" },
      { id: "restaurants", status: "ok", item_count: stores.length },
    ],
    store_candidates: fallback,
  };
}

function toStoreCandidate(row: Record<string, unknown>): DeliverySourceStoreCandidate {
  return {
    external_id: stringFromRecord(row, ["id", "restaurantId", "restaurant_id", "storeId", "store_id", "externalId"]) || "",
    name: stringFromRecord(row, ["name", "restaurantName", "storeName", "title"]),
    status: stringFromRecord(row, ["status", "state"]),
  };
}

function extractRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  for (const key of ["data", "items", "content", "restaurants", "stores", "result", "results"]) {
    const child = value[key];
    if (Array.isArray(child)) return child.filter(isRecord);
    if (isRecord(child)) {
      const nested = extractRows(child);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

function extractAccessToken(value: unknown): string {
  if (!isRecord(value)) return "";
  for (const key of ["token", "accessToken", "access_token"]) {
    const sessionValue = value[key];
    if (typeof sessionValue === "string" && sessionValue.trim()) return sessionValue.trim();
  }
  return extractAccessToken(value.data);
}

function stringFromRecord(value: unknown, keys: string[]): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    const child = value[key];
    if (typeof child === "string" && child.trim()) return child.trim();
    if (typeof child === "number" && Number.isFinite(child)) return String(child);
  }
  return undefined;
}

function stringFromRecordDeep(value: unknown, keys: string[]): string | undefined {
  const current = stringFromRecord(value, keys);
  if (current) return current;
  if (!isRecord(value)) return undefined;

  for (const key of ["data", "result", "restaurant", "store"]) {
    const nested = value[key];
    const found = stringFromRecordDeep(nested, keys);
    if (found) return found;
  }

  return undefined;
}

function stringConfig(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
