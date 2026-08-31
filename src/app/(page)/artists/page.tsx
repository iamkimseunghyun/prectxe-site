import type { Metadata } from 'next';

import { Suspense } from 'react';
import { PAGINATION } from '@/lib/constants/constants';
import {
  getArtistsPage,
  normalizeSearchQuery,
} from '@/modules/artists/server/queries';
import ArtistGridSkeleton from '@/modules/artists/ui/components/artist-grid-skeleton';
import { ArtistSearchBar } from '@/modules/artists/ui/components/artist-search-bar';
import { ArtistListView } from '@/modules/artists/ui/views/artist-list-view';

export const metadata: Metadata = {
  title: '아티스트',
  description:
    'PRECTXE의 모든 아티스트들을 만나보세요. 디지털 아트와 퍼포먼스를 선보이는 창작자들의 프로필과 작품을 확인하실 수 있습니다.',
  keywords: ['디지털 아티스트', 'PRECTXE', '아티스트 프로필', '디지털 아트'],
};

/**
 * 데이터 조회를 별도 async 컴포넌트로 분리해야 Suspense가 실제로 동작한다.
 * 이전에는 Page에서 await한 뒤 클라이언트 컴포넌트에 props로 넘겨서
 * 경계가 절대 suspend되지 않았고(스켈레톤은 죽은 코드), 헤더/검색바까지
 * DB 응답을 기다렸다.
 */
async function ArtistResults({ searchQuery }: { searchQuery: string }) {
  const initialArtists = await getArtistsPage(
    0,
    PAGINATION.ARTISTS_PAGE_SIZE,
    searchQuery
  );

  return (
    <ArtistListView initialArtists={initialArtists} searchQuery={searchQuery} />
  );
}

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = normalizeSearchQuery(
    typeof search === 'string' ? search : ''
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
              <span className="italic">&ldquo;{searchQuery}&rdquo;</span>
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

      {/* key: 검색어가 바뀌면 새 경계로 취급해 스켈레톤을 다시 보여준다 */}
      <Suspense key={searchQuery} fallback={<ArtistGridSkeleton />}>
        <ArtistResults searchQuery={searchQuery} />
      </Suspense>
    </div>
  );
};
export default Page;
