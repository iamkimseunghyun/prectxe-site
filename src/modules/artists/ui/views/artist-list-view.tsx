'use client';

import Spinner from '@/components/icons/spinner';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { getMoreArtists } from '@/modules/artists/server/actions';
import type { ArtistCardData } from '@/modules/artists/server/types';
import ArtistCard from '@/modules/artists/ui/section/artist-card';

interface ArtistGridProps {
  initialArtists: ArtistCardData[];
  searchQuery?: string;
}

export function ArtistListView({
  initialArtists,
  searchQuery,
}: ArtistGridProps) {
  const {
    items: artists,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll<ArtistCardData>({
    fetchFunction: (page) => getMoreArtists(page, searchQuery),
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
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      {!isLastPage && (
        <span
          ref={trigger}
          className="mt-16 flex items-center justify-center md:mt-20"
        >
          {isLoading ? (
            <Spinner />
          ) : (
            <Button
              variant="ghost"
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
