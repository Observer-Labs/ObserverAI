import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("019_backfill_workspace_branch_limit", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "019_backfill_workspace_branch_limit.sql"),
    "utf8",
  );

  it("defaults new workspaces to the most restrictive limit", () => {
    expect(sql).toContain(
      "ALTER TABLE workspaces ALTER COLUMN branch_limit SET DEFAULT 1",
    );
  });

  it("backfills each paid plan to its tier limit", () => {
    expect(sql).toMatch(/SET branch_limit = 1\s+WHERE branch_limit IS NULL AND plan = 'starter'/);
    expect(sql).toMatch(/SET branch_limit = 5\s+WHERE branch_limit IS NULL AND plan = 'growth'/);
    expect(sql).toMatch(/SET branch_limit = 20\s+WHERE branch_limit IS NULL AND plan = 'scale'/);
  });

  it("only touches NULL rows so the migration is idempotent", () => {
    const updates = sql.match(/UPDATE workspaces/g) ?? [];
    const nullGuards = sql.match(/branch_limit IS NULL/g) ?? [];
    expect(updates.length).toBeGreaterThan(0);
    expect(nullGuards.length).toBe(updates.length);
  });

  it("keeps enterprise unlimited (NULL)", () => {
    expect(sql).toContain("plan <> 'enterprise'");
    expect(sql).not.toMatch(/plan = 'enterprise'/);
  });
});
