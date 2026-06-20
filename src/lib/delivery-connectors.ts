import type { DeliveryOrder, DeliveryPlatform, DeliveryReview } from "./types";

export type DeliveryConnectorProvider = Extract<DeliveryPlatform, "getir" | "trendyol">;

export interface ConnectorEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT";
  path: string;
  purpose: string;
}

export interface CredentialField {
  key: string;
  label: string;
  sensitive: true;
}

export interface DeliveryConnectorDefinition {
  provider: DeliveryConnectorProvider;
  displayName: string;
  configFields: string[];
  credentialFields: CredentialField[];
  endpoints: ConnectorEndpoint[];
}

export type DeliveryOrderInsert = Omit<DeliveryOrder, "id" | "created_at" | "updated_record_at">;
export type DeliveryReviewInsert = Omit<DeliveryReview, "id" | "created_at" | "updated_record_at">;

const CONNECTORS: Record<DeliveryConnectorProvider, DeliveryConnectorDefinition> = {
  getir: {
    provider: "getir",
    displayName: "Getir Yemek",
    configFields: ["restaurant_id", "restaurant_ids", "sync_window_days"],
    credentialFields: [
      { key: "appSecretKey", label: "App secret key", sensitive: true },
      { key: "restaurantSecretKey", label: "Restaurant secret key", sensitive: true },
    ],
    endpoints: [
      { id: "auth", method: "POST", path: "/auth/login", purpose: "Create a short-lived API token." },
      { id: "restaurants", method: "GET", path: "/restaurants", purpose: "Fetch restaurant identity, status, rating, and prep time." },
      { id: "reviews", method: "GET", path: "/restaurants/reviews", purpose: "Fetch restaurant reviews for a date range." },
      { id: "report", method: "GET", path: "/food-orders/report", purpose: "Fetch restaurant order and financial report." },
      { id: "report_details", method: "GET", path: "/food-orders/report/details", purpose: "Fetch order-level report details." },
      { id: "order", method: "GET", path: "/food-orders/{foodOrderId}", purpose: "Fetch a single order with amount, payment method, status, and timestamps." },
      { id: "active_orders", method: "POST", path: "/food-orders/active", purpose: "Fetch active orders for operations monitoring." },
      { id: "cancelled_orders", method: "POST", path: "/food-orders/periodic/cancelled", purpose: "Fetch cancelled orders periodically." },
      { id: "payment_methods", method: "GET", path: "/payment-methods", purpose: "Fetch platform payment method metadata." },
      { id: "restaurant_payment_methods", method: "GET", path: "/restaurants/payment-methods", purpose: "Fetch restaurant payment method metadata." },
    ],
  },
  trendyol: {
    provider: "trendyol",
    displayName: "Trendyol Go",
    configFields: ["supplier_id", "store_id", "delivery_type", "sync_window_days"],
    credentialFields: [
      { key: "apiKey", label: "API key", sensitive: true },
      { key: "apiSecretKey", label: "API secret key", sensitive: true },
    ],
    endpoints: [
      { id: "packages", method: "GET", path: "/integrator/order/meal/suppliers/{supplierid}/packages", purpose: "Fetch order package list by status and date range." },
      { id: "package", method: "GET", path: "/integrator/order/meal/suppliers/{supplierid}/packages/{packageId}", purpose: "Fetch order package details with amount, payment, coupon, promo, and prep fields." },
      { id: "reviews", method: "GET", path: "/integrator/review/meal/suppliers/{supplierid}/stores/{storeId}/reviews/filter", purpose: "Fetch restaurant reviews and rating breakdown." },
      { id: "review_stats", method: "GET", path: "/integrator/review/meal/suppliers/{supplierid}/stores/{storeId}/reviews/stats", purpose: "Fetch restaurant score aggregates." },
      { id: "answer_review", method: "POST", path: "/integrator/review/meal/suppliers/{supplierid}/stores/{storeId}/reviews/{reviewId}/answer", purpose: "Answer a restaurant review." },
    ],
  },
};

export function getDeliveryConnectorDefinition(provider: DeliveryConnectorProvider): DeliveryConnectorDefinition {
  return CONNECTORS[provider];
}

export function sanitizeDeliverySourceConfig(
  provider: DeliveryConnectorProvider,
  input: Record<string, unknown>,
): Record<string, string | number | string[]> {
  const allowed = new Set(CONNECTORS[provider].configFields);
  const output: Record<string, string | number | string[]> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string" && value.trim()) output[key] = value.trim();
    if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) output[key] = value;
  }

  return output;
}

export function summarizeCredentialPresence(
  provider: DeliveryConnectorProvider,
  input: Record<string, unknown>,
): { hasRequiredCredentials: boolean; providedFields: string[]; missingFields: string[] } {
  const required = CONNECTORS[provider].credentialFields.map((field) => field.key);
  const providedFields = required.filter((key) => typeof input[key] === "string" && (input[key] as string).trim().length > 0);
  const missingFields = required.filter((key) => !providedFields.includes(key));

  return {
    hasRequiredCredentials: missingFields.length === 0,
    providedFields,
    missingFields,
  };
}

export function normalizeGetirOrder(raw: Record<string, unknown>, context: NormalizeContext): DeliveryOrderInsert {
  return {
    workspace_id: context.workspaceId,
    branch_id: context.branchId,
    source_id: context.sourceId ?? null,
    platform: "getir",
    external_order_id: stringValue(raw.id) || context.fallbackExternalId,
    external_store_id: stringValue(nested(raw, ["restaurant", "id"])) ?? context.externalStoreId ?? null,
    status: stringValue(raw.status) ?? "unknown",
    ordered_at: stringValue(raw.checkoutDate) ?? context.observedAt,
    updated_at: latestStringDate([
      raw.deliverDate,
      raw.handoverDate,
      raw.prepareDate,
      raw.verifyDate,
      raw.checkoutDate,
    ]),
    gross_amount: numberValue(raw.totalPrice),
    net_amount: numberValue(raw.totalDiscountedPrice) ?? numberValue(raw.totalPrice),
    discount_amount: difference(numberValue(raw.totalPrice), numberValue(raw.totalDiscountedPrice)),
    payment_type: stringValue(raw.paymentMethod),
    payment_provider: stringValue(nested(raw, ["paymentMethodText", "tr"])) ?? null,
    cancel_reason: stringValue(nested(raw, ["cancelReason", "id"])) ?? stringValue(raw.cancelNote),
    prep_duration_minutes: minutesBetween(raw.verifyDate, raw.prepareDate),
    delivery_duration_minutes: minutesBetween(raw.handoverDate, raw.deliverDate),
    raw_ref: buildRawRef(raw),
  };
}

export function normalizeTrendyolPackage(raw: Record<string, unknown>, context: NormalizeContext): DeliveryOrderInsert {
  const couponDiscount = numberValue(nested(raw, ["coupon", "amount", "seller"])) ?? 0;
  const promoDiscount = sumPromotionSellerAmounts(raw.promotions);
  const grossAmount = numberValue(raw.totalPrice);

  return {
    workspace_id: context.workspaceId,
    branch_id: context.branchId,
    source_id: context.sourceId ?? null,
    platform: "trendyol",
    external_order_id: stringValue(raw.orderId) || stringValue(raw.orderNumber) || stringValue(raw.id) || context.fallbackExternalId,
    external_store_id: stringValue(raw.storeId) ?? context.externalStoreId ?? null,
    status: stringValue(raw.packageStatus) ?? "unknown",
    ordered_at: dateFromEpoch(raw.packageCreationDate) ?? context.observedAt,
    updated_at: dateFromEpoch(raw.packageModificationDate) ?? stringValue(raw.lastModifiedDate),
    gross_amount: grossAmount,
    net_amount: grossAmount !== null ? Math.max(0, grossAmount - couponDiscount - promoDiscount) : null,
    discount_amount: couponDiscount + promoDiscount,
    payment_type: stringValue(nested(raw, ["payment", "paymentType"])),
    payment_provider: stringValue(nested(raw, ["payment", "mealCard", "cardSourceType"])) ?? stringValue(nested(raw, ["payment", "onDelivery", "paymentType"])),
    cancel_reason: stringValue(nested(raw, ["cancelInfo", "reasonCode"])),
    prep_duration_minutes: numberValue(raw.preparationTime),
    delivery_duration_minutes: null,
    raw_ref: buildRawRef(raw),
  };
}

export function normalizeTrendyolReview(raw: Record<string, unknown>, context: NormalizeContext): DeliveryReviewInsert {
  return {
    workspace_id: context.workspaceId,
    branch_id: context.branchId,
    source_id: context.sourceId ?? null,
    platform: "trendyol",
    external_review_id: stringValue(raw.reviewId),
    external_order_id: stringValue(raw.orderParentId),
    external_store_id: stringValue(raw.restaurantId) ?? context.externalStoreId ?? null,
    reviewed_at: dateFromEpoch(raw.createdDate) ?? context.observedAt,
    rating_overall: numberValue(nested(raw, ["rating", "average"])),
    rating_food: numberValue(nested(raw, ["rating", "flavorScore"])),
    rating_service: numberValue(nested(raw, ["rating", "serviceScore"])),
    rating_delivery: numberValue(nested(raw, ["rating", "deliveryScore"])),
    comment_text: stringValue(nested(raw, ["comment", "text"])),
    answer_status: stringValue(nested(raw, ["comment", "restaurantAnswer", "status"])),
    classification: {},
    raw_ref: buildRawRef(raw),
  };
}

export interface NormalizeContext {
  workspaceId: string;
  branchId: string;
  sourceId?: string;
  externalStoreId?: string;
  observedAt: string;
  fallbackExternalId: string;
}

function nested(value: unknown, path: string[]): unknown {
  return path.reduce((current, key) => (
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined
  ), value);
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateFromEpoch(value: unknown): string | null {
  const timestamp = numberValue(value);
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function minutesBetween(start: unknown, end: unknown): number | null {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return null;
  const minutes = (endDate.getTime() - startDate.getTime()) / 60000;
  return minutes >= 0 ? Number(minutes.toFixed(2)) : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestStringDate(values: unknown[]): string | null {
  const dates = values
    .map(parseDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0]?.toISOString() ?? null;
}

function difference(gross: number | null, net: number | null): number | null {
  if (gross === null || net === null) return null;
  return Math.max(0, Number((gross - net).toFixed(2)));
}

function sumPromotionSellerAmounts(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((sum, item) => sum + (numberValue(nested(item, ["amount", "seller"])) ?? 0), 0);
}

function buildRawRef(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    external_id: stringValue(raw.id) ?? stringValue(raw.orderId) ?? stringValue(raw.reviewId),
  };
}
