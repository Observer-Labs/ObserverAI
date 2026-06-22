import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/email";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.redirect(`${siteUrl}/login?redirect=/sources`);
  }

  try {
    const sourceId = req.nextUrl.searchParams.get("source_id")?.trim();
    if (sourceId) {
      const { data, error } = await getSupabaseAdmin()
        .from("sources")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("id", sourceId)
        .in("type", ["email", "gmail"])
        .single();
      if (error || !data) return NextResponse.redirect(`${siteUrl}/connect?error=gmail_source_not_found`);
    }

    const url = getGmailAuthUrl({ workspaceId, sourceId: sourceId || undefined });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${siteUrl}/connect?error=gmail_not_configured`);
  }
}
