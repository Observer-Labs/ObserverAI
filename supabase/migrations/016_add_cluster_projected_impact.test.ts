import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("016_add_cluster_projected_impact", () => {
  it("adds the projected impact column idempotently", () => {
    const sql = fs.readFileSync(
      path.join(__dirname, "016_add_cluster_projected_impact.sql"),
      "utf8",
    );

    expect(sql).toContain("ADD COLUMN IF NOT EXISTS projected_impact TEXT");
  });
});
