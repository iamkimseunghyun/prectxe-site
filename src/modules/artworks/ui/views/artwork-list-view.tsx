import { Suspense } from 'react';
import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';
import { PAGINATION } from '@/lib/constants/constants';
import { getArtworksPage } from '@/modules/artworks/server/actions';
import { ArtworkSearchBar } from '@/modules/artworks/ui/components/artwork-search-bar';
import ArtworkGridSection from '@/modules/artworks/ui/section/artwork-grid-section';

interface ArtworkListViewProps {
  searchQuery?: string;
}

export const ArtworkListView = async ({
  searchQuery = '',
}: ArtworkListViewProps) => {
  const initialArtworks = await getArtworksPage(
    0,
    PAGINATION.ARTWORKS_PAGE_SIZE,
    searchQuery
  );
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Artworks
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          {searchQuery ? (
            <>
              <span className="text-neutral-400">Searching</span>{' '}
              <span className="italic">"{searchQuery}"</span>
            </>
          ) : (
            '작품'
          )}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          PRECTXE가 소개한 디지털 아트·비주얼 작품 아카이브.
        </p>
        <div className="mt-10 max-w-md">
          <ArtworkSearchBar initialValue={searchQuery} />
        </div>
      </header>

      <Suspense fallback={<GridSkeleton />}>
        <ArtworkGridSection
          initialArtworks={initialArtworks}
          searchQuery={searchQuery}
        />
      </Suspense>
    </div>
  );
};
