import ArtworkForm from '@/components/page/artwork/artwork-form';
import { Metadata } from 'next';
import getSession from '@/lib/session';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  return (
    <>
      <ArtworkForm mode={'create'} userId={session.id} />
    </>
  );
};

export default Page;
