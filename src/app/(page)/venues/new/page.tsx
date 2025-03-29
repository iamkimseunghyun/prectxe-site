import React from 'react';

import VenueForm from '@/components/page/venue/venue-form';
import { Metadata } from 'next';
import getSession from '@/lib/session';

export const metadata: Metadata = {
  title: '장소 등록',
  robots: { index: false, follow: false },
};

const Page = async () => {
  const session = await getSession();
  return <VenueForm mode={'create'} userId={session.id} />;
};

export default Page;
