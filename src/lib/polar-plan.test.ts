import { describe, expect, it } from "vitest";
import {
  PLAN_BRANCH_LIMITS,
  TRIAL_BRANCH_LIMIT,
  resolveBranchLimitForPlan,
  resolvePlanFromProductId,
} from "./polar-plan";

describe("Polar plan mapping", () => {
  it("resolves plans from monthly and yearly product ids", () => {
    const env = {
      POLAR_STARTER_MONTHLY_PRODUCT_ID: "prod_starter_m",
      POLAR_STARTER_YEARLY_PRODUCT_ID: "prod_starter_y",
      POLAR_GROWTH_MONTHLY_PRODUCT_ID: "prod_growth_m",
      POLAR_GROWTH_YEARLY_PRODUCT_ID: "prod_growth_y",
      POLAR_SCALE_MONTHLY_PRODUCT_ID: "prod_scale_m",
      POLAR_SCALE_YEARLY_PRODUCT_ID: "prod_scale_y",
    };

    expect(resolvePlanFromProductId("prod_starter_m", env)).toBe("starter");
    expect(resolvePlanFromProductId("prod_starter_y", env)).toBe("starter");
    expect(resolvePlanFromProductId("prod_growth_m", env)).toBe("growth");
    expect(resolvePlanFromProductId("prod_growth_y", env)).toBe("growth");
    expect(resolvePlanFromProductId("prod_scale_m", env)).toBe("scale");
    expect(resolvePlanFromProductId("prod_scale_y", env)).toBe("scale");
    expect(resolvePlanFromProductId("prod_unknown", env)).toBeNull();
  });

  it("resolves branch limits for every plan string, never unlimited by accident", () => {
    expect(resolveBranchLimitForPlan("starter")).toBe(1);
    expect(resolveBranchLimitForPlan("growth")).toBe(5);
    expect(resolveBranchLimitForPlan("scale")).toBe(20);
    expect(resolveBranchLimitForPlan("enterprise")).toBeNull();
    // trial, expired, unknown and missing plans all fall back to the trial limit
    expect(resolveBranchLimitForPlan("trial")).toBe(TRIAL_BRANCH_LIMIT);
    expect(resolveBranchLimitForPlan("expired")).toBe(TRIAL_BRANCH_LIMIT);
    expect(resolveBranchLimitForPlan("nonsense")).toBe(TRIAL_BRANCH_LIMIT);
    expect(resolveBranchLimitForPlan(null)).toBe(TRIAL_BRANCH_LIMIT);
    expect(resolveBranchLimitForPlan(undefined)).toBe(TRIAL_BRANCH_LIMIT);
  });

  it("keeps branch limits aligned with pricing tiers", () => {
    expect(PLAN_BRANCH_LIMITS).toEqual({
      starter: 1,
      growth: 5,
      scale: 20,
      enterprise: null,
    });
  });
});
