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

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const raw = process.env.OBSERVER_ADMIN_EMAILS ?? "";
  if (!raw) return false;
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<void> {
  const email = await getAdminEmail();
  if (!isAdminEmail(email)) {
    throw new Error("Forbidden");
  }
}
