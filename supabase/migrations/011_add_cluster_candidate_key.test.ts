import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "011_add_cluster_candidate_key.sql"),
  "utf8",
);

describe("011 cluster candidate key migration", () => {
  it("adds an indexed deterministic candidate key to clusters", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS candidate_key TEXT");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS clusters_candidate_key_idx ON clusters(candidate_key)");
  });

  it("does not introduce sensitive fields", () => {
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
