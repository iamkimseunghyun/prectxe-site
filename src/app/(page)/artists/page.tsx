import type { Metadata } from 'next';

import { Suspense } from 'react';
import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';
import { PAGINATION } from '@/lib/constants/constants';
import { getArtistsPage } from '@/modules/artists/server/actions';
import { ArtistSearchBar } from '@/modules/artists/ui/components/artist-search-bar';
import { ArtistListView } from '@/modules/artists/ui/views/artist-list-view';

export const metadata: Metadata = {
  title: '아티스트',
  description:
    'PRECTXE의 모든 아티스트들을 만나보세요. 디지털 아트와 퍼포먼스를 선보이는 창작자들의 프로필과 작품을 확인하실 수 있습니다.',
  keywords: ['디지털 아티스트', 'PRECTXE', '아티스트 프로필', '디지털 아트'],
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';

  const initialArtists = await getArtistsPage(
    0,
    PAGINATION.ARTISTS_PAGE_SIZE,
    searchQuery
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-14 md:mb-20">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
          Artists
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-6xl">
          {searchQuery ? (
            <>
              <span className="text-neutral-400">Searching</span>{' '}
              <span className="italic">"{searchQuery}"</span>
            </>
          ) : (
            '아티스트'
          )}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
          PRECTXE와 함께한 음악·비주얼 창작자들의 프로필과 활동 기록.
        </p>
        <div className="mt-10 max-w-md">
          <ArtistSearchBar initialValue={searchQuery} />
        </div>
      </header>

      <Suspense fallback={<GridSkeleton />}>
        <ArtistListView
          initialArtists={initialArtists}
          searchQuery={searchQuery}
        />
      </Suspense>
    </div>
  );
};
export default Page;
