import React from 'react';

import VenueForm from '@/components/venue/venue-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '장소 등록',
  robots: { index: false, follow: false },
};

const Page = () => {
  return <VenueForm mode={'create'} />;
};

export default Page;
