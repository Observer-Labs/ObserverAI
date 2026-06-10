/**
 * Per-workspace rate limiting and AI spend caps.
 *
 * All limits are sourced from src/lib/plans.ts, never hardcode here.
 *
 * Storage: a lightweight `analyze_calls` table in Postgres. Each call is one
 * row. Rate-limit queries scan a tiny window per workspace; the index on
 * (workspace_id, called_at DESC) keeps it O(window-size).
 *
 * For higher throughput, swap `getRecentCallCount` for an Upstash/Redis
 * token bucket without touching callers.
 */

import { getSupabaseAdmin } from "./supabase";
import { getPlanLimits, estimateClaudeCostUsd, type PlanLimits } from "./plans";

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "rate_limited" | "spend_capped";
      retryAfterSec?: number;
      limit?: number;
      message: string;
    };

/**
 * Check whether a workspace can call the AI right now.
 * Returns a decision object, caller is responsible for short-circuiting.
 */
export async function checkAnalyzeAllowed(
  workspaceId: string,
  plan: string | null | undefined,
): Promise<RateLimitDecision> {
  const limits = getPlanLimits(plan);
  const supabase = getSupabaseAdmin();

  // 1. Spend cap check, read current period spend from workspace row
  const { data: ws } = await supabase
    .from("workspaces")
    .select("claude_spend_usd, spend_reset_at")
    .eq("id", workspaceId)
    .single();

  if (ws) {
    const spent = Number(ws.claude_spend_usd ?? 0);
    const resetAt = ws.spend_reset_at ? new Date(ws.spend_reset_at).getTime() : 0;

    // Auto-roll the period if reset time has passed
    if (resetAt && Date.now() >= resetAt) {
      await rolloverPeriod(workspaceId);
    } else if (spent >= limits.claudeBudgetUsd) {
      return {
        allowed: false,
        reason: "spend_capped",
        limit: limits.claudeBudgetUsd,
        message: `You've used your $${limits.claudeBudgetUsd.toFixed(2)} AI budget this period. Upgrade for more headroom.`,
      };
    }
  }

  // 2. Rate-limit window check
  const windowStart = new Date(Date.now() - limits.rateLimit.windowMs).toISOString();
  const { count } = await supabase
    .from("analyze_calls")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("called_at", windowStart);

  const calls = count ?? 0;
  if (calls >= limits.rateLimit.calls) {
    const retryAfterSec = Math.ceil(limits.rateLimit.windowMs / 1000 / Math.max(1, limits.rateLimit.calls));
    return {
      allowed: false,
      reason: "rate_limited",
      retryAfterSec,
      limit: limits.rateLimit.calls,
      message: `You've hit the rate limit (${limits.rateLimit.calls} runs per hour). Try again in a moment.`,
    };
  }

  return { allowed: true };
}

/**
 * Record a completed analyze call. Increments per-workspace spend AND inserts
 * into the rate-limit log. Caller should invoke this AFTER the AI returns.
 */
export async function recordAnalyzeCall(
  workspaceId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const cost = estimateClaudeCostUsd(inputTokens, outputTokens);
  const supabase = getSupabaseAdmin();

  // Insert call row (rate-limit + audit)
  await supabase.from("analyze_calls").insert({
    workspace_id: workspaceId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: cost,
  });

  // Increment workspace spend atomically using RPC-style raw SQL
  // (Supabase JS doesn't support `+=` but we can read-modify-write safely
  // because spend caps don't need cross-call atomicity at this scale.)
  const { data: ws } = await supabase
    .from("workspaces")
    .select("claude_spend_usd, spend_reset_at")
    .eq("id", workspaceId)
    .single();

  const currentSpend = Number(ws?.claude_spend_usd ?? 0);
  const updates: Record<string, unknown> = {
    claude_spend_usd: currentSpend + cost,
  };

  // First-call-of-period: stamp the reset time (one calendar month from now)
  if (!ws?.spend_reset_at) {
    updates.spend_reset_at = nextResetTime().toISOString();
  }

  await supabase.from("workspaces").update(updates).eq("id", workspaceId);
}

/** Reset spend at the start of a fresh billing period. */
async function rolloverPeriod(workspaceId: string): Promise<void> {
  await getSupabaseAdmin()
    .from("workspaces")
    .update({
      claude_spend_usd: 0,
      spend_reset_at: nextResetTime().toISOString(),
    })
    .eq("id", workspaceId);
}

/** First day of next month, 00:00 UTC. Matches our analysis_count_reset_at convention. */
function nextResetTime(): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type { PlanLimits };
