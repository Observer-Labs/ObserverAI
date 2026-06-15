import { afterEach, describe, expect, it } from "vitest";
import {
  getPreviewAuthConfig,
  getPreviewWorkspaceIdFromCookie,
  isValidPreviewAuthToken,
  sanitizePreviewRedirect,
} from "./preview-auth";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("preview auth bypass", () => {
  it("is disabled outside Vercel preview", () => {
    process.env.VERCEL_ENV = "production";
    process.env.PREVIEW_AUTH_BYPASS_ENABLED = "true";
    process.env.PREVIEW_AUTH_BYPASS_TOKEN = "placeholder-token";
    process.env.PREVIEW_WORKSPACE_ID = "workspace-preview";

    expect(getPreviewAuthConfig()).toBeNull();
    expect(isValidPreviewAuthToken("placeholder-token")).toBe(false);
  });

  it("resolves the configured preview workspace from the matching cookie", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.PREVIEW_AUTH_BYPASS_ENABLED = "true";
    process.env.PREVIEW_AUTH_BYPASS_TOKEN = "placeholder-token";
    process.env.PREVIEW_WORKSPACE_ID = "workspace-preview";

    expect(getPreviewWorkspaceIdFromCookie("placeholder-token")).toBe("workspace-preview");
    expect(getPreviewWorkspaceIdFromCookie("wrong-token")).toBeNull();
  });

  it("only allows relative preview redirects", () => {
    expect(sanitizePreviewRedirect("/dashboard")).toBe("/dashboard");
    expect(sanitizePreviewRedirect("https://example.com")).toBe("/dashboard");
    expect(sanitizePreviewRedirect("//example.com")).toBe("/dashboard");
  });
});
