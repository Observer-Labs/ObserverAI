import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(__dirname, "013_source_auth_vault_rpc.sql"),
  "utf8",
);

describe("013 source auth vault rpc migration", () => {
  it("stores source auth material in Supabase Vault behind service-role functions", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault");
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS vault");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.source_auth_vault_store");
    expect(migration).toContain("vault.create_secret");
    expect(migration).toContain("RETURN 'supabase-vault://source-auth/'");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.source_auth_vault_read");
    expect(migration).toContain("FROM vault.decrypted_secrets");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.source_auth_vault_store");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.source_auth_vault_store(UUID, UUID, TEXT, JSONB) TO service_role");
  });
});
