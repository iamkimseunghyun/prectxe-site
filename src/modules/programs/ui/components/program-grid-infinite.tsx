'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { ProgramCard } from '@/modules/programs/ui/section/program-card';

type Item = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  status: string;
  type: string;
  startAt: string | Date | null;
  endAt?: string | Date | null;
  city?: string | null;
  heroUrl?: string | null;
  venue?: string | null;
};

async function fetchPage(
  baseQuery: URLSearchParams,
  page: number
): Promise<Item[]> {
  const params = new URLSearchParams(baseQuery);
  params.set('page', String(page));
  params.set('pageSize', '12');
  const res = await fetch(`/api/programs/list?${params.toString()}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.items as Item[];
}

export function ProgramGridInfinite({
  initialItems,
  query,
}: {
  initialItems: Item[];
  query: { status?: string; type?: string; city?: string; search?: string };
}) {
  const baseQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (query.status) p.set('status', query.status);
    if (query.type) p.set('type', query.type);
    if (query.city) p.set('city', query.city);
    if (query.search) p.set('search', query.search);
    return p;
  }, [query.status, query.type, query.city, query.search]);

  const { items, isLoading, isLastPage, trigger } = useInfiniteScroll<Item>({
    initialData: initialItems,
    pageSize: 12,
    fetchFunction: (page) => fetchPage(baseQuery, page + 1), // next page
  });

  useEffect(() => {
    // Nothing to do here; hook resets on initialItems change via props
  }, [initialItems]);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/programs/${p.slug}`}
            aria-label={`${p.title} 자세히 보기`}
          >
            <ProgramCard
              program={{
                slug: p.slug,
                title: p.title,
                summary: p.summary,
                heroUrl: p.heroUrl ?? undefined,
                status: p.status as any,
                type: p.type as any,
                startAt: p.startAt,
                endAt: p.endAt ?? undefined,
                city: p.city ?? undefined,
                venue: p.venue ?? undefined,
              }}
            />
          </Link>
        ))}
      </div>
      <span ref={trigger} aria-hidden className="block h-1 w-full" />
      {isLoading && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          불러오는 중...
        </div>
      )}
      {isLastPage && items.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          마지막입니다.
        </div>
      )}
    </>
  );
}
