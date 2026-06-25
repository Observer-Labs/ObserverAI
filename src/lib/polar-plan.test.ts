import { describe, expect, it } from "vitest";
import { PLAN_BRANCH_LIMITS, resolvePlanFromProductId } from "./polar-plan";

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

  it("keeps branch limits aligned with pricing tiers", () => {
    expect(PLAN_BRANCH_LIMITS).toEqual({
      starter: 1,
      growth: 5,
      scale: 20,
      enterprise: null,
    });
  });
});
