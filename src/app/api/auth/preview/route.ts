export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  PREVIEW_AUTH_COOKIE,
  isValidPreviewAuthToken,
  sanitizePreviewRedirect,
} from "@/lib/preview-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!isValidPreviewAuthToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const redirectTo = sanitizePreviewRedirect(req.nextUrl.searchParams.get("redirect"));
  const res = NextResponse.redirect(new URL(redirectTo, req.url));
  res.cookies.set(PREVIEW_AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
