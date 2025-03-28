import ArtworkGrid from '@/components/page/artwork/artwork-grid';
import { Metadata } from 'next';
import { getArtworksPage } from '@/app/artworks/actions';
import React, { Suspense } from 'react';
import { PAGINATION } from '@/lib/constants/constants';
import { SearchBar } from '@/components/search-bar';
import GridSkeleton from '@/components/layout/skeleton/grid-skeleton';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: '작품 목록 | PRECTXE',
  description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  openGraph: {
    title: '작품 목록 | PRECTXE',
    description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  },
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';
  const artworks = await getArtworksPage(
    0,
    PAGINATION.ARTWORKS_PAGE_SIZE,
    searchQuery
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">작품 소개</h1>
        <p className="max-w-2xl text-muted-foreground">
          지금까지 PRECTXE에서 소개된 훌륭한 작품들에 많은 관심을 가져주세요.
        </p>
      </div>

      {/* 검색과 필터는 별도의 Suspense 경계로 분리 */}
      <Suspense>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SearchBar />
        </div>
      </Suspense>

      {/* 아트워크 목록에 대한 Suspense 경계 설정 */}
      <Suspense fallback={<GridSkeleton />}>
        <ArtworkGrid initialArtworks={artworks} searchQuery={searchQuery} />
      </Suspense>
    </div>
  );
};

export default Page;
