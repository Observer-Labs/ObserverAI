import { csvSignalDedupeKey, parseCsvSignals, type CsvColumnMapping, type CsvSignalInput } from "./csv-ingest";

export type PosMetricSignalInput = CsvSignalInput & {
  source: "pos";
  source_type: "pos";
  metric_name: string;
  metric_value: number;
};

export type PosMetricParseResult = {
  signals: PosMetricSignalInput[];
  skipped: number;
  duplicateRows: number;
  nonMetricRows: number;
};

export function parsePosMetricSignals(
  csvText: string,
  options: {
    workspaceId: string;
    branchId: string;
    sourceId: string;
    sourceName: string;
    mapping?: CsvColumnMapping;
    now?: string;
  },
): PosMetricParseResult {
  const parsed = parseCsvSignals(csvText, {
    workspaceId: options.workspaceId,
    branchId: options.branchId,
    sourceId: options.sourceId,
    sourceName: options.sourceName,
    mapping: options.mapping,
    now: options.now,
  });

  const signals = parsed.signals.flatMap((signal) => {
    if (!signal.metric_name || typeof signal.metric_value !== "number") return [];
    return [{
      ...signal,
      source: "pos",
      source_type: "pos",
      channel: signal.channel === "csv" ? "pos" : signal.channel,
      metric_name: signal.metric_name,
      metric_value: signal.metric_value,
    } satisfies PosMetricSignalInput];
  });

  return {
    signals,
    skipped: parsed.skipped,
    duplicateRows: parsed.duplicateRows,
    nonMetricRows: parsed.signals.length - signals.length,
  };
}

export function posMetricDedupeKey(
  signal: Pick<PosMetricSignalInput, "timestamp" | "channel" | "sender" | "content" | "metric_name" | "metric_value">,
) {
  return csvSignalDedupeKey(signal);
}
