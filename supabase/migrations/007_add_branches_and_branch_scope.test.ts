import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "007_add_branches_and_branch_scope.sql"),
  "utf8",
);

describe("007 branch-scoped foundation migration", () => {
  it("creates the core v2 tables", () => {
    for (const table of [
      "workspace_members",
      "branches",
      "sources",
      "correlations",
      "token_usage",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("adds branch scope to existing data tables", () => {
    expect(migration).toMatch(/ALTER TABLE signals[\s\S]*ADD COLUMN IF NOT EXISTS branch_id/);
    expect(migration).toMatch(/ALTER TABLE clusters[\s\S]*ADD COLUMN IF NOT EXISTS branch_id/);
    expect(migration).toMatch(/ALTER TABLE deliveries[\s\S]*ADD COLUMN IF NOT EXISTS branch_id/);
    expect(migration).toContain("ALTER TABLE signals\n  ALTER COLUMN branch_id SET NOT NULL");
    expect(migration).toContain("ALTER TABLE clusters\n  ALTER COLUMN branch_id SET NOT NULL");
  });

  it("backfills one default branch per workspace before enforcing branch_id", () => {
    expect(migration).toContain("INSERT INTO branches (workspace_id, name, timezone, status)");
    expect(migration).toContain("SELECT w.id, 'Ana Şube', 'Europe/Istanbul', 'active'");
    expect(migration).toContain("UPDATE signals s\nSET branch_id = b.id");
    expect(migration).toContain("UPDATE clusters c\nSET branch_id = b.id");
  });

  it("uses membership-aware RLS policies", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION is_workspace_member");
    for (const policy of [
      "workspace_owner",
      "signals_via_workspace",
      "clusters_via_workspace",
      "deliveries_via_workspace",
      "branches_via_workspace",
      "sources_via_workspace",
      "correlations_via_workspace",
      "token_usage_via_workspace",
    ]) {
      expect(migration).toContain(`CREATE POLICY "${policy}"`);
    }
  });
});
