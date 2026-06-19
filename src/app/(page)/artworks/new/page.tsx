import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { getArtistsPage } from '@/modules/artists/server/actions';
import ArtworkFormView from '@/modules/artworks/ui/views/artwork-form-view';

export const metadata: Metadata = {
  title: '작품 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');
  const artists = await getArtistsPage();

  return <ArtworkFormView mode={'create'} artists={artists} />;
};

export default Page;
