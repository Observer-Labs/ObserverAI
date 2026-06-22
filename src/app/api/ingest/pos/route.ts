export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import type { CsvColumnMapping } from "@/lib/csv-ingest";
import { parsePosMetricSignals, posMetricDedupeKey, type PosMetricSignalInput } from "@/lib/pos-ingest";
import { getSupabaseAdmin, insertSignals } from "@/lib/supabase";

type PosIngestBody = {
  source_id?: unknown;
  csv_text?: unknown;
  mapping?: unknown;
};

type PosSourceRow = {
  id: string;
  branch_id: string;
  display_name: string;
  type: string;
};

type ExistingPosSignal = Pick<PosMetricSignalInput, "timestamp" | "channel" | "sender" | "content" | "metric_name" | "metric_value">;

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as PosIngestBody;
  const sourceId = typeof body.source_id === "string" ? body.source_id.trim() : "";
  const csvText = typeof body.csv_text === "string" ? body.csv_text.trim() : "";
  const mapping = normalizeMapping(body.mapping);

  if (!sourceId) return NextResponse.json({ error: "source_id is required" }, { status: 400 });
  if (!csvText) return NextResponse.json({ error: "csv_text is required" }, { status: 400 });

  const { data: source, error: sourceError } = await getSupabaseAdmin()
    .from("sources")
    .select("id, branch_id, display_name, type")
    .eq("workspace_id", workspaceId)
    .eq("id", sourceId)
    .eq("type", "pos")
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: "POS source not found" }, { status: 404 });
  }

  try {
    const sourceRow = source as PosSourceRow;
    const parsed = parsePosMetricSignals(csvText, {
      workspaceId,
      branchId: sourceRow.branch_id,
      sourceId: sourceRow.id,
      sourceName: sourceRow.display_name || "POS",
      mapping,
    });
    const newSignals = await filterExistingSignals(workspaceId, sourceRow.branch_id, sourceRow.id, parsed.signals);
    const inserted = await insertSignals(newSignals);

    await getSupabaseAdmin()
      .from("sources")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", sourceRow.id);

    return NextResponse.json({
      ingested: inserted?.length ?? 0,
      skipped: parsed.skipped,
      duplicateRows: parsed.duplicateRows,
      nonMetricRows: parsed.nonMetricRows,
      existingDuplicates: parsed.signals.length - newSignals.length,
      sourceId: sourceRow.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "POS ingest failed" },
      { status: 500 },
    );
  }
}

async function filterExistingSignals(
  workspaceId: string,
  branchId: string,
  sourceId: string,
  signals: PosMetricSignalInput[],
) {
  if (signals.length === 0) return signals;

  const timestamps = Array.from(new Set(signals.map((signal) => signal.timestamp))).slice(0, 500);
  const { data, error } = await getSupabaseAdmin()
    .from("signals")
    .select("timestamp, channel, sender, content, metric_name, metric_value")
    .eq("workspace_id", workspaceId)
    .eq("branch_id", branchId)
    .eq("source_id", sourceId)
    .eq("source", "pos")
    .in("timestamp", timestamps);

  if (error) throw error;

  const existingKeys = new Set(
    ((data ?? []) as ExistingPosSignal[]).map((signal) => posMetricDedupeKey(signal)),
  );

  return signals.filter((signal) => !existingKeys.has(posMetricDedupeKey(signal)));
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
