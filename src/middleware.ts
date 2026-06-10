import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './auth-guard';
import { defaultLocale, locales } from './i18n/config';

export function middleware(req: NextRequest) {
  const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;
  const needsLocale = !localeCookie || !locales.includes(localeCookie as typeof locales[number]);

  const authResult = proxy(req);

  if (needsLocale) {
    const res = authResult instanceof NextResponse ? authResult : NextResponse.next();
    res.cookies.set('NEXT_LOCALE', defaultLocale, {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    });
    return res;
  }

  return authResult;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
