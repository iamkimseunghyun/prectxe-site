import React from 'react';
import ArtistForm from '@/components/page/artist/artist-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '아티스트 등록',
  robots: { index: false, follow: false },
};

const Page = () => {
  return <ArtistForm mode={'create'} />;
};

export default Page;
