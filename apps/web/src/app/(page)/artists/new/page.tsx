import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import ArtistFormView from '@/modules/artists/ui/views/artist-form-view';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');
  return <ArtistFormView mode={'create'} />;
};

export default Page;
