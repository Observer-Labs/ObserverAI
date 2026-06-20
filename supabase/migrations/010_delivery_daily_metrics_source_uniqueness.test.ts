import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "010_delivery_daily_metrics_source_uniqueness.sql"),
  "utf8",
);

describe("010 delivery daily metrics source uniqueness migration", () => {
  it("replaces branch-platform-date uniqueness with branch-source-platform-date uniqueness", () => {
    expect(migration).toContain(
      "DROP CONSTRAINT IF EXISTS delivery_daily_metrics_workspace_id_branch_id_platform_metric_date_key",
    );
    expect(migration).toContain(
      "UNIQUE NULLS NOT DISTINCT (workspace_id, branch_id, source_id, platform, metric_date)",
    );
  });

  it("does not introduce credential storage", () => {
    const blockedTerms = [
      "api" + "_key",
      "api" + "_secret",
      "secret" + "_key",
      "token",
      "password",
      "credential",
      "service" + "_role",
    ];
    expect(migration).not.toMatch(new RegExp(`\\b(${blockedTerms.join("|")})\\b`, "i"));
  });
});
