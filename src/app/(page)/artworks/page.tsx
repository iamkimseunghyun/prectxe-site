import type { Metadata } from 'next';

import { ArtworkListView } from '@/modules/artworks/ui/views/artwork-list-view';

export const metadata: Metadata = {
  title: '작품 | PRECTXE',
  description: 'PRECTXE가 소개한 디지털 아트·비주얼 작품 아카이브.',
  openGraph: {
    title: '작품 | PRECTXE',
    description: 'PRECTXE가 소개한 디지털 아트·비주얼 작품 아카이브.',
  },
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';
  return <ArtworkListView searchQuery={searchQuery} />;
};

export default Page;
