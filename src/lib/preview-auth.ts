export const PREVIEW_AUTH_COOKIE = "observer-preview-auth";

type PreviewAuthConfig = {
  token: string;
  workspaceId: string;
};

export function getPreviewAuthConfig(): PreviewAuthConfig | null {
  if (process.env.VERCEL_ENV !== "preview") return null;
  if (process.env.PREVIEW_AUTH_BYPASS_ENABLED !== "true") return null;

  const token = process.env.PREVIEW_AUTH_BYPASS_TOKEN?.trim();
  const workspaceId = process.env.PREVIEW_WORKSPACE_ID?.trim();
  if (!token || !workspaceId) return null;

  return { token, workspaceId };
}

export function getPreviewWorkspaceIdFromCookie(cookieValue?: string | null) {
  const config = getPreviewAuthConfig();
  if (!config || !cookieValue) return null;
  return cookieValue === config.token ? config.workspaceId : null;
}

export function isValidPreviewAuthToken(token?: string | null) {
  const config = getPreviewAuthConfig();
  return Boolean(config && token && token === config.token);
}

export function sanitizePreviewRedirect(value?: string | null) {
  if (!value) return "/dashboard";
  return /^\/[a-zA-Z]/.test(value) ? value : "/dashboard";
}
