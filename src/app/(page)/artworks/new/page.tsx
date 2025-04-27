import { Metadata } from 'next';
import getSession from '@/lib/auth/session';
import ArtworkFormView from '@/modules/artworks/ui/views/artwork-form-view';
import { getArtistsPage } from '@/modules/artists/server/actions';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  const artists = await getArtistsPage();

  return (
    <ArtworkFormView mode={'create'} userId={session.id} artists={artists} />
  );
};

export default Page;
