'use server';
import { cookies } from 'next/headers';
import { locales, type Locale } from '@/i18n/config';

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  if (!locales.includes(locale)) return;
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 31_536_000,
    path: '/',
    sameSite: 'lax',
  });
}
