import { unstable_cache } from "next/cache";
import { Polar } from "@polar-sh/sdk";

export type PeriodPrices = {
  monthly?: number; // cents
  yearly?: number;  // cents
};

export type AllPlanPrices = {
  starter: PeriodPrices;
  growth: PeriodPrices;
  scale: PeriodPrices;
};

// Fallback prices (cents) — shown if Polar API is unavailable.
// Yearly values are ANNUAL TOTALS (matching what Polar returns) so
// the UI can divide by 12 to show the monthly equivalent consistently.
export const FALLBACK_PRICES: AllPlanPrices = {
  starter: { yearly: 75900 },             // $759/yr → $63/mo
  growth: { monthly: 14900, yearly: 142800 },  // $149/mo · $1,428/yr → $119/mo
  scale:  { monthly: 29900, yearly: 286800 },  // $299/mo · $2,868/yr → $239/mo
};

const PLAN_ENV_KEYS = {
  starter: { monthly: "POLAR_STARTER_MONTHLY_PRODUCT_ID", yearly: "POLAR_STARTER_YEARLY_PRODUCT_ID" },
  growth:  { monthly: "POLAR_GROWTH_MONTHLY_PRODUCT_ID",  yearly: "POLAR_GROWTH_YEARLY_PRODUCT_ID" },
  scale:   { monthly: "POLAR_SCALE_MONTHLY_PRODUCT_ID",   yearly: "POLAR_SCALE_YEARLY_PRODUCT_ID" },
} as const;

async function fetchProductPrice(polar: Polar, productId: string): Promise<number | undefined> {
  try {
    const product = await polar.products.get({ id: productId });
    for (const p of product.prices) {
      if ("amountType" in p && p.amountType === "fixed" && "priceAmount" in p && typeof p.priceAmount === "number") {
        return p.priceAmount;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function _fetchPolarPrices(): Promise<AllPlanPrices> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) return FALLBACK_PRICES;

  const polar = new Polar({ accessToken: token, server: "production" });

  const tasks: Promise<{ plan: keyof AllPlanPrices; period: "monthly" | "yearly"; price?: number }>[] = [];

  for (const [planKey, periods] of Object.entries(PLAN_ENV_KEYS) as [keyof AllPlanPrices, { monthly: string; yearly: string }][]) {
    for (const [periodKey, envKey] of Object.entries(periods) as ["monthly" | "yearly", string][]) {
      const productId = process.env[envKey];
      if (!productId) continue;
      tasks.push(
        fetchProductPrice(polar, productId).then((price) => ({ plan: planKey, period: periodKey, price }))
      );
    }
  }

  const settled = await Promise.allSettled(tasks);
  const prices: AllPlanPrices = { starter: {}, growth: {}, scale: {} };

  for (const result of settled) {
    if (result.status === "fulfilled" && result.value.price !== undefined) {
      const { plan, period, price } = result.value;
      prices[plan][period] = price;
    }
  }

  // Fill any missing slots from fallback so UI always has a number to show
  for (const plan of ["starter", "growth", "scale"] as const) {
    if (prices[plan].monthly === undefined && FALLBACK_PRICES[plan].monthly !== undefined) {
      prices[plan].monthly = FALLBACK_PRICES[plan].monthly;
    }
    if (prices[plan].yearly === undefined && FALLBACK_PRICES[plan].yearly !== undefined) {
      prices[plan].yearly = FALLBACK_PRICES[plan].yearly;
    }
  }

  return prices;
}

// Cache across requests for 1 hour — prices change rarely
export const fetchPolarPrices = unstable_cache(_fetchPolarPrices, ["polar-product-prices"], { revalidate: 86400 });

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
