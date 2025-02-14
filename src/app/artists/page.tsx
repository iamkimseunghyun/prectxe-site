import PageHeader from '@/components/layout/page-header';
import { ArtistSearch } from '@/components/page/artist/artist-search';
import { Suspense } from 'react';
import { Metadata } from 'next';
import ArtistList from '@/components/page/artist/artist-list';
import { ArtistListSkeleton } from '@/components/page/artist/artist-list-skeleton';

export const metadata: Metadata = {
  title: '아티스트',
  description:
    'PRECTXE의 모든 아티스트들을 만나보세요. 디지털 아트와 퍼포먼스를 선보이는 창작자들의 프로필과 작품을 확인하실 수 있습니다.',
  keywords: ['디지털 아티스트', 'PRECTXE', '아티스트 프로필', '디지털 아트'],
};

// 페이지 리밸리데이션 시간 설정
export const revalidate = 60; // 60초

const Page = ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="아티스트"
        description="PRECTXE의 모든 아티스트들을 만나보세요"
      />

      {/* 검색과 필터는 별도의 Suspense 경계로 분리 */}
      <Suspense>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ArtistSearch />
        </div>
      </Suspense>

      {/* 아티스트 목록에 대한 Suspense 경계 설정 */}
      <Suspense fallback={<ArtistListSkeleton />}>
        <ArtistList searchParams={searchParams} />
      </Suspense>
    </div>
  );
};
export default Page;
