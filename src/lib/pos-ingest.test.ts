import { describe, expect, it } from "vitest";
import { parsePosMetricSignals, posMetricDedupeKey } from "./pos-ingest";

describe("pos ingest helpers", () => {
  it("maps metric CSV rows to branch-scoped POS signals", () => {
    const result = parsePosMetricSignals([
      "timestamp,channel,sender,content,metric_name,metric_value",
      "2026-06-21T10:00:00.000Z,counter,Terminal 1,,daily_sales,12500",
      "2026-06-21T11:00:00.000Z,review,Aylin,Line was slow,,",
    ].join("\n"), {
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      sourceName: "Simpra POS",
      now: "2026-06-21T12:00:00.000Z",
    });

    expect(result.signals).toHaveLength(1);
    expect(result.nonMetricRows).toBe(1);
    expect(result.signals[0]).toMatchObject({
      workspace_id: "workspace-1",
      branch_id: "branch-1",
      source_id: "source-1",
      source: "pos",
      source_type: "pos",
      channel: "counter",
      sender: "Terminal 1",
      content: "daily_sales: 12500",
      metric_name: "daily_sales",
      metric_value: 12500,
      timestamp: "2026-06-21T10:00:00.000Z",
      reviewed: false,
    });
  });

  it("uses mapped metric columns and default POS channel", () => {
    const result = parsePosMetricSignals([
      "When,Metric,Reading",
      "2026-06-21 10:00,cancel_count,4",
    ].join("\n"), {
      workspaceId: "workspace-1",
      branchId: "branch-1",
      sourceId: "source-1",
      sourceName: "POS export",
      mapping: {
        timestamp: "When",
        metric_name: "Metric",
        metric_value: "Reading",
      },
      now: "2026-06-21T12:00:00.000Z",
    });

    expect(result.signals[0]).toMatchObject({
      channel: "pos",
      sender: "POS export",
      metric_name: "cancel_count",
      metric_value: 4,
    });
  });

  it("dedupes using metric identity", () => {
    expect(posMetricDedupeKey({
      timestamp: "2026-06-21T10:00:00.000Z",
      channel: "pos",
      sender: "Terminal 1",
      content: "daily_sales: 12500",
      metric_name: "daily_sales",
      metric_value: 12500,
    })).toBe("2026-06-21T10:00:00.000Z\u001fpos\u001fTerminal 1\u001fdaily_sales: 12500\u001fdaily_sales\u001f12500");
  });
});
