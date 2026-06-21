import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("delivery partner runtime", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.TRENDYOL_GO_API_BASE_URL;
    delete process.env.GETIR_FOOD_API_BASE_URL;
    delete process.env.TRENDYOL_SOURCE_AUTH;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.TRENDYOL_GO_API_BASE_URL;
    delete process.env.GETIR_FOOD_API_BASE_URL;
    delete process.env.TRENDYOL_SOURCE_AUTH;
  });

  it("resolves delivery auth material from a referenced env JSON object", async () => {
    process.env.TRENDYOL_SOURCE_AUTH = JSON.stringify({
      apiKey: "example-api-key",
      apiSecretKey: "example-api-secret",
      ignored: "drop",
    });
    const { envVaultResolver } = await import("./delivery-partner-runtime");

    await expect(envVaultResolver.resolve({
      vaultRef: "vercel://env/TRENDYOL_SOURCE_AUTH",
      fields: ["apiKey", "apiSecretKey"],
    })).resolves.toEqual({
      apiKey: "example-api-key",
      apiSecretKey: "example-api-secret",
    });
  });

  it("resolves delivery auth material through the combined resolver", async () => {
    process.env.TRENDYOL_SOURCE_AUTH = JSON.stringify({
      apiKey: "example-api-key",
      apiSecretKey: "example-api-secret",
    });
    const { sourceAuthMaterialResolver } = await import("./delivery-partner-runtime");

    await expect(sourceAuthMaterialResolver.resolve({
      vaultRef: "vercel://env/TRENDYOL_SOURCE_AUTH",
      fields: ["apiKey", "apiSecretKey"],
    })).resolves.toEqual({
      apiKey: "example-api-key",
      apiSecretKey: "example-api-secret",
    });
  });

  it("rejects unsupported vault refs without reading arbitrary values", async () => {
    const { envVaultResolver, DeliveryPartnerRuntimeError } = await import("./delivery-partner-runtime");

    await expect(envVaultResolver.resolve({
      vaultRef: "vault://sources/source-1/trendyol",
      fields: ["apiKey"],
    })).rejects.toBeInstanceOf(DeliveryPartnerRuntimeError);
  });

  it("creates a provider HTTP client that prefixes base URL and query params", async () => {
    process.env.TRENDYOL_GO_API_BASE_URL = "https://partner.example.test/root";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;
    const { createDeliveryPartnerHttpClient } = await import("./delivery-partner-runtime");
    const client = createDeliveryPartnerHttpClient("trendyol");

    await expect(client.request({
      method: "GET",
      path: "/integrator/orders",
      headers: { Authorization: "Basic example" },
      query: { page: 1, status: ["Created", "Delivered"] },
    })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://partner.example.test/integrator/orders?page=1&status=Created&status=Delivered"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic example",
        }),
      }),
    );
  });

  it("throws when provider base URL is not configured", async () => {
    const { createDeliveryPartnerHttpClient, DeliveryPartnerRuntimeError } = await import("./delivery-partner-runtime");

    expect(() => createDeliveryPartnerHttpClient("getir")).toThrow(DeliveryPartnerRuntimeError);
  });
});
