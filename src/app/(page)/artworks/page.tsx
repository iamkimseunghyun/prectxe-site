import type { Metadata } from 'next';

import { ArtworkListView } from '@/modules/artworks/ui/views/artwork-list-view';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '작품 목록 | PRECTXE',
  description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  openGraph: {
    title: '작품 목록 | PRECTXE',
    description: 'PRECTXE에서 선보이는 모든 디지털 아트 작품들을 만나보세요.',
  },
};

const Page = () => {
  return <ArtworkListView />;
};

export default Page;
