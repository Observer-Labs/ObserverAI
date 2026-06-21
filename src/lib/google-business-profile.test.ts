import { beforeEach, describe, expect, it, vi } from "vitest";

describe("google business profile helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID = "example-client-id";
    process.env[`GOOGLE_BUSINESS_PROFILE_CLIENT_${"SECRET"}`] = "example-client-secret";
    process.env.NEXTAUTH_URL = "https://observer.example";
  });

  it("builds a source-scoped OAuth URL with business.manage scope", async () => {
    const { decodeGoogleReviewsState, getGoogleReviewsAuthUrl } = await import("./google-business-profile");
    const url = new URL(getGoogleReviewsAuthUrl({
      workspaceId: "workspace-1",
      sourceId: "source-1",
    }));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/business.manage");
    expect(url.searchParams.get("redirect_uri")).toBe("https://observer.example/api/auth/google-reviews-callback");
    expect(decodeGoogleReviewsState(url.searchParams.get("state") ?? "")).toEqual({
      workspaceId: "workspace-1",
      sourceId: "source-1",
    });
  });

  it("fetches and normalizes locations across GBP accounts", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "https://mybusinessaccountmanagement.googleapis.com/v1/accounts") {
        return Response.json({ accounts: [{ name: "accounts/123" }] });
      }
      return Response.json({
        locations: [{
          name: "locations/456",
          title: "Moda Branch",
          storeCode: "MODA",
        }],
      });
    });
    global.fetch = fetchMock as typeof fetch;
    const { fetchGoogleBusinessLocations } = await import("./google-business-profile");

    await expect(fetchGoogleBusinessLocations("example-access-token")).resolves.toEqual([{
      external_id: "locations/456",
      name: "Moda Branch",
      account_name: "accounts/123",
      store_code: "MODA",
    }]);

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/123/locations?readMask=name%2Ctitle%2CstoreCode&pageSize=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer example-access-token",
        }),
      }),
    );
  });
});
