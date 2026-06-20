import { describe, expect, it } from "vitest";
import {
  getDeliveryConnectorDefinition,
  normalizeGetirOrder,
  normalizeTrendyolPackage,
  normalizeTrendyolReview,
  sanitizeDeliverySourceConfig,
  summarizeCredentialPresence,
  type NormalizeContext,
} from "./delivery-connectors";

const context: NormalizeContext = {
  workspaceId: "workspace-1",
  branchId: "branch-1",
  sourceId: "source-1",
  externalStoreId: "store-1",
  observedAt: "2026-06-20T08:00:00.000Z",
  fallbackExternalId: "fallback-id",
};

describe("delivery connector definitions", () => {
  it("defines Getir endpoints without storing credential values", () => {
    const definition = getDeliveryConnectorDefinition("getir");

    expect(definition.endpoints.map((endpoint) => endpoint.path)).toEqual(expect.arrayContaining([
      "/auth/login",
      "/restaurants/reviews",
      "/food-orders/report",
      "/food-orders/report/details",
      "/food-orders/{foodOrderId}",
    ]));
    expect(definition.credentialFields.every((field) => field.sensitive)).toBe(true);
  });

  it("defines Trendyol order and review endpoints", () => {
    const definition = getDeliveryConnectorDefinition("trendyol");

    expect(definition.endpoints.map((endpoint) => endpoint.path)).toEqual(expect.arrayContaining([
      "/integrator/order/meal/suppliers/{supplierid}/packages",
      "/integrator/order/meal/suppliers/{supplierid}/packages/{packageId}",
      "/integrator/review/meal/suppliers/{supplierid}/stores/{storeId}/reviews/filter",
      "/integrator/review/meal/suppliers/{supplierid}/stores/{storeId}/reviews/stats",
    ]));
  });

  it("keeps source config non-sensitive and reports credential presence separately", () => {
    const config = sanitizeDeliverySourceConfig("trendyol", {
      supplier_id: " 12345 ",
      store_id: "store-9",
      sync_window_days: 14,
      apiKey: "do-not-copy",
    });
    const summary = summarizeCredentialPresence("trendyol", {
      apiKey: "present",
    });

    expect(config).toEqual({
      supplier_id: "12345",
      store_id: "store-9",
      sync_window_days: 14,
    });
    expect(summary).toEqual({
      hasRequiredCredentials: false,
      providedFields: ["apiKey"],
      missingFields: ["apiSecretKey"],
    });
  });
});

describe("delivery payload normalization", () => {
  it("normalizes Trendyol package payment and discount fields", () => {
    const order = normalizeTrendyolPackage({
      id: "package-1",
      orderId: "order-1",
      storeId: 330,
      packageStatus: "Delivered",
      packageCreationDate: 1781956800000,
      packageModificationDate: 1781960400000,
      totalPrice: 120,
      preparationTime: 18,
      payment: {
        paymentType: "PAY_WITH_MEAL_CARD",
        mealCard: { cardSourceType: "MEAL_CARD_NAME-ONLINE" },
      },
      coupon: { amount: { seller: 10 } },
      promotions: [{ amount: { seller: 5 } }],
    }, context);

    expect(order).toMatchObject({
      platform: "trendyol",
      external_order_id: "order-1",
      external_store_id: "330",
      status: "Delivered",
      gross_amount: 120,
      net_amount: 105,
      discount_amount: 15,
      payment_type: "PAY_WITH_MEAL_CARD",
      payment_provider: "MEAL_CARD_NAME-ONLINE",
      prep_duration_minutes: 18,
    });
  });

  it("normalizes Trendyol review rating breakdown", () => {
    const review = normalizeTrendyolReview({
      reviewId: "review-1",
      restaurantId: 508,
      orderParentId: 1581566890,
      createdDate: 1781956800000,
      rating: {
        flavorScore: 2,
        serviceScore: 3,
        deliveryScore: 1,
        average: 2,
      },
      comment: {
        text: "Delivery was late.",
        restaurantAnswer: { status: "APPROVED" },
      },
    }, context);

    expect(review).toMatchObject({
      platform: "trendyol",
      external_review_id: "review-1",
      external_order_id: "1581566890",
      external_store_id: "508",
      rating_overall: 2,
      rating_food: 2,
      rating_service: 3,
      rating_delivery: 1,
      comment_text: "Delivery was late.",
      answer_status: "APPROVED",
    });
  });

  it("normalizes Getir order amount, payment, and durations", () => {
    const order = normalizeGetirOrder({
      id: "food-order-1",
      status: 900,
      restaurant: { id: "restaurant-1" },
      totalPrice: 200,
      totalDiscountedPrice: 175,
      checkoutDate: "2026-06-20T08:00:00.000Z",
      verifyDate: "2026-06-20T08:03:00.000Z",
      prepareDate: "2026-06-20T08:21:00.000Z",
      handoverDate: "2026-06-20T08:25:00.000Z",
      deliverDate: "2026-06-20T08:47:00.000Z",
      paymentMethod: 3,
      cancelReason: { id: "late" },
    }, context);

    expect(order).toMatchObject({
      platform: "getir",
      external_order_id: "food-order-1",
      external_store_id: "restaurant-1",
      status: "900",
      gross_amount: 200,
      net_amount: 175,
      discount_amount: 25,
      payment_type: "3",
      cancel_reason: "late",
      prep_duration_minutes: 18,
      delivery_duration_minutes: 22,
    });
  });
});
