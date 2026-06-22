export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { decodeGmailState, exchangeGmailCode } from "@/lib/email";
import { storeSourceAuthMaterial } from "@/lib/source-auth-secret-store";
import { upsertSourceAuthRef } from "@/lib/source-auth-refs";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!code || !rawState) {
    return NextResponse.redirect(`${siteUrl}/connect?error=gmail_denied`);
  }

  let parsedState: { workspaceId: string; sourceId?: string };
  try {
    parsedState = decodeGmailState(rawState);
  } catch {
    return NextResponse.redirect(`${siteUrl}/connect?error=gmail_denied`);
  }

  let tokens: { access_token?: string; refresh_token?: string };
  try {
    tokens = await exchangeGmailCode(code);
  } catch {
    return NextResponse.redirect(`${siteUrl}/connect?error=gmail_auth_failed`);
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(`${siteUrl}/connect?error=gmail_auth_failed`);
  }

  if (parsedState.sourceId) {
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${siteUrl}/connect?error=gmail_missing_refresh_token&source_id=${parsedState.sourceId}`);
    }

    try {
      const stored = await storeSourceAuthMaterial(parsedState.workspaceId, {
        sourceId: parsedState.sourceId,
        provider: "gmail",
        material: {
          oauthRefreshToken: tokens.refresh_token,
        },
      });
      await upsertSourceAuthRef(parsedState.workspaceId, {
        sourceId: parsedState.sourceId,
        provider: "gmail",
        vaultRef: stored.vaultRef,
        requiredFields: stored.requiredFields,
        providedFields: stored.providedFields,
        status: "ready",
        lastVerifiedAt: new Date().toISOString(),
      });
      await supabaseAdmin
        .from("sources")
        .update({ status: "connected" })
        .eq("workspace_id", parsedState.workspaceId)
        .eq("id", parsedState.sourceId);
    } catch {
      return NextResponse.redirect(`${siteUrl}/connect?error=gmail_auth_store_failed&source_id=${parsedState.sourceId}`);
    }

    return NextResponse.redirect(`${siteUrl}/connect?gmail=connected&source_id=${parsedState.sourceId}`);
  }

  await supabaseAdmin
    .from("workspaces")
    .update({
      gmail_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token,
    })
    .eq("id", parsedState.workspaceId);

  return NextResponse.redirect(`${siteUrl}/connect?gmail=connected`);
}
