import { getAuthenticatedWorkspaceId } from "./auth";
import { getSupabaseAdmin } from "./supabase";

export async function getAdminEmail(): Promise<string | null> {
  try {
    const wid = await getAuthenticatedWorkspaceId();
    const { data } = await getSupabaseAdmin()
      .from("workspaces")
      .select("user_id")
      .eq("id", wid)
      .single();
    if (!data?.user_id) return null;
    const { data: user } = await getSupabaseAdmin().auth.admin.getUserById(data.user_id);
    return user?.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const email = await getAdminEmail();
  if (!email) return false;
  try {
    const { data } = await getSupabaseAdmin()
      .from("admins")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const ok = await isAdmin();
  if (!ok) throw new Error("Forbidden");
}
