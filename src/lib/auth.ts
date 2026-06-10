import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "./supabase";

/**
 * Server-side helper for API routes.
 * Returns the authenticated workspace ID, throwing on failure.
 *
 * Two valid auth paths:
 *  1. Cookie auth (regular browser request): @supabase/ssr session cookie
 *  2. Cron auth (internal /api/cron triggers): x-cron-secret + x-cron-workspace-id
 *     headers, both verified against env CRON_SECRET. Cron callers are trusted
 *     because the secret is rotated server-side and never exposed to clients.
 */
export async function getAuthenticatedWorkspaceId(): Promise<string> {
  // ── Path 1: Cron secret bypass ──────────────────────────────────────────────
  const hdrs = await headers();
  const cronSecret = hdrs.get("x-cron-secret");
  const cronWorkspaceId = hdrs.get("x-cron-workspace-id");
  if (cronSecret && cronWorkspaceId) {
    const expected = process.env.CRON_SECRET;
    if (expected && cronSecret === expected) {
      // Verify the workspace actually exists, defense against typos / abuse
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", cronWorkspaceId)
        .single();
      if (!error && data) return data.id;
    }
    // Invalid cron auth → fall through to cookie auth (don't leak info)
  }

  // ── Path 2: Cookie auth (default) ───────────────────────────────────────────
  const cookieStore = await cookies();
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user }, error } = await supabaseUser.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthenticated");
  }

  const supabase = getSupabaseAdmin();
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (wsError || !workspace) {
    throw new Error(`No workspace found for user ${user.id}`);
  }

  return workspace.id;
}
