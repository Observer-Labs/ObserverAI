import type { Signal } from "./types";

export type CsvSignalInput = Omit<Signal, "id" | "created_at" | "branch_id"> & {
  branch_id?: string;
};

export type CsvParseResult = {
  signals: CsvSignalInput[];
  skipped: number;
  duplicateRows: number;
};

type CsvRecord = Record<string, string>;

export type CsvColumnMapping = Partial<Record<
  "timestamp" | "channel" | "sender" | "content" | "sentiment" | "metric_name" | "metric_value",
  string
>>;

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function mappedKey(mapping: CsvColumnMapping | undefined, field: keyof CsvColumnMapping) {
  const value = mapping?.[field];
  return value ? normalizeHeader(value) : undefined;
}

function mappedKeys(mapping: CsvColumnMapping | undefined, field: keyof CsvColumnMapping, fallbackKeys: string[]) {
  const key = mappedKey(mapping, field);
  return key ? [key, ...fallbackKeys] : fallbackKeys;
}

function first(record: CsvRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value?.trim()) return value.trim();
  }
  return "";
}

function normalizeTimestamp(value: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function normalizeSentiment(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "positive" || normalized === "negative" || normalized === "neutral") {
    return normalized;
  }
  return undefined;
}

function dedupeKey(signal: CsvSignalInput) {
  return [
    signal.timestamp,
    signal.channel,
    signal.sender ?? "",
    signal.content,
    signal.metric_name ?? "",
    signal.metric_value ?? "",
  ].join("\u001f");
}

export function parseCsvSignals(
  csvText: string,
  options: {
    workspaceId: string;
    branchId: string;
    sourceId?: string;
    sourceName: string;
    mapping?: CsvColumnMapping;
    now?: string;
  },
): CsvParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { signals: [], skipped: lines.length === 0 ? 0 : 1, duplicateRows: 0 };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const fallbackTimestamp = options.now ?? new Date().toISOString();
  const seen = new Set<string>();
  const signals: CsvSignalInput[] = [];
  let skipped = 0;
  let duplicateRows = 0;

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const record = headers.reduce<CsvRecord>((acc, header, index) => {
      acc[header] = cells[index]?.trim() ?? "";
      return acc;
    }, {});

    const content = first(
      record,
      mappedKeys(options.mapping, "content", ["content", "message", "text", "comment", "review", "description"]),
    );
    const metricName = first(record, mappedKeys(options.mapping, "metric_name", ["metric_name", "metric", "kpi"]));
    const metricValueRaw = first(record, mappedKeys(options.mapping, "metric_value", ["metric_value", "value", "amount", "count"]));
    const metricValue = metricValueRaw ? Number(metricValueRaw.replace(",", ".")) : undefined;
    const hasMetric = Boolean(metricName) && typeof metricValue === "number" && !Number.isNaN(metricValue);

    if (!content && !hasMetric) {
      skipped += 1;
      continue;
    }

    const timestamp = normalizeTimestamp(
      first(record, mappedKeys(options.mapping, "timestamp", ["timestamp", "created_at", "date", "time"])),
      fallbackTimestamp,
    );
    const channel = first(record, mappedKeys(options.mapping, "channel", ["channel", "platform", "source"])) || "csv";
    const sender = first(record, mappedKeys(options.mapping, "sender", ["sender", "customer", "name", "author"])) || options.sourceName;
    const sentiment = normalizeSentiment(first(record, mappedKeys(options.mapping, "sentiment", ["sentiment", "tone"])));
    const signalContent = content || `${metricName}: ${metricValue}`;

    const signal: CsvSignalInput = {
      workspace_id: options.workspaceId,
      branch_id: options.branchId,
      source_id: options.sourceId ?? null,
      source: "csv",
      source_type: "csv",
      channel,
      sender,
      content: signalContent,
      timestamp,
      sentiment,
      metric_name: hasMetric ? metricName : null,
      metric_value: hasMetric ? metricValue : null,
      reviewed: false,
    };

    const key = dedupeKey(signal);
    if (seen.has(key)) {
      duplicateRows += 1;
      continue;
    }

    seen.add(key);
    signals.push(signal);
  }

  return { signals, skipped, duplicateRows };
}

export function csvSignalDedupeKey(signal: Pick<CsvSignalInput, "timestamp" | "channel" | "sender" | "content" | "metric_name" | "metric_value">) {
  return dedupeKey(signal as CsvSignalInput);
}

export function parseCsvHeaders(csvText: string) {
  const firstLine = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .find((line) => line.trim());

  if (!firstLine) return [];

  return parseCsvLine(firstLine)
    .map((header) => header.trim())
    .filter(Boolean);
}
