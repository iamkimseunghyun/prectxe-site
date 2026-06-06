export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

// 쿠키 기반 로케일 (URL 라우팅 없음). 미들웨어 matcher와 무관하게 동작.
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
};
