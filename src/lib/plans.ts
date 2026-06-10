/**
 * Plan & limit configuration, single source of truth.
 *
 * Edit values here to change billing tiers, rate limits, or AI spend caps
 * across the entire app. NEVER hardcode these numbers in routes/components.
 *
 * If you need a new plan, add it to PLANS and PlanKey will pick it up.
 */

export type PlanKey = "trial" | "pro";

export interface PlanLimits {
  /** Total analysis runs allowed in the billing period (lifetime for trial, monthly for paid). */
  runsPerPeriod: number;
  /** Cap on signals analyzed per single run, to bound Claude token cost per call. */
  signalsPerRun: number;
  /** Soft cap on Anthropic USD spend per period, enforced server-side. */
  claudeBudgetUsd: number;
  /** Per-workspace API rate limit on /api/analyze (calls allowed per windowMs). */
  rateLimit: { calls: number; windowMs: number };
  /** Trial length in days; 0 means N/A. */
  trialDays: number;
}

export const PLANS: Record<PlanKey, PlanLimits> = {
  trial: {
    runsPerPeriod: 10,
    signalsPerRun: 500,
    claudeBudgetUsd: 1.0,
    rateLimit: { calls: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour
    trialDays: 14,
  },
  pro: {
    runsPerPeriod: 1000,
    signalsPerRun: 5000,
    claudeBudgetUsd: 50.0,
    rateLimit: { calls: 60, windowMs: 60 * 60 * 1000 }, // 60 / hour
    trialDays: 0,
  },
};

/** Grace window after a paid plan goes past_due, before access is revoked. */
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Severity scoring thresholds (0-100) used to bucket clusters.
 * Used by both the analyze route (to label) and the dashboard (to color).
 * Both must agree, never duplicate these constants elsewhere.
 */
export const SEVERITY_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 35,
  // anything below medium is "low"
} as const;

export type SeverityLabel = "critical" | "high" | "medium" | "low";

export function severityLabel(score: number): SeverityLabel {
  if (score >= SEVERITY_THRESHOLDS.critical) return "critical";
  if (score >= SEVERITY_THRESHOLDS.high) return "high";
  if (score >= SEVERITY_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Look up plan limits, defaulting to trial. Workspace.plan can be null
 * (legacy rows) or unknown, we always return a valid PlanLimits.
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "pro") return PLANS.pro;
  return PLANS.trial;
}

/**
 * Approximate USD cost of a Claude Sonnet 4 token mix at current pricing.
 * Last reviewed: 2026-05-04.
 *
 * Anthropic Sonnet 4: $3/MTok input, $15/MTok output.
 * Conservative blended rate assumes 70/30 input/output split for our use case
 * (long context summarization, short structured JSON output).
 */
export const CLAUDE_USD_PER_INPUT_TOKEN = 3.0 / 1_000_000;
export const CLAUDE_USD_PER_OUTPUT_TOKEN = 15.0 / 1_000_000;

export function estimateClaudeCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * CLAUDE_USD_PER_INPUT_TOKEN +
    outputTokens * CLAUDE_USD_PER_OUTPUT_TOKEN
  );
}
