export type BillingPlan = "starter" | "growth" | "scale" | "enterprise";

export const PLAN_BRANCH_LIMITS: Record<BillingPlan, number | null> = {
  starter: 1,
  growth: 5,
  scale: 20,
  enterprise: null,
};

/** Trial (and any unknown/expired plan) gets the most restrictive tier. */
export const TRIAL_BRANCH_LIMIT = 1;

/**
 * Branch limit for any plan string stored on workspaces.plan.
 * NULL means "unlimited" and is reserved for enterprise; trial, expired
 * and unrecognized plans fall back to TRIAL_BRANCH_LIMIT so a missing
 * mapping can never silently disable the limit.
 */
export function resolveBranchLimitForPlan(
  plan: string | null | undefined,
): number | null {
  if (plan && plan in PLAN_BRANCH_LIMITS) {
    return PLAN_BRANCH_LIMITS[plan as BillingPlan];
  }
  return TRIAL_BRANCH_LIMIT;
}

const PRODUCT_ID_ENV_KEYS: [BillingPlan, string][] = [
  ["starter", "POLAR_STARTER_MONTHLY_PRODUCT_ID"],
  ["starter", "POLAR_STARTER_YEARLY_PRODUCT_ID"],
  ["growth", "POLAR_GROWTH_MONTHLY_PRODUCT_ID"],
  ["growth", "POLAR_GROWTH_YEARLY_PRODUCT_ID"],
  ["scale", "POLAR_SCALE_MONTHLY_PRODUCT_ID"],
  ["scale", "POLAR_SCALE_YEARLY_PRODUCT_ID"],
];

export function resolvePlanFromProductId(
  productId: string,
  env: Record<string, string | undefined> = process.env,
): BillingPlan | null {
  for (const [plan, envKey] of PRODUCT_ID_ENV_KEYS) {
    if (env[envKey] === productId) return plan;
  }
  return null;
}
