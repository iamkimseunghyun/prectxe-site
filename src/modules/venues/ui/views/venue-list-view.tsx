import { getAllVenues } from '@/modules/venues/server/actions';
import { VenueSearchBar } from '@/modules/venues/ui/components/venue-search-bar';
import VenueCard from '@/modules/venues/ui/components/venue-card';

interface VenueListViewProps {
  searchQuery?: string;
}

export const VenueListView = async ({
  searchQuery = '',
}: VenueListViewProps) => {
  const { items } = await getAllVenues(1, 30, searchQuery);

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
              <span className="italic">"{searchQuery}"</span>
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

      {items.length === 0 ? (
        <div className="border-t border-neutral-200 py-24 text-center">
          <p className="text-sm text-neutral-500">
            {searchQuery
              ? `"${searchQuery}"에 해당하는 장소가 없습니다.`
              : '등록된 장소가 아직 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {items.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
};
