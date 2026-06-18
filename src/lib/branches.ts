import type { Branch } from "./types";
import { getSupabaseAdmin } from "./supabase";

type BranchStatus = Branch["status"];

type BranchInput = {
  name?: unknown;
  brand?: unknown;
  district?: unknown;
  city?: unknown;
  timezone?: unknown;
  status?: unknown;
};

type NormalizedBranchInput = {
  name?: string;
  brand?: string | null;
  district?: string | null;
  city?: string | null;
  timezone?: string;
  status?: BranchStatus;
};

type WorkspaceBranchLimit = {
  branch_limit: number | null;
};

type BranchCountResult = {
  count: number | null;
  error: Error | null;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

type SourceSummary = {
  branch_id: string;
  status: "connected" | "pending" | "error";
  last_sync_at: string | null;
};

export type BranchWithStats = Branch & {
  source_count: number;
  connected_source_count: number;
  last_sync_at: string | null;
};

export class BranchValidationError extends Error {
  status = 400;
}

export class BranchLimitError extends Error {
  status = 402;

  constructor(
    message: string,
    public readonly branchLimit: number,
    public readonly activeBranchCount: number,
  ) {
    super(message);
  }
}

export class BranchNotFoundError extends Error {
  status = 404;
}

export class BranchConflictError extends Error {
  status = 409;
}

function normalizeText(value: unknown, field: string, maxLength: number, required = false) {
  if (value === undefined) {
    if (required) throw new BranchValidationError(`${field} is required`);
    return undefined;
  }

  if (value === null) {
    if (required) throw new BranchValidationError(`${field} is required`);
    return null;
  }

  if (typeof value !== "string") {
    throw new BranchValidationError(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new BranchValidationError(`${field} is required`);
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new BranchValidationError(`${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

function normalizeStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (value !== "active" && value !== "paused") {
    throw new BranchValidationError("status must be active or paused");
  }
  return value;
}

export function normalizeBranchInput(input: BranchInput, mode: "create" | "update") {
  const name = normalizeText(input.name, "name", 120, mode === "create");
  const timezone = normalizeText(input.timezone, "timezone", 80);
  const normalized: NormalizedBranchInput = {};

  if (name !== undefined) normalized.name = name ?? undefined;
  if (timezone !== undefined) normalized.timezone = timezone ?? undefined;

  for (const field of ["brand", "district", "city"] as const) {
    const value = normalizeText(input[field], field, 120);
    if (value !== undefined) normalized[field] = value;
  }

  const status = normalizeStatus(input.status);
  if (status) normalized.status = status;

  if (mode === "create") {
    return {
      name: normalized.name,
      brand: normalized.brand ?? null,
      district: normalized.district ?? null,
      city: normalized.city ?? null,
      timezone: normalized.timezone ?? "Europe/Istanbul",
      status: normalized.status ?? "active",
    };
  }

  if (Object.keys(normalized).length === 0) {
    throw new BranchValidationError("At least one branch field is required");
  }

  return normalized;
}

function isNotFound(error: SupabaseError | null | undefined) {
  return error?.code === "PGRST116";
}

function throwIfBranchWriteError(error: SupabaseError | null | undefined) {
  if (!error) return;
  if (error.code === "23505") {
    throw new BranchConflictError("A branch with this name already exists");
  }
  throw error;
}

async function getWorkspaceBranchLimit(workspaceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("workspaces")
    .select("branch_limit")
    .eq("id", workspaceId)
    .single();

  if (error) throw error;
  return (data as WorkspaceBranchLimit).branch_limit;
}

async function getActiveBranchCount(workspaceId: string) {
  const { count, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active") as unknown as BranchCountResult;

  if (error) throw error;
  return count ?? 0;
}

async function assertCanCreateActiveBranch(workspaceId: string) {
  const [branchLimit, activeBranchCount] = await Promise.all([
    getWorkspaceBranchLimit(workspaceId),
    getActiveBranchCount(workspaceId),
  ]);

  if (branchLimit !== null && activeBranchCount >= branchLimit) {
    throw new BranchLimitError(
      "Branch limit reached. Upgrade your plan to add more branches.",
      branchLimit,
      activeBranchCount,
    );
  }
}

async function assertCanPauseBranch(workspaceId: string, branchId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id, status")
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .single();

  if (isNotFound(error)) throw new BranchNotFoundError("Branch not found");
  if (error) throw error;
  if ((data as Pick<Branch, "status">).status === "paused") return;

  const activeBranchCount = await getActiveBranchCount(workspaceId);
  if (activeBranchCount <= 1) {
    throw new BranchValidationError("At least one active branch is required");
  }
}

async function assertCanActivateBranch(workspaceId: string, branchId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id, status")
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .single();

  if (isNotFound(error)) throw new BranchNotFoundError("Branch not found");
  if (error) throw error;
  if ((data as Pick<Branch, "status">).status === "active") return;

  await assertCanCreateActiveBranch(workspaceId);
}

export async function listBranches(workspaceId: string) {
  const [{ data, error }, { data: sources, error: sourcesError }] = await Promise.all([
    getSupabaseAdmin()
    .from("branches")
    .select("*")
    .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    getSupabaseAdmin()
      .from("sources")
      .select("branch_id, status, last_sync_at")
      .eq("workspace_id", workspaceId),
  ]);

  if (error) throw error;
  if (sourcesError) throw sourcesError;

  const sourceStats = new Map<string, {
    source_count: number;
    connected_source_count: number;
    last_sync_at: string | null;
  }>();

  for (const source of (sources ?? []) as SourceSummary[]) {
    const current = sourceStats.get(source.branch_id) ?? {
      source_count: 0,
      connected_source_count: 0,
      last_sync_at: null,
    };

    current.source_count += 1;
    if (source.status === "connected") current.connected_source_count += 1;
    if (
      source.last_sync_at &&
      (!current.last_sync_at || new Date(source.last_sync_at).getTime() > new Date(current.last_sync_at).getTime())
    ) {
      current.last_sync_at = source.last_sync_at;
    }
    sourceStats.set(source.branch_id, current);
  }

  return ((data ?? []) as Branch[]).map((branch): BranchWithStats => ({
    ...branch,
    source_count: sourceStats.get(branch.id)?.source_count ?? 0,
    connected_source_count: sourceStats.get(branch.id)?.connected_source_count ?? 0,
    last_sync_at: sourceStats.get(branch.id)?.last_sync_at ?? null,
  }));
}

export async function createBranch(workspaceId: string, input: BranchInput) {
  const payload = normalizeBranchInput(input, "create");

  if (payload.status === "active") {
    await assertCanCreateActiveBranch(workspaceId);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .insert({ ...payload, workspace_id: workspaceId })
    .select()
    .single();

  throwIfBranchWriteError(error);
  return data;
}

export async function updateBranch(workspaceId: string, branchId: string, input: BranchInput) {
  const updates = normalizeBranchInput(input, "update");

  if (updates.status === "paused") {
    await assertCanPauseBranch(workspaceId, branchId);
  }

  if (updates.status === "active") {
    await assertCanActivateBranch(workspaceId, branchId);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .update(updates)
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (isNotFound(error)) throw new BranchNotFoundError("Branch not found");
  throwIfBranchWriteError(error);
  return data;
}

export async function pauseBranch(workspaceId: string, branchId: string) {
  await assertCanPauseBranch(workspaceId, branchId);

  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .update({ status: "paused" })
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (isNotFound(error)) throw new BranchNotFoundError("Branch not found");
  throwIfBranchWriteError(error);
  return data;
}
