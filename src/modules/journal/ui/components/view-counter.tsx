'use client';

import { useEffect } from 'react';
import { incrementArticleViews } from '@/modules/journal/server/actions';

// Server Component 렌더링 중에 직접 호출하면 <Link> prefetch만으로도 실행되어
// 조회수가 부풀 수 있음 — 클라이언트에 실제로 마운트된 이후에만 집계
export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    incrementArticleViews(slug);
  }, [slug]);

  return null;
}
