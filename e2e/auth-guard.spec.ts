import { expect, test } from "@playwright/test";

test("dashboard requires authentication and redirects to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  await expect(page).toHaveTitle(/Observer AI/);
});
