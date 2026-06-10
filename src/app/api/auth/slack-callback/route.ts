export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state") ?? "00000000-0000-0000-0000-000000000001";

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?error=slack_denied`);
  }

  // Exchange code for token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?error=slack_auth_failed`);
  }

  // Store token in workspace
  await supabaseAdmin
    .from("workspaces")
    .update({
      slack_token: tokenData.access_token,
      slack_bot_token: tokenData.bot?.bot_access_token ?? tokenData.access_token,
      slack_team_id: tokenData.team?.id,
    })
    .eq("id", workspaceId);

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/connect?step=2&slack=connected`);
}
