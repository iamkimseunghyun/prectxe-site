import ArtworkForm from '@/components/page/artwork/artwork-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = () => {
  return (
    <>
      <ArtworkForm mode={'create'} />
    </>
  );
};

export default Page;
