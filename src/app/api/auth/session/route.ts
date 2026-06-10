export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/auth/session
 *
 * Bridge for client pages to retrieve the current user + workspace.
 * Returns:
 *   - user: { id, email, displayName }
 *   - workspaceId
 * Or 401 if not authenticated.
 *
 * Note: this used to return { workspaceId } only, which silently broke
 * settings/distribution/delivery-log pages that read user.email.
 */
export async function GET() {
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
    },
  );

  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .single();

  // user_metadata may be present under either key historically, prefer full_name.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.display_name as string | undefined) ??
    null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName,
    },
    workspaceId: workspace?.id ?? null,
  });
}
