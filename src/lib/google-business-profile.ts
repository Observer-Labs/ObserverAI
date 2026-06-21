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
}

export class GoogleBusinessProfileError extends Error {
  status = 400;
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
  const clientId = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET?.trim();
  const siteUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  const missing = [
    !clientId ? "GOOGLE_BUSINESS_PROFILE_CLIENT_ID" : "",
    !clientSecret ? "GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET" : "",
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
  url.searchParams.set("readMask", "name,title,storeCode");
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
    throw new GoogleBusinessProfileError("Google Business Profile request failed");
  }
  return json;
}

function normalizeLocation(value: unknown, accountName: string): GoogleBusinessLocationCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const externalId = typeof row.name === "string" ? row.name : "";
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : externalId;
  if (!externalId) return null;
  return {
    external_id: externalId,
    name: title,
    account_name: accountName,
    store_code: typeof row.storeCode === "string" ? row.storeCode : undefined,
  };
}
