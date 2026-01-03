import type { Metadata } from 'next';

import { Suspense } from 'react';
import PageHeader from '@/components/layout/page-header';
import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';
import { PAGINATION } from '@/lib/constants/constants';
import { getArtistsPage } from '@/modules/artists/server/actions';
import { ArtistListView } from '@/modules/artists/ui/views/artist-list-view';

export const dynamic = 'force-static';
export const revalidate = 86400;

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="아티스트"
        description="PRECTXE와 함께했던 모든 아티스트들을 만나보세요"
      />

      {/* 검색과 필터는 별도의 Suspense 경계로 분리 */}
      <Suspense>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"></div>
      </Suspense>

      {/* 아티스트 목록에 대한 Suspense 경계 설정 */}
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
