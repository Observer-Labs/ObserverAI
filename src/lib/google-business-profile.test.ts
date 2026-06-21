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
      external_id: "accounts/123/locations/456",
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

  it("fetches and normalizes reviews for a mapped GBP location parent", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      reviews: [{
        reviewId: "review-1",
        reviewer: { displayName: "Aylin" },
        comment: "Servis cok yavas.",
        starRating: "ONE",
        createTime: "2026-06-20T09:00:00Z",
        updateTime: "2026-06-20T09:30:00Z",
      }],
    }));
    global.fetch = fetchMock as typeof fetch;
    const { fetchGoogleBusinessReviews } = await import("./google-business-profile");

    await expect(fetchGoogleBusinessReviews({
      accessToken: "example-access-token",
      locationName: "accounts/123/locations/456",
    })).resolves.toEqual([{
      external_review_id: "review-1",
      reviewer_name: "Aylin",
      comment: "Servis cok yavas.",
      rating: 1,
      reviewed_at: "2026-06-20T09:00:00Z",
      update_time: "2026-06-20T09:30:00Z",
    }]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews?pageSize=50&orderBy=updateTime+desc",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer example-access-token",
        }),
      }),
    );
  });
});
