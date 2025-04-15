import React from 'react';

import { Metadata } from 'next';
import getSession from '@/lib/session';
import ArtistFormView from '@/modules/artists/ui/views/artist-form-view';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  if (!session) return null;
  return <ArtistFormView mode={'create'} userId={session.id} />;
};

export default Page;
