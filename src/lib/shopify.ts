/**
 * Shopify Admin API ingestor
 * Pulls orders (refunds, abandoned checkouts) and product reviews as signals.
 */
import type { ShopifyConfig } from "./types";

export interface ShopifySignal {
  source: "shopify";
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  sentiment: "negative" | "neutral" | "positive";
}

async function shopifyFetch(shop: string, token: string, path: string) {
  const url = `https://${shop}/admin/api/2024-04/${path}`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchShopifySignals(config: ShopifyConfig): Promise<ShopifySignal[]> {
  const { shop_domain, access_token, last_sync } = config;
  const signals: ShopifySignal[] = [];
  const since = last_sync ?? new Date(Date.now() - 7 * 86400000).toISOString();

  // 1. Refunded orders → negative signals
  try {
    const { orders } = await shopifyFetch(
      shop_domain, access_token,
      `orders.json?status=any&financial_status=refunded&created_at_min=${since}&limit=50&fields=id,created_at,refunds,line_items,note`
    );
    for (const order of (orders ?? [])) {
      const items = (order.line_items ?? []).map((i: { title: string }) => i.title).join(", ");
      const reason = order.refunds?.[0]?.refund_line_items?.[0]?.restock_type ?? "refunded";
      signals.push({
        source: "shopify",
        channel: "refunds",
        sender: `order-${order.id}`,
        content: `Order refunded. Items: ${items}. Reason: ${reason}. ${order.note ? `Note: ${order.note}` : ""}`.trim(),
        timestamp: order.created_at,
        sentiment: "negative",
      });
    }
  } catch (e) { console.error("[shopify] refunds:", e); }

  // 2. Abandoned checkouts → friction signals
  try {
    const { checkouts } = await shopifyFetch(
      shop_domain, access_token,
      `checkouts.json?created_at_min=${since}&limit=50&fields=id,created_at,line_items,abandoned_checkout_url`
    );
    for (const co of (checkouts ?? []).slice(0, 20)) {
      const items = (co.line_items ?? []).map((i: { title: string }) => i.title).join(", ");
      signals.push({
        source: "shopify",
        channel: "abandoned_checkout",
        sender: `checkout-${co.id}`,
        content: `Checkout abandoned with items in cart: ${items}. Checkout started but not completed.`,
        timestamp: co.created_at,
        sentiment: "negative",
      });
    }
  } catch (e) { console.error("[shopify] checkouts:", e); }

  // 3. Low-inventory products → operational signals
  try {
    const { products } = await shopifyFetch(
      shop_domain, access_token,
      `products.json?limit=20&fields=id,title,variants,created_at`
    );
    for (const p of (products ?? [])) {
      const lowVariants = (p.variants ?? []).filter(
        (v: { inventory_quantity: number }) => v.inventory_quantity >= 0 && v.inventory_quantity < 5
      );
      if (lowVariants.length > 0) {
        signals.push({
          source: "shopify",
          channel: "inventory",
          sender: `product-${p.id}`,
          content: `Product "${p.title}" has critically low inventory: ${lowVariants.length} variant(s) below 5 units. Risk of stockout and lost sales.`,
          timestamp: new Date().toISOString(),
          sentiment: "negative",
        });
      }
    }
  } catch (e) { console.error("[shopify] inventory:", e); }

  return signals;
}
