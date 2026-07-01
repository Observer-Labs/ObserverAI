import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("017_secure_admins_rls", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "017_secure_admins_rls.sql"),
    "utf8",
  );

  it("enables RLS for the server-only admins table", () => {
    expect(sql).toContain(
      "ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY",
    );
  });

  it("revokes direct client-role access and preserves service-role access", () => {
    expect(sql).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.admins FROM anon",
    );
    expect(sql).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.admins FROM authenticated",
    );
    expect(sql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admins TO service_role",
    );
  });

  it("does not add a client-readable RLS policy", () => {
    expect(sql).not.toContain("CREATE POLICY");
  });
});
