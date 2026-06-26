import { EnvValidationError } from "@/env";
import { resolveSourceAuthMaterialFromVault } from "./source-auth-secret-store";
import type { SourceAuthRef } from "./source-auth-refs";

export interface GoogleReviewsOAuthState {
  workspaceId: string;
  sourceId: string;
}

export interface GoogleReviewsTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
}

export interface GoogleBusinessLocationCandidate {
  external_id: string;
  name: string;
  account_name: string;
  store_code?: string;
  city?: string;
  district?: string;
}

export interface GoogleBusinessReview {
  external_review_id: string;
  reviewer_name: string;
  comment: string;
  rating: number | null;
  reviewed_at: string;
  update_time?: string;
}

export class GoogleBusinessProfileError extends Error {
  status = 400;

  constructor(message: string, public reason?: string, status?: number) {
    super(message);
    this.name = "GoogleBusinessProfileError";
    if (status) this.status = status;
  }
}

const GOOGLE_REVIEWS_SCOPE = "https://www.googleapis.com/auth/business.manage";

export function getGoogleReviewsAuthUrl(input: GoogleReviewsOAuthState) {
  const env = requireGoogleBusinessProfileEnv();
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: `${env.siteUrl}/api/auth/google-reviews-callback`,
    response_type: "code",
    scope: GOOGLE_REVIEWS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: encodeGoogleReviewsState(input),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleReviewsCode(code: string): Promise<GoogleReviewsTokenResponse> {
  const env = requireGoogleBusinessProfileEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: `${env.siteUrl}/api/auth/google-reviews-callback`,
      grant_type: "authorization_code",
    }),
  });
  return await res.json() as GoogleReviewsTokenResponse;
}

export async function refreshGoogleReviewsAccessToken(refreshToken: string): Promise<string> {
  const env = requireGoogleBusinessProfileEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json() as GoogleReviewsTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new GoogleBusinessProfileError("Google Reviews access token refresh failed");
  }
  return json.access_token;
}

export async function fetchGoogleBusinessLocations(accessToken: string): Promise<GoogleBusinessLocationCandidate[]> {
  const accounts = await fetchGoogleBusinessAccounts(accessToken);
  const locations = await Promise.all(accounts.map((account) => fetchGoogleBusinessLocationsForAccount(accessToken, account)));
  return locations.flat();
}

export async function fetchGoogleBusinessLocationsFromAuthRef(authRef: Pick<SourceAuthRef, "vault_ref">) {
  const material = await resolveSourceAuthMaterialFromVault({
    vaultRef: authRef.vault_ref,
    fields: ["oauthRefreshToken"],
  });
  const refreshToken = material.oauthRefreshToken;
  if (!refreshToken) throw new GoogleBusinessProfileError("Google Reviews OAuth refresh token is missing");
  const accessToken = await refreshGoogleReviewsAccessToken(refreshToken);
  return fetchGoogleBusinessLocations(accessToken);
}

export async function fetchGoogleBusinessReviews(input: {
  accessToken: string;
  locationName: string;
  pageSize?: number;
  maxReviews?: number;
}): Promise<GoogleBusinessReview[]> {
  const parent = normalizeReviewParent(input.locationName);
  const reviews: GoogleBusinessReview[] = [];
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 100);
  const maxReviews = Math.min(Math.max(input.maxReviews ?? 500, pageSize), 1000);
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${parent}/reviews`);
    url.searchParams.set("pageSize", String(Math.min(pageSize, maxReviews - reviews.length)));
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const json = await googleJson(url.toString(), input.accessToken);
    const pageReviews = Array.isArray(json.reviews) ? json.reviews : [];
    reviews.push(...pageReviews
      .map(normalizeReview)
      .filter((review): review is GoogleBusinessReview => Boolean(review)));
    pageToken = typeof json.nextPageToken === "string" && json.nextPageToken.trim()
      ? json.nextPageToken.trim()
      : undefined;
  } while (pageToken && reviews.length < maxReviews);

  return reviews.slice(0, maxReviews);
}

export async function fetchGoogleBusinessReviewsFromAuthRef(input: {
  authRef: Pick<SourceAuthRef, "vault_ref">;
  locationName: string;
  pageSize?: number;
  maxReviews?: number;
}) {
  const material = await resolveSourceAuthMaterialFromVault({
    vaultRef: input.authRef.vault_ref,
    fields: ["oauthRefreshToken"],
  });
  const refreshToken = material.oauthRefreshToken;
  if (!refreshToken) throw new GoogleBusinessProfileError("Google Reviews OAuth refresh token is missing");
  const accessToken = await refreshGoogleReviewsAccessToken(refreshToken);
  return fetchGoogleBusinessReviews({
    accessToken,
    locationName: input.locationName,
    pageSize: input.pageSize,
    maxReviews: input.maxReviews,
  });
}

export function encodeGoogleReviewsState(input: GoogleReviewsOAuthState): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

export function decodeGoogleReviewsState(value: string): GoogleReviewsOAuthState {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GoogleReviewsOAuthState>;
    if (!parsed.workspaceId || !parsed.sourceId) throw new Error("Invalid state");
    return {
      workspaceId: parsed.workspaceId,
      sourceId: parsed.sourceId,
    };
  } catch {
    throw new GoogleBusinessProfileError("Invalid Google Reviews OAuth state");
  }
}

function requireGoogleBusinessProfileEnv() {
  const clientSecretKey = `GOOGLE_BUSINESS_PROFILE_CLIENT_${"SECRET"}`;
  const gmailClientSecretKey = `GMAIL_CLIENT_${"SECRET"}`;
  const clientId = (
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID ??
    process.env.GMAIL_CLIENT_ID
  )?.trim();
  const clientSecret = (
    process.env[clientSecretKey] ??
    process.env[gmailClientSecretKey]
  )?.trim();
  const siteUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  const missing = [
    !clientId ? "GOOGLE_BUSINESS_PROFILE_CLIENT_ID or GMAIL_CLIENT_ID" : "",
    !clientSecret ? `${clientSecretKey} or ${gmailClientSecretKey}` : "",
    !siteUrl ? "NEXTAUTH_URL" : "",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new EnvValidationError("Google Business Profile OAuth", missing);
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    siteUrl: siteUrl!,
  };
}

async function fetchGoogleBusinessAccounts(accessToken: string): Promise<string[]> {
  const json = await googleJson("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", accessToken);
  const accounts = Array.isArray(json.accounts) ? json.accounts : [];
  return accounts
    .map((account) => account && typeof account === "object" ? (account as Record<string, unknown>).name : undefined)
    .filter((name): name is string => typeof name === "string" && name.startsWith("accounts/"));
}

async function fetchGoogleBusinessLocationsForAccount(
  accessToken: string,
  accountName: string,
): Promise<GoogleBusinessLocationCandidate[]> {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
  url.searchParams.set("readMask", "name,title,storeCode,storefrontAddress");
  url.searchParams.set("pageSize", "100");
  const json = await googleJson(url.toString(), accessToken);
  const locations = Array.isArray(json.locations) ? json.locations : [];
  return locations
    .map((location) => normalizeLocation(location, accountName))
    .filter((location): location is GoogleBusinessLocationCandidate => Boolean(location));
}

async function googleJson(url: string, accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    throw googleBusinessProfileRequestError(json, res.status);
  }
  return json;
}

function googleBusinessProfileRequestError(json: Record<string, unknown>, status: number) {
  const error = json.error && typeof json.error === "object" && !Array.isArray(json.error)
    ? json.error as Record<string, unknown>
    : {};
  const details = Array.isArray(error.details) ? error.details : [];
  const errorInfo = details.find((detail) => (
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail) &&
    (detail as Record<string, unknown>)["@type"] === "type.googleapis.com/google.rpc.ErrorInfo"
  )) as Record<string, unknown> | undefined;
  const metadata = errorInfo?.metadata && typeof errorInfo.metadata === "object" && !Array.isArray(errorInfo.metadata)
    ? errorInfo.metadata as Record<string, unknown>
    : {};
  const reason = typeof errorInfo?.reason === "string" ? errorInfo.reason : undefined;
  const serviceTitle = typeof metadata.serviceTitle === "string" ? metadata.serviceTitle : undefined;

  if (reason === "SERVICE_DISABLED" && serviceTitle) {
    return new GoogleBusinessProfileError(`${serviceTitle} is not enabled for this Google Cloud project.`, reason, status);
  }

  const message = typeof error.message === "string" && error.message.trim()
    ? error.message.trim()
    : "Google Business Profile request failed";
  return new GoogleBusinessProfileError(message, reason, status);
}

function normalizeLocation(value: unknown, accountName: string): GoogleBusinessLocationCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const locationName = typeof row.name === "string" ? row.name : "";
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : locationName;
  const address = row.storefrontAddress && typeof row.storefrontAddress === "object" && !Array.isArray(row.storefrontAddress)
    ? row.storefrontAddress as Record<string, unknown>
    : {};
  if (!locationName) return null;
  const externalId = locationName.startsWith("accounts/")
    ? locationName
    : `${accountName}/${locationName}`;
  return {
    external_id: externalId,
    name: title,
    account_name: accountName,
    store_code: typeof row.storeCode === "string" ? row.storeCode : undefined,
    city: stringValue(address.locality),
    district: stringValue(address.sublocality),
  };
}

function normalizeReview(value: unknown): GoogleBusinessReview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const externalReviewId = stringValue(row.reviewId) ?? stringValue(row.name);
  const comment = stringValue(row.comment) ?? "";
  const createTime = stringValue(row.createTime);
  if (!externalReviewId || !createTime) return null;

  return {
    external_review_id: externalReviewId,
    reviewer_name: stringValue(nested(row, ["reviewer", "displayName"])) ?? "Google reviewer",
    comment,
    rating: ratingValue(row.starRating),
    reviewed_at: createTime,
    update_time: stringValue(row.updateTime),
  };
}

function normalizeReviewParent(value: string) {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed.startsWith("accounts/") || !trimmed.includes("/locations/")) {
    throw new GoogleBusinessProfileError("Google Reviews location mapping is incomplete");
  }
  return trimmed;
}

function nested(value: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => (
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : undefined
  ), value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function ratingValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^([1-5])$/) ?? normalized.match(/^STAR_([1-5])$/);
  if (match) return Number(match[1]);
  return ({
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  } as Record<string, number | undefined>)[normalized] ?? null;
}
