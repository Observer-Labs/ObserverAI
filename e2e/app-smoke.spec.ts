import { expect, type Page, test } from "@playwright/test";

const workspace = {
  id: "workspace-e2e",
  name: "Observer E2E",
  plan: "starter",
  branch_limit: 1,
  trial_ends_at: "2026-07-01T00:00:00.000Z",
  analysis_count: 0,
  polar_status: "active",
};

const mainBranch = {
  id: "branch-e2e-main",
  name: "Kadikoy Moda",
  brand: "Observer Cafe",
  district: "Kadikoy",
  city: "Istanbul",
  timezone: "Europe/Istanbul",
  status: "active",
  source_count: 0,
  connected_source_count: 0,
  last_sync_at: null,
};

async function addMiddlewareBypassCookie(page: Page) {
  await page.context().addCookies([
    {
      name: "observer-preview-auth",
      value: "placeholder-e2e-token",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function mockAuthenticatedApi(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "user-e2e", email: "e2e@example.com", displayName: "E2E User" },
        workspaceId: workspace.id,
      }),
    });
  });

  await page.route("**/api/workspace", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ workspace }),
    });
  });

  await page.route("**/api/branches", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          code: "branch_limit_reached",
          error: "Branch limit reached",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ branches: [mainBranch] }),
    });
  });

  await page.route("**/api/admin/admins", async (route) => {
    await route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/sources", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sources: [] }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await addMiddlewareBypassCookie(page);
  await mockAuthenticatedApi(page);
});

test("dashboard shows a real empty-source state instead of skeleton cards", async ({ page }) => {
  await page.route("**/api/analyze**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ clusters: [] }),
    });
  });
  await page.route("**/api/signals**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ signals: [], total: 0 }),
    });
  });

  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Sinyaller" })).toBeVisible();
  await expect(page.getByText("Henüz kaynak bağlanmadı.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Kaynak bağla →" })).toHaveAttribute("href", "/connect");
  await expect(page.getByRole("button", { name: "Demo veriyle dene" })).toBeVisible();
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
});

test("branches page surfaces plan limits before creating a second active branch", async ({ page }) => {
  await page.goto("/settings/branches");

  await expect(page.getByRole("heading", { name: "Şubeler" })).toBeVisible();
  await expect(page.getByText("1/1")).toBeVisible();
  await expect(page.getByText("Kadikoy Moda")).toBeVisible();
  await expect(page.getByText("Şube limiti dolu")).toBeVisible();

  await page.getByRole("button", { name: "Şube ekle" }).click();
  await page.getByLabel("Şube adı").fill("Besiktas Akaretler");
  await page.getByRole("button", { name: "Şube oluştur" }).click();

  await expect(
    page.getByRole("dialog").getByText("Şube limitine ulaşıldı. Daha fazla aktif şube için plan yükseltin."),
  ).toBeVisible();
});

test("connect imports Universal CSV rows for the selected branch", async ({ page }) => {
  await page.route("**/api/ingest/csv", async (route) => {
    const body = route.request().postDataJSON() as {
      branch_id?: string;
      display_name?: string;
      csv_text?: string;
    };

    expect(body.branch_id).toBe(mainBranch.id);
    expect(body.display_name).toBe("Sample signal test");
    expect(body.csv_text).toContain("Queue was too slow during breakfast rush");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ingested: 2,
        skipped: 0,
        duplicateRows: 0,
        existingDuplicates: 0,
      }),
    });
  });

  await page.goto("/connect");

  await expect(page.getByRole("heading", { name: "Veri Kaynakları" })).toBeVisible();
  await expect(page.getByText("Universal CSV")).toBeVisible();
  await expect(page.getByText("Selected branch:")).toBeVisible();
  await expect(page.getByText(`CSV rows for ${mainBranch.name}`)).toBeVisible();

  await page.getByRole("button", { name: "Load sample CSV" }).click();
  await expect(page.locator("#csv-text")).toHaveValue(/Queue was too slow during breakfast rush/);
  await page.getByRole("button", { name: "Import CSV" }).click();

  await expect(page.getByText("Imported 2 signals.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open dashboard" })).toBeVisible();
});
