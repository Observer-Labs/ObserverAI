import type { Workspace } from "./types";
import { PLANS, PAST_DUE_GRACE_MS, getPlanLimits } from "./plans";

// ─── Plan status gate ─────────────────────────────────────────────────────────

export interface PlanStatus {
  allowed: boolean;
  reason?: "trial_expired" | "trial_limit" | "payment_failed" | "no_plan";
  daysLeft?: number;
  runsLeft?: number;
  /** Plan key for callers that need to look up limits (e.g. rate limiter). */
  plan: "trial" | "pro" | "past_due" | "expired" | "no_plan";
}

/**
 * Determines whether a workspace is allowed to run an analysis.
 * Single source of truth for billing gates.
 */
export function getPlanStatus(workspace: Workspace): PlanStatus {
  const plan = workspace.plan ?? "trial";
  const now = Date.now();

  if (plan === "trial") {
    const trialEnds = workspace.trial_ends_at
      ? new Date(workspace.trial_ends_at).getTime()
      : now - 1; // treat missing as expired

    if (now > trialEnds) {
      return { allowed: false, reason: "trial_expired", plan: "expired" };
    }

    const limits = getPlanLimits("trial");
    const count = workspace.analysis_count ?? 0;
    if (count >= limits.runsPerPeriod) {
      return { allowed: false, reason: "trial_limit", plan: "trial" };
    }

    const daysLeft = Math.ceil((trialEnds - now) / (24 * 60 * 60 * 1000));
    return {
      allowed: true,
      daysLeft,
      runsLeft: limits.runsPerPeriod - count,
      plan: "trial",
    };
  }

  if (plan === "pro" || plan === "past_due") {
    const status = workspace.polar_status;

    if (status === "active") {
      const limits = getPlanLimits("pro");
      const count = workspace.analysis_count ?? 0;
      return {
        allowed: true,
        runsLeft: Math.max(0, limits.runsPerPeriod - count),
        plan: "pro",
      };
    }

    if (status === "past_due") {
      // Grace window after period ends
      const endsAt = workspace.polar_ends_at
        ? new Date(workspace.polar_ends_at).getTime()
        : 0;
      if (now < endsAt + PAST_DUE_GRACE_MS) {
        return { allowed: true, plan: "past_due" };
      }
    }

    return { allowed: false, reason: "payment_failed", plan: "past_due" };
  }

  // cancelled / expired / unknown
  return { allowed: false, reason: "no_plan", plan: "no_plan" };
}

// Re-export so callers can `import { PLANS } from "@/lib/polar"` if convenient
export { PLANS };
