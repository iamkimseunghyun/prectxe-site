import React from 'react';
import ArtistForm from '@/components/page/artist/artist-form';
import { Metadata } from 'next';
import getSession from '@/lib/session';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  if (!session) return null;
  return <ArtistForm mode={'create'} userId={session.id} />;
};

export default Page;
