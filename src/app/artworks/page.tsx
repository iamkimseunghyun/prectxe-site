import { Button } from '@/components/ui/button';
import Link from 'next/link';

import ArtworkGrid from '@/components/page/artwork/artwork-grid';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '작품 목록 | PRECTXE',
  description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  openGraph: {
    title: '작품 목록 | PRECTXE',
    description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  },
};

const Page = async () => {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">작품 목록</h1>
        <Link href="/artworks/new">
          <Button>새 작품 등록</Button>
        </Link>
      </div>
      <ArtworkGrid />
    </div>
  );
};

export default Page;
