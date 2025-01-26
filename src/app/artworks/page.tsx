import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { getArtworks } from '@/app/artworks/actions';

import ArtworkGrid from '@/components/artwork/artwork-grid';
import { Metadata } from 'next';

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
  searchParams: Promise<{ page?: string }>;
}) => {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const { artworks } = await getArtworks(currentPage);
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">작품 목록</h1>
        <Link href="/artworks/new">
          <Button>새 작품 등록</Button>
        </Link>
      </div>

      <Suspense fallback={<div>작품 목록을 불러오는 중...</div>}>
        <ArtworkGrid artworks={artworks} />
      </Suspense>
    </div>
  );
};

export default Page;
