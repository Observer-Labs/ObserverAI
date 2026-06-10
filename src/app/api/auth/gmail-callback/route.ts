export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { exchangeGmailCode } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state");
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!code || !workspaceId) {
    return NextResponse.redirect(`${siteUrl}/sources?error=gmail_denied`);
  }

  let tokens: { access_token?: string; refresh_token?: string };
  try {
    tokens = await exchangeGmailCode(code);
  } catch {
    return NextResponse.redirect(`${siteUrl}/sources?error=gmail_auth_failed`);
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(`${siteUrl}/sources?error=gmail_auth_failed`);
  }

  await supabaseAdmin
    .from("workspaces")
    .update({
      gmail_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token,
    })
    .eq("id", workspaceId);

  return NextResponse.redirect(`${siteUrl}/sources?gmail=connected`);
}
