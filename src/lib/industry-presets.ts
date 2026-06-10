/**
 * Cross-vertical industry presets for Observer.
 * Each preset customises the AI clustering prompt and impact framing
 * for a specific business type.
 */
import type { VerticalType } from "./types";

export interface IndustryPreset {
  vertical: VerticalType;
  label: string;
  description: string;
  systemAddendum: string;        // appended to the base Claude system prompt
  impactFraming: string;         // how to frame projected_impact
  exampleClusters: string[];     // few-shot examples for the prompt
}

export const INDUSTRY_PRESETS: Record<VerticalType, IndustryPreset> = {
  saas: {
    vertical: "saas",
    label: "SaaS / Software",
    description: "Feature requests, bugs, pricing friction, onboarding drop-off",
    systemAddendum: `
Focus on: feature gaps, performance issues, onboarding friction, pricing objections, integration failures.
Frame impact in terms of: MRR risk, churn rate, trial-to-paid conversion, NPS drop.
Cluster signals by product area (auth, billing, core feature, API, onboarding).`,
    impactFraming: "MRR at risk / conversion uplift",
    exampleClusters: [
      "Search latency causing trial drop-off (MRR risk: ~$12k)",
      "API rate limits blocking enterprise evaluation (~$86k ARR in pipeline)",
      "Onboarding step 3 abandonment, 58% of mobile trial users churn here",
    ],
  },

  ecommerce: {
    vertical: "ecommerce",
    label: "E-Commerce",
    description: "Returns, sizing, checkout friction, shipping delays, inventory stockouts",
    systemAddendum: `
Focus on: return reasons, sizing/fit complaints, checkout abandonment, shipping delays, payment failures, stockouts, product photography mismatches.
Frame impact in terms of: return rate, cart abandonment rate, revenue per visitor, LTV.
Cluster signals by: product category, funnel stage (discovery/cart/checkout/post-purchase), fulfilment issue.
If POS/Shopify data is present, correlate sales drops with sentiment signals on the same product category.`,
    impactFraming: "Return rate reduction / revenue uplift per visitor",
    exampleClusters: [
      "Sizing inconsistency driving 23% return rate on summer collection",
      "Checkout payment failure spike, 12% abandonment increase this week",
      "Stockout risk on top 3 SKUs, projected $8k lost revenue if not restocked",
    ],
  },

  qsr: {
    vertical: "qsr",
    label: "QSR / Food & Beverage",
    description: "Speed of service, food quality, order accuracy, staff behaviour",
    systemAddendum: `
Focus on: wait time complaints, order accuracy issues, food quality (temperature, freshness, portion size), staff behaviour, app ordering friction, delivery delays, menu item complaints.
Frame impact in terms of: repeat visit rate, average order value, delivery partner ratings, branch-level NPS.
Cluster by: branch/location, menu item, service channel (dine-in/delivery/app), time-of-day.
If POS data is present, correlate declining branch sales with negative sentiment from that branch.`,
    impactFraming: "Repeat visit rate / branch revenue impact",
    exampleClusters: [
      "Wait times at Branch X exceeding 15 min on weekends, 34% of negative reviews",
      "Burger portion inconsistency, 22 complaints across 3 branches this week",
      "App ordering checkout error causing 18% of app order abandonments",
    ],
  },

  retail: {
    vertical: "retail",
    label: "Retail / Physical",
    description: "In-store experience, staff, inventory availability, pricing perception",
    systemAddendum: `
Focus on: in-store staff behaviour, product availability, pricing perception, store layout/navigation, returns experience, loyalty programme friction.
Frame impact in terms of: foot traffic conversion, basket size, return rate, NPS.
Cluster by: store location, department/category, customer journey stage.
If POS data is present, correlate low-conversion branches with sentiment data from those locations.`,
    impactFraming: "Basket size / foot traffic conversion impact",
    exampleClusters: [
      "Staff knowledge gaps in electronics department, 28% of negative in-store reviews",
      "Pricing confusion on promotions, 15 support emails this week, high cart abandonment",
      "Istanbul Kadıköy branch inventory gaps, stock-outs on top 5 SKUs this weekend",
    ],
  },

  auto: {
    vertical: "auto",
    label: "Auto-detect",
    description: "Observer will infer the vertical from your data",
    systemAddendum: `
Infer the most likely business vertical from the signals. Common verticals: SaaS, e-commerce, QSR, retail.
Adapt your clustering and impact framing to the detected vertical.
State the detected vertical in the business_case field as: "[VERTICAL: X]".`,
    impactFraming: "Business impact (auto-detected vertical)",
    exampleClusters: [],
  },
};

export function getPreset(vertical: VerticalType = "auto"): IndustryPreset {
  return INDUSTRY_PRESETS[vertical] ?? INDUSTRY_PRESETS.auto;
}

export function buildSystemPrompt(vertical: VerticalType = "auto"): string {
  const preset = getPreset(vertical);
  return `You are Observer, a cross-vertical decision intelligence engine.

You analyze raw signals from ANY combination of: customer support, app store reviews, social media, POS/sales data, and analytics, and cluster them into ranked, actionable gaps.

For each cluster return:
- title: clear, specific problem statement (not generic)
- severity: 0-100 (higher = more urgent + more evidence + more revenue impact)
- confidence: 0-1 float
- evidence_count: number of signals supporting this cluster
- source_breakdown: object with counts per source type
- business_case: one sentence with concrete impact (numbers where possible)
- recommended_action: specific, implementable next step
- customer_quote: most representative verbatim signal
- projected_impact: estimated business impact (revenue, conversion, retention), be specific e.g. "~$12k MRR at risk" or "18% return rate reduction if fixed"

Severity scoring:
- 80-100: CRITICAL, revenue directly at risk, or > 30 signals, or churn/stockout imminent
- 60-79: HIGH, significant friction affecting key funnel, 15-30 signals
- 40-59: MEDIUM, notable pattern, 5-15 signals, growth impact
- 0-39: LOW, polish/nice-to-have, < 5 signals

Correlation rules:
- If POS/sales signals show revenue drop AND customer voice signals show negative sentiment for the SAME product/category/branch → boost severity by 15 points and mark as correlated
- If analytics signals show bounce/conversion drop AND support signals mention the SAME page/flow → boost severity by 10 points

Industry context:
${preset.systemAddendum}

Return ONLY a valid JSON array. No markdown, no commentary.`;
}
