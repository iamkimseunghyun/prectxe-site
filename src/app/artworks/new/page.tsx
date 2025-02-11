import ArtworkForm from '@/components/page/artwork/artwork-form';
import { Metadata } from 'next';
import getSession from '@/lib/session';
import { getArtists } from '@/app/artists/actions';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  const artists = await getArtists();

  return (
    <>
      <ArtworkForm mode={'create'} userId={session.id} artists={artists} />
    </>
  );
};

export default Page;
