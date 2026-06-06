'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { type Locale, locales } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import { cn } from '@/lib/utils';

/**
 * KO/EN 토글 — 쿠키에 로케일 저장 후 서버 컴포넌트 갱신.
 * URL 라우팅 없는 쿠키 기반이므로 router.refresh()로 RSC 재요청.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  };

  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-neutral-400">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            disabled={isPending}
            className={cn(
              'uppercase transition-colors disabled:opacity-50',
              l === locale
                ? 'font-semibold text-current'
                : 'text-neutral-400 hover:text-current'
            )}
            aria-current={l === locale ? 'true' : undefined}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
