import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/email";
import { getAuthenticatedWorkspaceId } from "@/lib/auth";

export async function GET() {
  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let workspaceId: string;
  try {
    workspaceId = await getAuthenticatedWorkspaceId();
  } catch {
    return NextResponse.redirect(`${siteUrl}/login?redirect=/sources`);
  }

  try {
    const url = getGmailAuthUrl(workspaceId);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${siteUrl}/sources?error=gmail_not_configured`);
  }
}
