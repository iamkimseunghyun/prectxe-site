'use server';

import { cookies } from 'next/headers';
import { defaultLocale, LOCALE_COOKIE, type Locale, locales } from './config';

// 쿠키에서 현재 로케일 읽기 (없으면 기본값)
export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

// 로케일 변경 — 1년 유지. 호출 후 호출자가 router.refresh() 필요
export async function setUserLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
}
