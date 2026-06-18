import { describe, expect, it } from "vitest";
import { parseCsvSignals } from "./csv-ingest";

describe("parseCsvSignals", () => {
  it("parses text and metric rows into branch-scoped CSV signals", () => {
    const csv = [
      "timestamp,channel,sender,content,metric_name,metric_value",
      "2026-06-18T08:00:00.000Z,review,Aylin,Queue was too slow,,",
      "2026-06-18T09:00:00.000Z,pos,POS Terminal,,order_count,42",
    ].join("\n");

    const result = parseCsvSignals(csv, {
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      sourceName: "Manual import",
      now: "2026-06-18T10:00:00.000Z",
    });

    expect(result.skipped).toBe(0);
    expect(result.duplicateRows).toBe(0);
    expect(result.signals).toHaveLength(2);
    expect(result.signals[0]).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      source: "csv",
      channel: "review",
      sender: "Aylin",
      content: "Queue was too slow",
      reviewed: false,
    });
    expect(result.signals[1]).toMatchObject({
      content: "order_count: 42",
      metric_name: "order_count",
      metric_value: 42,
    });
  });

  it("skips empty rows and dedupes repeated uploaded rows", () => {
    const csv = [
      "date,source,customer,text",
      "2026-06-18,csv,Customer A,Cold food",
      "2026-06-18,csv,Customer A,Cold food",
      "2026-06-18,csv,Customer B,",
    ].join("\n");

    const result = parseCsvSignals(csv, {
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceName: "CSV upload",
      now: "2026-06-18T10:00:00.000Z",
    });

    expect(result.signals).toHaveLength(1);
    expect(result.duplicateRows).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
