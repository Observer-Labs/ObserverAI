import { NextRequest, NextResponse } from "next/server";

function getSupabaseCookiePrefix() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    const projectRef = host.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const cookiePrefix = getSupabaseCookiePrefix();
  // Check for Supabase session cookie, it may be stored as a single cookie or chunked
  // Don't try to parse/validate the value here; real auth validation happens in API routes
  const hasCookie =
    cookiePrefix &&
    (req.cookies.get(cookiePrefix) ||
      req.cookies.get(`${cookiePrefix}.0`));

  if (!hasCookie) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(req.nextUrl.pathname)}`, req.url)
    );
  }
  return NextResponse.next();
}

