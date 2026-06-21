import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "012_add_source_auth_refs.sql"),
  "utf8",
);

describe("012 source auth refs migration", () => {
  it("creates a workspace-scoped source auth reference table", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS source_auth_refs");
    expect(migration).toContain("workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE");
    expect(migration).toContain("source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE");
    expect(migration).toContain("UNIQUE (source_id, provider)");
  });

  it("stores only vault references and field names", () => {
    expect(migration).toContain("vault_ref TEXT NOT NULL");
    expect(migration).toContain("required_fields TEXT[] NOT NULL DEFAULT '{}'::text[]");
    expect(migration).toContain("provided_fields TEXT[] NOT NULL DEFAULT '{}'::text[]");
    expect(migration).toContain("provided_fields <@ required_fields");
  });

  it("enables workspace RLS and authenticated access", () => {
    expect(migration).toContain("ALTER TABLE source_auth_refs ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("is_workspace_member(workspace_id)");
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE source_auth_refs TO authenticated");
  });

  it("does not introduce direct auth value fields", () => {
    const blockedTerms = [
      "api" + "_key",
      "api" + "_secret",
      "secret" + "_key",
      "password",
      "service" + "_role",
    ];
    expect(migration).not.toMatch(new RegExp(`\\b(${blockedTerms.join("|")})\\b`, "i"));
  });
});
