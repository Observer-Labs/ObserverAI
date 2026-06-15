import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EnvValidationError } from "@/env";

// Lazy singletons, created on first use, not at module evaluation time
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function requireSupabaseEnv() {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  };
  const missing = Object.entries(env)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new EnvValidationError("Supabase runtime", missing);
  }

  return env as Record<keyof typeof env, string>;
}

export function getSupabase() {
  if (!_supabase) {
    const env = requireSupabaseEnv();
    _supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );
  }
  return _supabase;
}

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const env = requireSupabaseEnv();
    _supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabaseAdmin;
}

// Named exports kept for compatibility, these are now functions returning the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string, unknown>)[prop as string];
  },
});

// Helper to get workspace by ID
export async function getWorkspace(workspaceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();
  if (error) throw error;
  return data;
}

export async function getDefaultBranchId(workspaceId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("branches")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("branches")
    .insert({
      workspace_id: workspaceId,
      name: "Ana Şube",
      timezone: "Europe/Istanbul",
      status: "active",
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id as string;
}

// Helper to insert signals in bulk
export async function insertSignals(
  signals: Array<Omit<import("./types").Signal, "id" | "created_at" | "branch_id"> & { branch_id?: string }>
) {
  if (signals.length === 0) return [];
  const workspaceId = signals[0].workspace_id;
  const fallbackBranchId = await getDefaultBranchId(workspaceId);
  const rows = signals.map((signal) => ({
    ...signal,
    branch_id: signal.branch_id ?? fallbackBranchId,
    source_type: signal.source_type ?? signal.source,
  }));

  const { data, error } = await getSupabaseAdmin()
    .from("signals")
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

// Helper to get unanalyzed signals for a workspace
export async function getPendingSignals(workspaceId: string, limit = 500, branchId?: string) {
  let query = getSupabaseAdmin()
    .from("signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("reviewed", false)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Helper to upsert clusters, replaces active clusters for the workspace so
// repeated analysis runs don't pile up. Approved/dismissed clusters are kept.
export async function upsertClusters(
  clusters: Array<Omit<import("./types").Cluster, "id" | "created_at" | "updated_at" | "branch_id"> & { branch_id?: string }>
) {
  if (clusters.length === 0) return [];
  const workspaceId = clusters[0].workspace_id;
  const fallbackBranchId = await getDefaultBranchId(workspaceId);
  const branchId = clusters[0].branch_id ?? fallbackBranchId;
  const rows = clusters.map((cluster) => ({
    ...cluster,
    branch_id: cluster.branch_id ?? branchId,
  }));

  // Remove previous active clusters so we don't accumulate duplicates
  await getSupabaseAdmin()
    .from("clusters")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("status", "active");

  const { data, error } = await getSupabaseAdmin()
    .from("clusters")
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

// Helper to log a delivery
export async function logDelivery(
  delivery: Omit<import("./types").Delivery, "id" | "branch_id"> & { branch_id?: string }
) {
  let branchId = delivery.branch_id;
  if (!branchId) {
    const { data, error } = await getSupabaseAdmin()
      .from("clusters")
      .select("branch_id")
      .eq("id", delivery.cluster_id)
      .single();
    if (error) throw error;
    branchId = data.branch_id as string;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("deliveries")
    .insert({ ...delivery, branch_id: branchId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Billing helpers ──────────────────────────────────────────────────────────

/** Increment analysis_count by 1 for the given workspace */
export async function incrementAnalysisCount(workspaceId: string): Promise<void> {
  // Read current count then write +1 (acceptable at low-concurrency scale)
  const { data } = await getSupabaseAdmin()
    .from("workspaces")
    .select("analysis_count")
    .eq("id", workspaceId)
    .single();

  const current = (data as { analysis_count?: number } | null)?.analysis_count ?? 0;
  await getSupabaseAdmin()
    .from("workspaces")
    .update({ analysis_count: current + 1 })
    .eq("id", workspaceId);
}

/** If the monthly reset date has passed, zero the counter and advance it */
export async function resetAnalysisCountIfNeeded(
  workspace: import("./types").Workspace,
): Promise<void> {
  if (!workspace.analysis_count_reset_at) return;
  const resetAt = new Date(workspace.analysis_count_reset_at).getTime();
  if (Date.now() < resetAt) return;

  // Advance reset date to first day of next month
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);

  await getSupabaseAdmin()
    .from("workspaces")
    .update({ analysis_count: 0, analysis_count_reset_at: next.toISOString() })
    .eq("id", workspace.id);
}

/** Patch any billing column(s) on a workspace */
export async function updateWorkspaceBilling(
  workspaceId: string,
  fields: Partial<import("./types").Workspace>,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("workspaces")
    .update(fields)
    .eq("id", workspaceId);
  if (error) throw error;
}

/**
 * Look up a workspace ID from a customer email address.
 * Used as a fallback in webhook handlers when metadata.workspace_id is absent.
 */
export async function getWorkspaceIdByEmail(email: string): Promise<string | null> {
  // List all auth users and find the one with matching email
  const { data } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((u) => u.email === email);
  if (!user) return null;

  const { data: workspace } = await getSupabaseAdmin()
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return workspace?.id ?? null;
}
