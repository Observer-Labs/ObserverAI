import { describe, it, expect } from "vitest";

describe("014_add_cluster_category", () => {
  it("migration file exists and contains expected DDL", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const sql = fs.readFileSync(
      path.join(__dirname, "014_add_cluster_category.sql"),
      "utf-8"
    );
    expect(sql).toContain("category");
    expect(sql).toContain("musteri");
    expect(sql).toContain("operasyon");
    expect(sql).toContain("personel");
  });
});
