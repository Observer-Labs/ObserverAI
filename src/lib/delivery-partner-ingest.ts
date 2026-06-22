import {
  normalizeGetirOrder,
  normalizeGetirReview,
  normalizeTrendyolPackage,
  normalizeTrendyolReview,
  type NormalizeContext,
} from "./delivery-connectors";
import {
  upsertDeliveryOrders,
  upsertDeliveryReviews,
  type DeliveryOrderInsert,
  type DeliveryReviewInsert,
} from "./delivery-normalized-persistence";
import { resolveDeliveryAuthMaterial, type DeliveryAuthMaterialResolver, type DeliveryPartnerSyncPlan } from "./delivery-partner-sync";
import type { DeliveryOrder, DeliveryReview } from "./types";

export interface DeliveryPartnerHttpRequest {
  method: "GET" | "POST";
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | string[]>;
  body?: unknown;
}

export interface DeliveryPartnerHttpClient {
  request<T = unknown>(request: DeliveryPartnerHttpRequest): Promise<T>;
}

export interface DeliveryPartnerPersister {
  upsertOrders(rows: DeliveryOrderInsert[]): Promise<DeliveryOrder[]>;
  upsertReviews(rows: DeliveryReviewInsert[]): Promise<DeliveryReview[]>;
}

export interface SyncDeliveryPartnerSourceInput {
  plan: DeliveryPartnerSyncPlan;
  resolver: DeliveryAuthMaterialResolver;
  http: DeliveryPartnerHttpClient;
  persister?: DeliveryPartnerPersister;
  observedAt?: string;
}

export interface SyncDeliveryPartnerSourceResult {
  provider: DeliveryPartnerSyncPlan["provider"];
  sourceId: string;
  fetchedOrders: number;
  fetchedReviews: number;
  persistedOrders: number;
  persistedReviews: number;
}

export class DeliveryPartnerIngestError extends Error {
  status = 400;
}

const DEFAULT_PERSISTER: DeliveryPartnerPersister = {
  upsertOrders: upsertDeliveryOrders,
  upsertReviews: upsertDeliveryReviews,
};

export async function syncDeliveryPartnerSource(
  input: SyncDeliveryPartnerSourceInput,
): Promise<SyncDeliveryPartnerSourceResult> {
  const material = await resolveDeliveryAuthMaterial(input.plan, input.resolver);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const persister = input.persister ?? DEFAULT_PERSISTER;
  const fetched = input.plan.provider === "trendyol"
    ? await fetchTrendyol(input.plan, material, input.http, observedAt)
    : await fetchGetir(input.plan, material, input.http, observedAt);

  const [orders, reviews] = await Promise.all([
    persister.upsertOrders(fetched.orders),
    persister.upsertReviews(fetched.reviews),
  ]);

  return {
    provider: input.plan.provider,
    sourceId: input.plan.sourceId,
    fetchedOrders: fetched.orders.length,
    fetchedReviews: fetched.reviews.length,
    persistedOrders: orders.length,
    persistedReviews: reviews.length,
  };
}

async function fetchTrendyol(
  plan: DeliveryPartnerSyncPlan,
  material: Record<string, string>,
  http: DeliveryPartnerHttpClient,
  observedAt: string,
): Promise<{ orders: DeliveryOrderInsert[]; reviews: DeliveryReviewInsert[] }> {
  const supplierId = stringConfig(plan.config.supplier_id);
  if (!supplierId) throw new DeliveryPartnerIngestError("Trendyol supplier id is required");

  const headers = {
    Authorization: basicAuth(material.apiKey, material.apiSecretKey),
    "User-Agent": "ObserverAI/1.0",
  };
  const packagePath = `/integrator/order/meal/suppliers/${encodeURIComponent(supplierId)}/packages`;
  const reviewPath = `/integrator/review/meal/suppliers/${encodeURIComponent(supplierId)}/stores/${encodeURIComponent(plan.externalStoreId)}/reviews/filter`;
  const [packageResponse, reviewResponse] = await Promise.all([
    http.request({ method: "GET", path: packagePath, headers, query: trendDateQuery(plan) }),
    http.request({ method: "GET", path: reviewPath, headers, query: trendDateQuery(plan) }),
  ]);
  const context = normalizeContext(plan, observedAt);

  return {
    orders: extractRows(packageResponse).map((row, index) => normalizeTrendyolPackage(row, {
      ...context,
      fallbackExternalId: `${plan.sourceId}:trendyol-package:${index}`,
    })),
    reviews: extractRows(reviewResponse).map((row, index) => normalizeTrendyolReview(row, {
      ...context,
      fallbackExternalId: `${plan.sourceId}:trendyol-review:${index}`,
    })),
  };
}

async function fetchGetir(
  plan: DeliveryPartnerSyncPlan,
  material: Record<string, string>,
  http: DeliveryPartnerHttpClient,
  observedAt: string,
): Promise<{ orders: DeliveryOrderInsert[]; reviews: DeliveryReviewInsert[] }> {
  const loginResponse = await http.request({
    method: "POST",
    path: "/auth/login",
    headers: {
      Authorization: basicAuth(material.appSecretKey, material.restaurantSecretKey),
    },
  });
  const accessToken = extractAccessToken(loginResponse);
  if (!accessToken) throw new DeliveryPartnerIngestError("Getir auth response did not include an access token");

  const headers = { Authorization: `Bearer ${accessToken}` };
  const query = {
    startDate: plan.window.start,
    endDate: plan.window.end,
    restaurantIds: plan.externalStoreId,
  };
  const [orderResponse, reviewResponse] = await Promise.all([
    http.request({ method: "GET", path: "/food-orders/report/details", headers, query }),
    http.request({ method: "GET", path: "/restaurants/reviews", headers, query }),
  ]);
  const context = normalizeContext(plan, observedAt);

  return {
    orders: extractRows(orderResponse).map((row, index) => normalizeGetirOrder(row, {
      ...context,
      fallbackExternalId: `${plan.sourceId}:getir-order:${index}`,
    })),
    reviews: extractRows(reviewResponse).map((row, index) => normalizeGetirReview(row, {
      ...context,
      fallbackExternalId: `${plan.sourceId}:getir-review:${index}`,
    })),
  };
}

function normalizeContext(plan: DeliveryPartnerSyncPlan, observedAt: string): NormalizeContext {
  return {
    workspaceId: plan.workspaceId,
    branchId: plan.branchId,
    sourceId: plan.sourceId,
    externalStoreId: plan.externalStoreId,
    observedAt,
    fallbackExternalId: `${plan.sourceId}:fallback`,
  };
}

function extractRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  for (const key of ["data", "items", "content", "packages", "reviews", "result", "results"]) {
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

function trendDateQuery(plan: DeliveryPartnerSyncPlan) {
  return {
    startDate: plan.window.start,
    endDate: plan.window.end,
    storeId: plan.externalStoreId,
  };
}

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function stringConfig(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
