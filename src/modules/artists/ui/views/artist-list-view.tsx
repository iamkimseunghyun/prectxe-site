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
      <div className="py-10 text-center">
        <p className="text-muted-foreground">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      {!isLastPage && (
        <span ref={trigger} className="mt-10 flex items-center justify-center">
          {isLoading ? (
            <Spinner />
          ) : (
            <Button
              variant="ghost"
              className="mt-10 flex items-center justify-center text-muted-foreground"
            >
              더 보기
            </Button>
          )}
        </span>
      )}
    </div>
  );
}
