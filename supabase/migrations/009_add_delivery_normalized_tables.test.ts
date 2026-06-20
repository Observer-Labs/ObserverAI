import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "009_add_delivery_normalized_tables.sql"),
  "utf8",
);

describe("009 delivery normalized tables migration", () => {
  it("creates delivery normalization tables", () => {
    for (const table of [
      "delivery_orders",
      "delivery_reviews",
      "delivery_daily_metrics",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("keeps sensitive credentials out of delivery data tables", () => {
    expect(migration).not.toMatch(/\b(api_key|api_secret|secret_key|token|password|credential|card_number|service_role)\b/i);
    expect(migration).toContain("raw_ref JSONB NOT NULL DEFAULT '{}'::jsonb");
  });

  it("links records to workspace, branch, and optional source", () => {
    expect(migration).toMatch(/workspace_id UUID NOT NULL REFERENCES workspaces\(id\) ON DELETE CASCADE/);
    expect(migration).toMatch(/branch_id UUID NOT NULL REFERENCES branches\(id\) ON DELETE CASCADE/);
    expect(migration).toMatch(/source_id UUID REFERENCES sources\(id\) ON DELETE SET NULL/);
  });

  it("stores payment and operational facts needed by correlation rules", () => {
    for (const column of [
      "gross_amount",
      "net_amount",
      "discount_amount",
      "payment_type",
      "payment_provider",
      "cancel_reason",
      "prep_duration_minutes",
      "delivery_duration_minutes",
      "cancel_rate",
      "bad_review_count",
      "dominant_topics",
    ]) {
      expect(migration).toMatch(new RegExp(`\\b${column}\\b`));
    }
  });

  it("adds uniqueness constraints for idempotent sync", () => {
    expect(migration).toContain("UNIQUE (workspace_id, platform, external_order_id)");
    expect(migration).toContain("UNIQUE (workspace_id, platform, external_review_id)");
    expect(migration).toContain("UNIQUE (workspace_id, branch_id, platform, metric_date)");
  });

  it("enables membership-aware RLS and grants authenticated access", () => {
    for (const table of [
      "delivery_orders",
      "delivery_reviews",
      "delivery_daily_metrics",
    ]) {
      expect(migration).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toMatch(new RegExp(`CREATE POLICY "${table}_via_workspace"`));
      expect(migration).toMatch(new RegExp(`\\b${table}\\b[\\s\\S]*TO authenticated`));
    }
    expect(migration).toContain("is_workspace_member(workspace_id)");
  });
});
