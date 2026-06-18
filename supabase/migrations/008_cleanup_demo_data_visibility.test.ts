import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./008_cleanup_demo_data_visibility.sql", import.meta.url),
  "utf8",
);

describe("008 demo data visibility cleanup migration", () => {
  it("removes demo signals while limiting cluster cleanup to demo-only workspaces", () => {
    expect(migration).toContain("demo_only_workspaces");
    expect(migration).toContain("demo.channel = 'demo'");
    expect(migration).toContain("real.channel <> 'demo'");
    expect(migration).toContain("DELETE FROM clusters");
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain("DELETE FROM signals");
    expect(migration).toContain("WHERE channel = 'demo'");
  });
});
