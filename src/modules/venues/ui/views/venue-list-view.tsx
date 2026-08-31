import { Suspense } from 'react';
import EntityGridSkeleton from '@/components/layout/skeleton/entity-grid-skeleton';
import { getAllVenues } from '@/modules/venues/server/actions';
import VenueCard from '@/modules/venues/ui/components/venue-card';
import { VenueSearchBar } from '@/modules/venues/ui/components/venue-search-bar';

interface VenueListViewProps {
  searchQuery?: string;
}

/** 조회를 async 자식으로 분리해 Suspense가 실제로 스트리밍하도록 한다. */
async function VenueResults({ searchQuery }: { searchQuery: string }) {
  const { items } = await getAllVenues(1, 30, searchQuery);

  if (items.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-24 text-center">
        <p className="text-sm text-neutral-500">
          {searchQuery
            ? `"${searchQuery}"에 해당하는 장소가 없습니다.`
            : '등록된 장소가 아직 없습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
      {items.map((venue, i) => (
        <VenueCard key={venue.id} venue={venue} priority={i < 3} />
      ))}
    </div>
  );
}

export const VenueListView = async ({
  searchQuery = '',
}: VenueListViewProps) => {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Venues
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          {searchQuery ? (
            <>
              <span className="text-neutral-400">Searching</span>{' '}
              <span className="italic">&ldquo;{searchQuery}&rdquo;</span>
            </>
          ) : (
            '장소'
          )}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          PRECTXE 행사를 열었던 베뉴들의 아카이브 — 거점 씬이 모여 있는 공간
          정보.
        </p>
        <div className="mt-10 max-w-md">
          <VenueSearchBar initialValue={searchQuery} />
        </div>
      </header>

      <Suspense key={searchQuery} fallback={<EntityGridSkeleton />}>
        <VenueResults searchQuery={searchQuery} />
      </Suspense>
    </div>
  );
};
