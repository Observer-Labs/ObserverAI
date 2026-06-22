export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { csvSignalDedupeKey, parseCsvSignals } from "@/lib/csv-ingest";
import { getSupabaseAdmin, insertSignals } from "@/lib/supabase";
import type { CsvColumnMapping, CsvSignalInput } from "@/lib/csv-ingest";

type CsvIngestBody = {
  branch_id?: unknown;
  display_name?: unknown;
  csv_text?: unknown;
  mapping?: unknown;
};

type ExistingSignal = Pick<CsvSignalInput, "timestamp" | "channel" | "sender" | "content" | "metric_name" | "metric_value">;

function normalizeBody(body: CsvIngestBody) {
  const branchId = typeof body.branch_id === "string" ? body.branch_id.trim() : "";
  const displayNameRaw = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const csvText = typeof body.csv_text === "string" ? body.csv_text.trim() : "";
  const mapping = normalizeMapping(body.mapping);

  return {
    branchId,
    displayName: displayNameRaw || "Universal CSV",
    csvText,
    mapping,
  };
}

function normalizeMapping(mapping: unknown): CsvColumnMapping | undefined {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return undefined;

  const fields = ["timestamp", "channel", "sender", "content", "sentiment", "metric_name", "metric_value"] as const;
  const normalized: CsvColumnMapping = {};
  const source = mapping as Record<string, unknown>;

  for (const field of fields) {
    const value = source[field];
    if (typeof value === "string" && value.trim()) {
      normalized[field] = value.trim();
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

async function ensureBranch(workspaceId: string, branchId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("branches")
    .select("id, status")
    .eq("id", branchId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error) return { error: "Branch not found" };
  if ((data as { status?: string }).status !== "active") return { error: "Branch is paused" };
  return { branch: data as { id: string; status: string } };
}

async function ensureCsvSource(workspaceId: string, branchId: string, displayName: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("sources")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("type", "csv")
    .eq("display_name", displayName)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase
      .from("sources")
      .update({ status: "connected", last_sync_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("sources")
    .insert({
      workspace_id: workspaceId,
      branch_id: branchId,
      type: "csv",
      display_name: displayName,
      status: "connected",
      config: { mode: "manual_upload" },
      last_sync_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id as string;
}

async function filterExistingSignals(workspaceId: string, branchId: string, signals: CsvSignalInput[]) {
  if (signals.length === 0) return signals;

  const timestamps = Array.from(new Set(signals.map((signal) => signal.timestamp))).slice(0, 500);
  const { data, error } = await getSupabaseAdmin()
    .from("signals")
    .select("timestamp, channel, sender, content, metric_name, metric_value")
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("source", "csv")
    .in("timestamp", timestamps);

  if (error) throw error;

  const existingKeys = new Set(
    ((data ?? []) as ExistingSignal[]).map((signal) => csvSignalDedupeKey(signal)),
  );

  return signals.filter((signal) => !existingKeys.has(csvSignalDedupeKey(signal)));
}

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as CsvIngestBody;
  const { branchId, displayName, csvText, mapping } = normalizeBody(body);

  if (!branchId) return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
  if (!csvText) return NextResponse.json({ error: "csv_text is required" }, { status: 400 });

  const branchResult = await ensureBranch(workspaceId, branchId);
  if (branchResult.error) return NextResponse.json({ error: branchResult.error }, { status: 404 });

  try {
    const sourceId = await ensureCsvSource(workspaceId, branchId, displayName);
    const parsed = parseCsvSignals(csvText, {
      workspaceId,
      branchId,
      sourceId,
      sourceName: displayName,
      mapping,
    });
    const newSignals = await filterExistingSignals(workspaceId, branchId, parsed.signals);
    const inserted = await insertSignals(newSignals);

    return NextResponse.json({
      ingested: inserted?.length ?? 0,
      skipped: parsed.skipped,
      duplicateRows: parsed.duplicateRows,
      existingDuplicates: parsed.signals.length - newSignals.length,
      sourceId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CSV ingest failed" },
      { status: 500 },
    );
  }
}
