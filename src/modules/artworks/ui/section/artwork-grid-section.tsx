'use client';

import Spinner from '@/components/icons/spinner';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { getMoreArtworks } from '@/modules/artworks/server/actions';
import ArtworkCard, {
  type ArtworkCardData,
} from '@/modules/artworks/ui/section/artwork-card';

interface ArtworkGridSectionProps {
  initialArtworks: ArtworkCardData[];
  searchQuery?: string;
}

export default function ArtworkGridSection({
  initialArtworks,
  searchQuery,
}: ArtworkGridSectionProps) {
  const {
    items: artworks,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll<ArtworkCardData>({
    fetchFunction: (page) => getMoreArtworks(page, searchQuery),
    initialData: initialArtworks,
    pageSize: PAGINATION.ARTWORKS_PAGE_SIZE,
    resetKey: searchQuery,
  });

  if (artworks.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-24 text-center">
        <p className="text-sm text-neutral-500">
          {searchQuery
            ? `"${searchQuery}"에 해당하는 작품이 없습니다.`
            : '등록된 작품이 아직 없습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} />
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
