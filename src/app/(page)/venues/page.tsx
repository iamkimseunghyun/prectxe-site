import type { Metadata } from 'next';
import { VenueListView } from '@/modules/venues/ui/views/venue-list-view';

export const metadata: Metadata = {
  title: '장소 | PRECTXE',
  description:
    'PRECTXE 행사를 열었던 베뉴들의 아카이브. 프로그램·드롭이 진행된 공간들의 정보와 히스토리.',
  openGraph: {
    title: '장소 | PRECTXE',
    description:
      'PRECTXE 행사를 열었던 베뉴들의 아카이브. 프로그램·드롭이 진행된 공간들의 정보와 히스토리.',
  },
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { search } = await searchParams;
  const searchQuery = typeof search === 'string' ? search : '';
  return <VenueListView searchQuery={searchQuery} />;
};

export default Page;
