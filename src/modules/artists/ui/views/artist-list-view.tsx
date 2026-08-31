'use client';

import { useCallback } from 'react';
import Spinner from '@/components/icons/spinner';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { getMoreArtists } from '@/modules/artists/server/actions';
import type { ArtistCardData } from '@/modules/artists/server/types';
import ArtistCard from '@/modules/artists/ui/components/artist-card';

interface ArtistGridProps {
  initialArtists: ArtistCardData[];
  searchQuery?: string;
}

/** 첫 행(데스크톱 3열) 이미지는 priority로 올려 LCP를 앞당긴다. */
const PRIORITY_COUNT = 3;

export function ArtistListView({
  initialArtists,
  searchQuery,
}: ArtistGridProps) {
  // 인라인 화살표로 넘기면 매 렌더마다 새 함수가 되어 loadMoreItems가
  // 재생성되고, IntersectionObserver effect가 매 렌더 재구독된다.
  const fetchFunction = useCallback(
    (page: number) => getMoreArtists(page, searchQuery),
    [searchQuery]
  );

  const {
    items: artists,
    isLoading,
    isLastPage,
    trigger,
    loadMoreItems,
  } = useInfiniteScroll<ArtistCardData>({
    fetchFunction,
    initialData: initialArtists,
    pageSize: PAGINATION.ARTISTS_PAGE_SIZE,
    resetKey: searchQuery,
  });

  if (artists.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-24 text-center">
        <p className="text-sm text-neutral-500">
          {searchQuery
            ? `"${searchQuery}"에 해당하는 아티스트가 없습니다.`
            : '아티스트가 아직 등록되지 않았습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
        {artists.map((artist, i) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            priority={i < PRIORITY_COUNT}
          />
        ))}
      </div>

      {/* 스크린리더에 목록 증가를 알린다 */}
      <p aria-live="polite" className="sr-only">
        {isLoading
          ? '아티스트를 더 불러오는 중입니다.'
          : `아티스트 ${artists.length}명 표시 중${isLastPage ? ', 마지막 페이지입니다' : ''}.`}
      </p>

      {!isLastPage && (
        <span
          ref={trigger}
          className="mt-16 flex items-center justify-center md:mt-20"
        >
          {isLoading ? (
            <Spinner />
          ) : (
            // 스크롤 감지(IntersectionObserver)만으로는 키보드/보조기술
            // 사용자가 다음 페이지를 요청할 수단이 없다.
            <Button
              type="button"
              variant="ghost"
              onClick={loadMoreItems}
              className="text-xs uppercase tracking-[0.25em] text-neutral-500 hover:text-neutral-900"
            >
              더 보기
            </Button>
          )}
        </span>
      )}
    </div>
  );
}
