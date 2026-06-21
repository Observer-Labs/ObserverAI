import { getSupabaseAdmin } from "./supabase";
import type { DeliveryOrder, DeliveryPlatform, DeliveryReview } from "./types";

export type DeliveryOrderInsert = Omit<DeliveryOrder, "id" | "created_at" | "updated_record_at">;
export type DeliveryReviewInsert = Omit<DeliveryReview, "id" | "created_at" | "updated_record_at">;

const DELIVERY_ORDERS_CONFLICT_TARGET = "workspace_id,platform,external_order_id";
const DELIVERY_REVIEWS_CONFLICT_TARGET = "workspace_id,platform,external_review_id";

export async function upsertDeliveryOrders(rows: DeliveryOrderInsert[]): Promise<DeliveryOrder[]> {
  if (rows.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("delivery_orders")
    .upsert(rows, { onConflict: DELIVERY_ORDERS_CONFLICT_TARGET })
    .select("*");

  if (error) throw error;
  return (data ?? []) as DeliveryOrder[];
}

export async function upsertDeliveryReviews(rows: DeliveryReviewInsert[]): Promise<DeliveryReview[]> {
  const rowsWithExternalIds = rows.filter((row) => Boolean(row.external_review_id));
  if (rowsWithExternalIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("delivery_reviews")
    .upsert(rowsWithExternalIds, { onConflict: DELIVERY_REVIEWS_CONFLICT_TARGET })
    .select("*");

  if (error) throw error;
  return (data ?? []) as DeliveryReview[];
}

export function isDeliveryPlatform(value: string): value is DeliveryPlatform {
  return value === "getir" || value === "trendyol" || value === "yemeksepeti" || value === "csv";
}
