'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { StatusChips } from './status-chips';

export function ProgramFilters({ pathname }: { pathname: string }) {
  // Keep URL in a clean state when users land with old params
  const router = useRouter();
  const searchParams = useSearchParams();

  // If legacy params exist and content is small, strip them out
  useEffect(() => {
    const legacyParams = ['type', 'city'];
    const hasLegacy = legacyParams.some((k) => searchParams.has(k));
    if (!hasLegacy) return;
    const params = new URLSearchParams(searchParams);
    legacyParams.forEach((k) => params.delete(k));
    router.replace(`/${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, searchParams]);

  return (
    <div className="space-y-2">
      <StatusChips pathname={pathname} />
      <p className="text-xs text-muted-foreground">
        콘텐츠가 많지 않아 상태 전환만 제공합니다. 세부 검색은 ⌘K / Ctrl+K.
      </p>
    </div>
  );
}
