import { Suspense } from 'react';
import EntityGridSkeleton from '@/components/layout/skeleton/entity-grid-skeleton';
import { PAGINATION } from '@/lib/constants/constants';
import { getArtworksPage } from '@/modules/artworks/server/actions';
import ArtworkGridSection from '@/modules/artworks/ui/components/artwork-grid-section';
import { ArtworkSearchBar } from '@/modules/artworks/ui/components/artwork-search-bar';

interface ArtworkListViewProps {
  searchQuery?: string;
}

/**
 * 조회를 별도 async 컴포넌트로 분리해야 Suspense가 실제로 동작한다.
 * 기존에는 View에서 await한 뒤 클라이언트 컴포넌트에 props로 넘겨서
 * 경계가 절대 suspend되지 않았고(스켈레톤은 죽은 코드), 헤더까지 DB를 기다렸다.
 */
async function ArtworkResults({ searchQuery }: { searchQuery: string }) {
  const initialArtworks = await getArtworksPage(
    0,
    PAGINATION.ARTWORKS_PAGE_SIZE,
    searchQuery
  );
  return (
    <ArtworkGridSection
      initialArtworks={initialArtworks}
      searchQuery={searchQuery}
    />
  );
}

export const ArtworkListView = async ({
  searchQuery = '',
}: ArtworkListViewProps) => {
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
              <span className="italic">&ldquo;{searchQuery}&rdquo;</span>
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

      <Suspense key={searchQuery} fallback={<EntityGridSkeleton />}>
        <ArtworkResults searchQuery={searchQuery} />
      </Suspense>
    </div>
  );
};
