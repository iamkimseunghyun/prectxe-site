import type { Metadata } from 'next';
import ArtistFormView from '@/modules/artists/ui/views/artist-form-view';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  return <ArtistFormView mode={'create'} />;
};

export default Page;
